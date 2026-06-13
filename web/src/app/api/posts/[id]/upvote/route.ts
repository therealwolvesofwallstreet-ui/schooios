// POST/DELETE /api/posts/[id]/upvote — thích / bỏ thích 1 post (upvote-only, Update B).
//
// Mọi role TRỪ AUDITOR (read-only → 403). POST = thích (idempotent: đã thích → no-op, KHÔNG audit
//   lại); DELETE = bỏ thích (chưa thích → no-op). Post không tồn tại / đã xoá → 404. unique(userId,
//   postId) ⇒ KHÔNG phình count khi spam; race double-submit (P2002) bắt → coi như no-op thành công.
// Trả {upvoteCount, myUpvoted} (aggregate, KHÔNG lộ danh tính người thích). Audit CREATE/DELETE "PostVote".
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";
import { AuditAction, Prisma, Role } from "@/generated/prisma/client";

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === Role.AUDITOR)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const meta = clientMeta(request);
    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.postVote.findUnique({
          where: { userId_postId: { userId: user.id, postId: id } },
          select: { id: true },
        });
        if (existing) return; // idempotent no-op — đã thích, KHÔNG audit lại
        await tx.postVote.create({ data: { userId: user.id, postId: id } });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: AuditAction.CREATE,
            entityType: "PostVote",
            entityId: id,
            metadata: { after: { postId: id } },
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          },
        });
      });
    } catch (err) {
      // Double-submit đồng thời → P2002 (đã thích bởi tx kia) = idempotent thành công, không phải lỗi.
      if (!isUniqueViolation(err)) throw err;
    }

    const upvoteCount = await prisma.postVote.count({ where: { postId: id } });
    return NextResponse.json({ upvoteCount, myUpvoted: true });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("POST /api/posts/[id]/upvote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === Role.AUDITOR)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const meta = clientMeta(request);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.postVote.findUnique({
        where: { userId_postId: { userId: user.id, postId: id } },
        select: { id: true },
      });
      if (!existing) return; // chưa thích → no-op
      await tx.postVote.delete({
        where: { userId_postId: { userId: user.id, postId: id } },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.DELETE,
          entityType: "PostVote",
          entityId: id,
          metadata: { before: { postId: id } },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });
    });

    const upvoteCount = await prisma.postVote.count({ where: { postId: id } });
    return NextResponse.json({ upvoteCount, myUpvoted: false });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("DELETE /api/posts/[id]/upvote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
