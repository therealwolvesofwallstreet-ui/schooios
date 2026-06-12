import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { caseWhereForRole } from "@/lib/cases";
import { recordAudit } from "@/lib/audit";
import { removeObject } from "@/lib/storage";
import { AuditAction } from "@/generated/prisma/client";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attId: string }> },
) {
  const actor = await requireUser(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role === "AUDITOR")
    return NextResponse.json({ error: "Auditors cannot delete attachments" }, { status: 403 });

  const { id: caseId, attId } = await params;

  // Visibility check on case (anti-enumeration)
  const theCase = await prisma.case.findFirst({
    where: { id: caseId, deletedAt: null, ...caseWhereForRole({ sub: actor.id, role: actor.role }) },
    select: { id: true, createdById: true },
  });
  if (!theCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch attachment (must belong to this case)
  const attachment = await prisma.attachment.findFirst({
    where: { id: attId, caseId },
    select: { id: true, filePath: true, fileName: true, uploadedById: true },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete permission: creator (case) | ADMIN
  const canDelete = actor.role === "ADMIN" || theCase.createdById === actor.id;
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Remove from Storage (best-effort — DB row is source of truth)
  await removeObject(attachment.filePath).catch(() => {});

  try {
    await prisma.attachment.delete({ where: { id: attId } });
    await recordAudit({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: "Attachment",
      entityId: attId,
      metadata: { before: { id: attId, fileName: attachment.fileName, caseId } },
    });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2028" || code === "P2024") {
        return NextResponse.json(
          { error: "Service temporarily unavailable" },
          { status: 503, headers: { "Retry-After": "5" } },
        );
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
