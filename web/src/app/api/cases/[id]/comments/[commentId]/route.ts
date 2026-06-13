// DELETE /api/cases/[id]/comments/[commentId] — xoá comment (soft-delete).
//
// Quyền: tác giả tự xoá (authorId==me) ∨ ADMIN xoá bất kỳ. Else 403.
// Comment không thuộc case / case không thấy / đã xoá → 404 đồng nhất.
// Xoá comment gốc (parentId==null): cascade soft-delete tất cả replies trong $transaction.
// Audit: DELETE entityType "Comment" kèm cascadedReplyIds (nếu có).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { caseWhereForRole } from "@/lib/cases";
import { classifyMutationError } from "@/lib/http-errors";
import { AuditAction, Role } from "@/generated/prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: caseId, commentId } = await params;
    const meta = clientMeta(request);

    // Phải thấy case mới thao tác comment → 404 đồng nhất.
    const caseFound = await prisma.case.findFirst({
      where: { id: caseId, ...caseWhereForRole({ sub: user.id, role: user.role }) },
      select: { id: true },
    });
    if (!caseFound) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Tìm comment — thuộc đúng case + chưa xoá mới cho tương tác.
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, caseId: true, authorId: true, parentId: true, deletedAt: true },
    });
    if (!comment || comment.caseId !== caseId || comment.deletedAt !== null)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Chỉ tác giả hoặc ADMIN được xoá.
    if (comment.authorId !== user.id && user.role !== Role.ADMIN)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Cascade soft-delete replies nếu là comment gốc (parentId==null).
      let cascadedReplyIds: string[] = [];
      if (comment.parentId === null) {
        const replies = await tx.comment.findMany({
          where: { parentId: commentId, deletedAt: null },
          select: { id: true },
        });
        cascadedReplyIds = replies.map((r) => r.id);
        if (cascadedReplyIds.length > 0) {
          await tx.comment.updateMany({
            where: { id: { in: cascadedReplyIds } },
            data: { deletedAt: now },
          });
        }
      }

      await tx.comment.update({ where: { id: commentId }, data: { deletedAt: now } });

      await tx.auditLog.create({
        data: {
          actorId: user.id, action: AuditAction.DELETE, entityType: "Comment", entityId: commentId,
          metadata: {
            before: { caseId, authorId: comment.authorId },
            ...(cascadedReplyIds.length > 0 ? { cascadedReplyIds } : {}),
          },
          ipAddress: meta.ipAddress, userAgent: meta.userAgent,
        },
      });
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("comment DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
