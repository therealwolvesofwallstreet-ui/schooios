// POST/GET /api/cases/[id]/comments — bình luận trên 1 case.
//
// QUYỀN: xem case = bình luận case. Nạp case qua caseWhereForRole (Public/Transparent) — không
//   thấy → 404 đồng nhất (chống dò tồn tại), giống cases/[id] detail. Coupling này là CHỦ Ý: một
//   nguồn sự thật duy nhất cho "ai đọc được case". Regression-guard: test C_SENS (STUDENT) → 404.
//
// COMMENT NỘI BỘ (isInternal=true): chỉ STAFF/ADMIN được tạo (STUDENT gửi true → 403). Khi notify,
//   LOẠI mọi recipient role=STUDENT — notify HS về comment họ không được xem = rò rỉ + hoang mang.
//
// Update A: parentId (reply) CHỈ ADMIN; parent phải tồn tại+cùng case+chưa xoá+parentId==null.
//   GET lọc deletedAt IS NULL + trả parentId. Shape ADDITIVE (không phá test cũ).
//
// Atomic: comment + audit(CREATE/"Comment") + notify gói trong MỘT $transaction (tx.* trực tiếp;
//   createNotification(input, tx)). Lỗi: 401 · 403 AUDITOR/STUDENT+internal/non-ADMIN+parentId ·
//   400 body·zod·parent hỏng · 404 không thấy case · 503 DB tạm thời · 500 bất ngờ.
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
const commentSelect = {
  author: { select: { id: true, name: true, role: true } },
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    if (user.role === Role.STUDENT && body.isInternal)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Reply (parentId) CHỈ ADMIN (403 cho role khác).
    if (body.parentId && user.role !== Role.ADMIN)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const isInternal = body.isInternal;
    const { id } = await params;

    const found = await prisma.case.findFirst({
      where: { id, ...caseWhereForRole({ sub: user.id, role: user.role }) },
      select: {
        id: true, caseCode: true, createdById: true, assignedToId: true,
        createdBy: { select: { id: true, role: true } },
        assignedTo: { select: { id: true, role: true } },
      },
    });
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Validate parent comment (nếu có).
    if (body.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: body.parentId },
        select: { id: true, caseId: true, parentId: true, deletedAt: true },
      });
      if (!parent || parent.caseId !== id || parent.deletedAt !== null)
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      if (parent.parentId !== null)
        return NextResponse.json({ error: "Nested replies not allowed" }, { status: 400 });
    }

    const meta = clientMeta(request);

    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          caseId: id, authorId: user.id, body: body.body, isInternal,
          parentId: body.parentId ?? null,
        },
        select: {
          id: true, caseId: true, authorId: true, body: true, isInternal: true,
          parentId: true, createdAt: true, updatedAt: true,
          ...commentSelect,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id, action: AuditAction.CREATE, entityType: "Comment", entityId: c.id,
          metadata: { after: { caseId: id, isInternal, parentId: body.parentId ?? null } },
          ipAddress: meta.ipAddress, userAgent: meta.userAgent,
        },
      });

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

    const found = await prisma.case.findFirst({
      where: { id, ...caseWhereForRole({ sub: user.id, role: user.role }) },
      select: { id: true },
    });
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Lọc deletedAt IS NULL (Update A). STUDENT không thấy isInternal. parentId ADDITIVE.
    const comments = await prisma.comment.findMany({
      where: {
        caseId: id,
        deletedAt: null,
        ...(user.role === Role.STUDENT ? { isInternal: false } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true, caseId: true, authorId: true, body: true, isInternal: true,
        parentId: true, createdAt: true, updatedAt: true,
        ...commentSelect,
      },
    });

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("cases [id] comments GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
