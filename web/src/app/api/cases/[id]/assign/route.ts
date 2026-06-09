// PATCH /api/cases/[id]/assign — gán/điều phối người xử lý (assignedToId).
//   ADMIN: gán cho bất kỳ STAFF/ADMIN còn hoạt động (điều phối). STAFF: CHỈ self-assign case
//   NEW/TRIAGED (nhận việc chưa ai cầm) — đổi người của case đang chạy là điều phối → quyền ADMIN.
//   Reassign case đang chạy (ASSIGNED/IN_PROGRESS/WAITING) GIỮ nguyên status, chỉ đổi người
//   (tránh lùi trạng thái IN_PROGRESS→ASSIGNED). ASSIGNED chỉ sinh ra ở ĐÂY, không qua /status.
// Nguyên tử + chống race: updateMany có điều kiện status kỳ vọng trong $transaction; count!==1 → 409.
// Lỗi: 401 chưa đăng nhập · 403 sai role/scope · 400 body·zod·target không STAFF/ADMIN ·
//   404 không thấy case (caseWhereForRole) · 409 case RESOLVED/CLOSED hoặc thua optimistic-lock.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { assignCaseSchema } from "@/lib/validation";
import { caseWhereForRole, caseMutationInclude } from "@/lib/cases";
import { ConflictError } from "@/lib/workflow";
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
    const parsed = assignCaseSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    const { assignedToId } = parsed.data;

    const { id } = await params;

    // Chỉ thấy case theo quyền role → null là 404 đồng nhất (chống enumeration).
    const cur = await prisma.case.findFirst({
      where: { id, ...caseWhereForRole({ sub: user.id, role: user.role }) },
    });
    if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Đã rời pha có-thể-giao → 409 (tách bạch với 400 "sai luật").
    if (cur.status === CaseStatus.RESOLVED || cur.status === CaseStatus.CLOSED)
      return NextResponse.json({ error: "Conflict" }, { status: 409 });

    // Quyền chi tiết theo role.
    if (user.role === Role.ADMIN) {
      // Người nhận phải là STAFF/ADMIN còn hoạt động; sai → 400 (yêu cầu sai luật, không phải 403).
      const target = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!target || !target.isActive || (target.role !== Role.STAFF && target.role !== Role.ADMIN))
        return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    } else {
      // STAFF: chỉ self-assign, và chỉ với case NEW/TRIAGED.
      const isSelf = assignedToId === user.id;
      const isAssignable = cur.status === CaseStatus.NEW || cur.status === CaseStatus.TRIAGED;
      if (!isSelf || !isAssignable)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // NEW/TRIAGED → ASSIGNED; case đang chạy → GIỮ status (đổi người ≠ lùi pha giao).
    const newStatus =
      cur.status === CaseStatus.NEW || cur.status === CaseStatus.TRIAGED
        ? CaseStatus.ASSIGNED
        : cur.status;

    // No-op: gán đúng người đang giữ + status không đổi → idempotent, KHÔNG ghi audit/notify thừa.
    if (assignedToId === cur.assignedToId && newStatus === cur.status) {
      const same = await prisma.case.findUnique({ where: { id }, include: caseMutationInclude });
      return NextResponse.json({ case: same });
    }

    const meta = clientMeta(request);
    await maybeTestDelay(request); // no-op ở prod; chỉ test concurrency ép interleaving sau khi đọc cur

    // Nguyên tử: update + history + audit + notify trong MỘT transaction; tx.* (recordAudit dùng
    // prisma toàn cục nên không join tx được → gọi tx.auditLog.create trực tiếp, giữ convention {before,after}).
    // Optimistic-lock theo updatedAt (version): MỌI mutation song song — kể cả reassign giữ status — đều
    // làm updatedAt đổi → updateMany count 0 → 409 (status giữ trong where để rõ nghĩa "from kỳ vọng").
    // Đọc-lại ĐỂ NGOÀI tx (sau commit) → rút ngắn cửa sổ giữ row-lock (giảm convoy/timeout dưới tải).
    await prisma.$transaction(async (tx) => {
      const r = await tx.case.updateMany({
        where: { id, status: cur.status, updatedAt: cur.updatedAt, deletedAt: null },
        data: { assignedToId, status: newStatus },
      });
      if (r.count !== 1) throw new ConflictError(); // request khác vừa đổi case → 409

      if (newStatus !== cur.status)
        await tx.caseStatusHistory.create({
          data: {
            caseId: id,
            changedById: user.id,
            fromStatus: cur.status,
            toStatus: newStatus,
            note: "assigned",
          },
        });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.ASSIGN,
          entityType: "Case",
          entityId: id,
          metadata: {
            before: { assignedToId: cur.assignedToId, status: cur.status },
            after: { assignedToId, status: newStatus },
          },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });

      // Đừng tự báo cho chính mình (self-assign).
      if (assignedToId !== user.id)
        await tx.notification.create({
          data: {
            userId: assignedToId,
            caseId: id,
            type: NotificationType.CASE_ASSIGNED,
            message: `Bạn được giao xử lý ${cur.caseCode}`,
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
    console.error("cases [id] assign PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
