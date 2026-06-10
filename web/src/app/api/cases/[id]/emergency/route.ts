// PATCH /api/cases/[id]/emergency — bật/tắt cờ KHẨN CẤP CHÍNH THỨC (Case.isEmergency).
//   isEmergency = duyệt bởi STAFF/ADMIN (KHÁC studentFlaggedEmergency = nút HS bấm). Endpoint này
//   CHỈ đụng isEmergency; KHÔNG đổi studentFlaggedEmergency, KHÔNG đổi status (không tự archive).
//
// ── Quyền & scope ──
//   Role ∈ {STAFF, ADMIN} (AUDITOR read-only, STUDENT không có quyền → 403).
//   Phạm vi case = caseWhereForRole (STAFF: assignedTo mình ∪ NEW/TRIAGED; ADMIN: tất cả) → null = 404
//   đồng nhất (chống enumeration). KHÔNG thêm chặn scope phụ: STAFF đang triage được phép escalate
//   case NEW/TRIAGED chưa giao (cấp cứu cần phản ứng nhanh — chủ ý KHÁC /status).
//
// ── Notify (chỉ khi nâng cấp false→true) ──
//   Recipient = MỌI ADMIN đang active + assignedTo (nếu có), LOẠI người kích hoạt (uid !== actor).
//   De-escalate true→false: GHI audit, KHÔNG notify. No-op (giá trị không đổi): KHÔNG audit/notify.
//
// Nguyên tử + chống race: updateMany guard {isEmergency kỳ vọng, updatedAt} trong $transaction;
//   count!==1 → 409. Đọc-lại SAU commit (caseMutationInclude). Lỗi: 401/400/403/404/409/503/500.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { setEmergencySchema } from "@/lib/validation";
import { caseWhereForRole, caseMutationInclude } from "@/lib/cases";
import { ConflictError } from "@/lib/workflow";
import { classifyMutationError } from "@/lib/http-errors";
import { createNotification } from "@/lib/notifications";
import { maybeTestDelay } from "@/lib/test-hooks";
import { AuditAction, NotificationType, Role } from "@/generated/prisma/client";

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
    const parsed = setEmergencySchema.safeParse(raw);
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

    // No-op: giá trị không đổi → trả case (kèm relation, parity với nhánh ghi) mà KHÔNG audit/notify.
    // Re-fetch theo caseWhereForRole (KHÔNG findUnique trần): nếu case vừa RỜI scope giữa findFirst↔đây
    // (status/assignee đổi đồng thời) thì 404 đồng nhất — nhánh no-op không lộ case ngoài tầm nhìn hiện tại.
    // (Nhánh GHI bên dưới re-fetch bằng findUnique là đúng: actor vừa mutate hợp lệ nên được thấy kết quả.)
    if (cur.isEmergency === body.isEmergency) {
      const same = await prisma.case.findFirst({
        where: { id, ...caseWhereForRole({ sub: user.id, role: user.role }) },
        include: caseMutationInclude,
      });
      if (!same) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ case: same });
    }

    const meta = clientMeta(request);
    await maybeTestDelay(request); // no-op ở prod (gated P5_TEST_HOOKS); test ép interleaving → chứng minh 409

    // Nguyên tử: flip cờ + audit (+ notify nếu escalate) trong MỘT transaction.
    // Optimistic-lock theo {isEmergency kỳ vọng, updatedAt} → mutation song song bị 409.
    await prisma.$transaction(async (tx) => {
      const r = await tx.case.updateMany({
        where: { id, isEmergency: cur.isEmergency, updatedAt: cur.updatedAt, deletedAt: null },
        data: { isEmergency: body.isEmergency },
      });
      if (r.count !== 1) throw new ConflictError(); // request khác vừa đổi case → 409

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.EMERGENCY_FLAG,
          entityType: "Case",
          entityId: id,
          metadata: {
            before: { isEmergency: cur.isEmergency },
            after: { isEmergency: body.isEmergency },
            reason: body.reason ?? null,
          },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });

      // CHỈ notify khi nâng cấp false→true. Recipient = mọi ADMIN active + assignee, loại actor.
      if (body.isEmergency === true) {
        const admins = await tx.user.findMany({
          where: { role: Role.ADMIN, isActive: true },
          select: { id: true },
        });
        const ids = [...new Set([...admins.map((a) => a.id), cur.assignedToId])].filter(
          (uid): uid is string => !!uid && uid !== user.id,
        );
        await createNotification(
          {
            userIds: ids,
            type: NotificationType.EMERGENCY_CONFIRMED,
            message: `KHẨN CẤP: ${cur.caseCode}${body.reason ? " — " + body.reason : ""}`,
            caseId: id,
          },
          tx,
        );
      }
    });

    const updated = await prisma.case.findUnique({ where: { id }, include: caseMutationInclude });
    return NextResponse.json({ case: updated });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("cases [id] emergency PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
