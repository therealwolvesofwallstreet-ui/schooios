// PATCH /api/cases/[id]/status — đẩy state machine vòng đời (nguồn: lib/workflow.ts).
//   ADMIN: không giới hạn. STAFF: chỉ đổi case NEW/TRIAGED (triage) HOẶC case assignedTo mình.
//   ASSIGNED KHÔNG là transition hợp lệ ở đây — chỉ sinh qua /assign.
//
// ── 404 vs 403 (chốt: plan = test = comment) ──
//   Với STAFF, phạm vi đổi status (NEW/TRIAGED ∪ assignedTo=mình) TRÙNG KHỚP caseWhereForRole.
//   Nên case ngoài phạm vi cũng VÔ HÌNH với STAFF → findFirst null → trả 404 (chống dò tồn tại),
//   KHÔNG bao giờ tới nhánh 403 bên dưới. Nhánh 403 giữ lại như defense-in-depth, chỉ "load-bearing"
//   nếu sau này nới rộng tầm nhìn STAFF.
//
// Nguyên tử + chống race: updateMany có điều kiện status kỳ vọng trong $transaction; count!==1 → 409.
// Lỗi: 401 chưa đăng nhập · 403 sai role/scope · 400 body·zod·transition không hợp lệ ·
//   404 không thấy case (caseWhereForRole) · 409 thua optimistic-lock.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { changeStatusSchema } from "@/lib/validation";
import { caseWhereForRole, caseMutationInclude } from "@/lib/cases";
import { ConflictError, canTransition, statusSideEffects } from "@/lib/workflow";
import { classifyMutationError } from "@/lib/http-errors";
import { maybeTestDelay } from "@/lib/test-hooks";
import { AuditAction, CaseStatus, NotificationType, Role } from "@/generated/prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== Role.ADMIN && user.role !== Role.STAFF)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = changeStatusSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    const body = parsed.data;

    const { id } = await params;

    // Chỉ thấy case theo quyền role → null là 404 đồng nhất (chống enumeration).
    const cur = await prisma.case.findFirst({
      where: { id, ...caseWhereForRole({ sub: user.id, role: user.role }) },
    });
    if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // STAFF scope (ADMIN không giới hạn) — xem ghi chú "404 vs 403" ở đầu file.
    if (user.role === Role.STAFF) {
      const inTriage = cur.status === CaseStatus.NEW || cur.status === CaseStatus.TRIAGED;
      const isOwner = cur.assignedToId === user.id;
      if (!inTriage && !isOwner)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Transition phải có trong state-graph (sai luật → 400, tách bạch với 409 xung đột trạng thái).
    if (!canTransition(cur.status, body.status))
      return NextResponse.json(
        { error: `Cannot transition from ${cur.status} to ${body.status}` },
        { status: 400 },
      );

    const meta = clientMeta(request);
    await maybeTestDelay(request); // no-op ở prod; chỉ test concurrency ép interleaving sau khi đọc cur

    // Nguyên tử: update + history + audit + notify trong MỘT transaction (tx.* trực tiếp).
    // Optimistic-lock theo updatedAt (version) + status kỳ vọng → mọi mutation song song bị 409.
    // Đọc-lại ĐỂ NGOÀI tx (sau commit) → rút ngắn cửa sổ giữ row-lock.
    await prisma.$transaction(async (tx) => {
      const r = await tx.case.updateMany({
        where: { id, status: cur.status, updatedAt: cur.updatedAt, deletedAt: null },
        data: { status: body.status, ...statusSideEffects(body.status, cur.status) },
      });
      if (r.count !== 1) throw new ConflictError(); // request khác vừa đổi case → 409

      await tx.caseStatusHistory.create({
        data: {
          caseId: id,
          changedById: user.id,
          fromStatus: cur.status,
          toStatus: body.status,
          note: body.reason ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.STATUS_CHANGE,
          entityType: "Case",
          entityId: id,
          metadata: {
            before: { status: cur.status },
            after: { status: body.status },
          },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });

      // Báo người tạo (nếu khác người thực hiện).
      if (cur.createdById !== user.id)
        await tx.notification.create({
          data: {
            userId: cur.createdById,
            caseId: id,
            type: NotificationType.STATUS_CHANGED,
            message: `${cur.caseCode}: ${cur.status} → ${body.status}`,
          },
        });

    });

    const updated = await prisma.case.findUnique({ where: { id }, include: caseMutationInclude });
    return NextResponse.json({ case: updated });
  } catch (err) {
    // 409 (thua optimistic-lock / xung đột) · 503 (cạn pool/timeout, retry sau) · 500 (bất ngờ).
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("cases [id] status PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
