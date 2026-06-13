// DELETE /api/polls/[id] — xoá mềm 1 poll (CHỈ ADMIN, Update B).
//
// Soft-delete (deletedAt) — biến mất khỏi GET /api/polls. Options + votes giữ nguyên (FK Restrict;
// soft-delete không hard-delete). non-ADMIN → 403; không tồn tại / đã xoá → 404. Atomic: update +
// audit(DELETE,"Poll").
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
    const poll = await prisma.poll.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const meta = clientMeta(request);
    await prisma.$transaction(async (tx) => {
      await tx.poll.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.DELETE,
          entityType: "Poll",
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
    console.error("DELETE /api/polls/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
