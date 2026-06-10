// POST/GET /api/cases/[id]/comments — bình luận trên 1 case.
//
// QUYỀN: xem case = bình luận case. Nạp case qua caseWhereForRole (Public/Transparent) — không
//   thấy → 404 đồng nhất (chống dò tồn tại), giống cases/[id] detail. Coupling này là CHỦ Ý: một
//   nguồn sự thật duy nhất cho "ai đọc được case". Regression-guard: test C_SENS (STUDENT) → 404.
//
// COMMENT NỘI BỘ (isInternal=true): chỉ STAFF/ADMIN được tạo (STUDENT gửi true → 403). Khi notify,
//   LOẠI mọi recipient role=STUDENT — notify HS về comment họ không được xem = rò rỉ + hoang mang.
//
// Atomic: comment + audit(CREATE/"Comment") + notify gói trong MỘT $transaction (tx.* trực tiếp;
//   createNotification(input, tx)). Lỗi: 401 chưa đăng nhập · 403 AUDITOR post / STUDENT đặt nội bộ ·
//   400 body·zod hỏng · 404 không thấy case · 503 DB tạm thời (cạn pool/timeout, Retry-After) · 500 bất ngờ.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validation";
import { caseWhereForRole } from "@/lib/cases";
import { createNotification } from "@/lib/notifications";
import { classifyMutationError } from "@/lib/http-errors";
import { AuditAction, NotificationType, Role } from "@/generated/prisma/client";

// author chỉ {id,name,role} (không lộ PII) — dùng chung cho POST (response parity) lẫn GET.
const commentAuthorSelect = { author: { select: { id: true, name: true, role: true } } } as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // AUDITOR read-only — không bao giờ ghi.
    if (user.role === Role.AUDITOR)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createCommentSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    const body = parsed.data;

    // STUDENT không được tạo comment nội bộ (sau guard này, STUDENT luôn isInternal=false).
    if (user.role === Role.STUDENT && body.isInternal)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const isInternal = body.isInternal;

    const { id } = await params;

    // Chỉ thấy case theo quyền role → null là 404 đồng nhất. Kèm role người liên quan để lọc notify.
    const found = await prisma.case.findFirst({
      where: { id, ...caseWhereForRole({ sub: user.id, role: user.role }) },
      select: {
        id: true,
        caseCode: true,
        createdById: true,
        assignedToId: true,
        createdBy: { select: { id: true, role: true } },
        assignedTo: { select: { id: true, role: true } },
      },
    });
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const meta = clientMeta(request);

    // Nguyên tử: comment + audit + notify trong MỘT transaction (all-or-nothing).
    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { caseId: id, authorId: user.id, body: body.body, isInternal },
        include: commentAuthorSelect, // parity với GET → client render ngay không cần GET lại
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.CREATE,
          entityType: "Comment",
          entityId: c.id,
          metadata: { after: { caseId: id, isInternal } },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });

      // Báo người tạo + người được giao (trừ chính người bình luận); nếu nội bộ → loại STUDENT.
      const recipients = [found.createdBy, found.assignedTo]
        .filter((u): u is { id: string; role: Role } => u !== null)
        .filter((u) => u.id !== user.id)
        .filter((u) => !isInternal || u.role !== Role.STUDENT);
      await createNotification(
        {
          userIds: recipients.map((u) => u.id),
          type: NotificationType.COMMENT_ADDED,
          message: `Bình luận mới trên ${found.caseCode}`,
          caseId: id,
        },
        tx,
      );

      return c;
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    // DB tạm thời (cạn pool/timeout) → 503 + Retry-After (nhất quán house-style P5); còn lại 500.
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("cases [id] comments POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Phải thấy case mới đọc comment → null là 404 đồng nhất.
    const found = await prisma.case.findFirst({
      where: { id, ...caseWhereForRole({ sub: user.id, role: user.role }) },
      select: { id: true },
    });
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // STUDENT không thấy comment nội bộ; role khác thấy hết. author chỉ {id,name,role} (không lộ PII).
    const comments = await prisma.comment.findMany({
      where: { caseId: id, ...(user.role === Role.STUDENT ? { isInternal: false } : {}) },
      orderBy: { createdAt: "asc" },
      include: commentAuthorSelect,
    });

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("cases [id] comments GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
