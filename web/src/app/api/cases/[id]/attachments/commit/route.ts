import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { caseWhereForRole } from "@/lib/cases";
import { recordAudit } from "@/lib/audit";
import { verifyObject, removeObject, ALLOWED_MIME, getAttachmentMaxBytes, StorageError } from "@/lib/storage";
import { AuditAction } from "@/generated/prisma/client";
import type { AttachmentDTO } from "@/lib/api-types";

const Body = z.object({
  path: z.string().min(1).max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role === "AUDITOR")
    return NextResponse.json({ error: "Auditors cannot upload attachments" }, { status: 403 });

  const { id: caseId } = await params;

  const theCase = await prisma.case.findFirst({
    where: { id: caseId, deletedAt: null, ...caseWhereForRole({ sub: actor.id, role: actor.role }) },
    select: { id: true, createdById: true, assignedToId: true },
  });
  if (!theCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canMutate =
    actor.role === "ADMIN" ||
    theCase.createdById === actor.id ||
    theCase.assignedToId === actor.id;
  if (!canMutate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { path } = parsed.data;

  // Reject path không thuộc caseId này — ngăn ghi đè case khác
  if (!path.startsWith(`attachments/${caseId}/`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Verify thực tế: object tồn tại + size ≤ MAX + magic bytes ∈ allowlist
  let verified: Awaited<ReturnType<typeof verifyObject>>;
  try {
    verified = await verifyObject(path);
  } catch (e) {
    if (e instanceof StorageError) {
      return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!verified) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 400 });
  }

  const maxBytes = getAttachmentMaxBytes();
  if (verified.size > maxBytes) {
    await removeObject(path).catch(() => {});
    return NextResponse.json({ error: `File too large (max ${maxBytes} bytes)` }, { status: 400 });
  }

  if (!verified.detectedMime || !ALLOWED_MIME.has(verified.detectedMime)) {
    await removeObject(path).catch(() => {});
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Extract filename from path: last segment after first dash (removes timestamp prefix)
  const lastSegment = path.split("/").at(-1) ?? path;
  const dashIdx = lastSegment.indexOf("-");
  const fileName = dashIdx > 0 ? lastSegment.slice(dashIdx + 1) : lastSegment;

  try {
    const att = await prisma.attachment.create({
      data: {
        caseId,
        uploadedById: actor.id,
        fileName,
        filePath: path,
        fileSize: verified.size,
        mimeType: verified.detectedMime,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    await recordAudit({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: "Attachment",
      entityId: att.id,
      metadata: { after: { id: att.id, fileName, caseId } },
    });

    const dto: AttachmentDTO = {
      id: att.id,
      fileName: att.fileName,
      fileSize: att.fileSize,
      mimeType: att.mimeType,
      createdAt: att.createdAt.toISOString(),
      uploadedBy: att.uploadedBy,
    };
    return NextResponse.json({ attachment: dto }, { status: 201 });
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
