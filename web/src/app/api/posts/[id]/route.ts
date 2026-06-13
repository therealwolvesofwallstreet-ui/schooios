// DELETE /api/posts/[id] — xoá mềm 1 post (CHỈ ADMIN, Update B).
//
// Soft-delete (deletedAt) — biến mất khỏi GET /api/posts (lọc deletedAt IS NULL). Votes giữ nguyên
// (FK Restrict; soft-delete không hard-delete nên không chạm ràng buộc). non-ADMIN → 403; không
// tồn tại / đã xoá → 404. Atomic: update + audit(DELETE,"Post") trong 1 $transaction.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";
import { AuditAction, Role } from "@/generated/prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== Role.ADMIN)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const meta = clientMeta(request);
    await prisma.$transaction(async (tx) => {
      await tx.post.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.DELETE,
          entityType: "Post",
          entityId: id,
          metadata: { before: { deletedAt: null }, after: { deletedAt: "set" } },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
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
    console.error("DELETE /api/posts/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
