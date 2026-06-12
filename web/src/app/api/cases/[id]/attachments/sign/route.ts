import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { caseWhereForRole } from "@/lib/cases";
import { createUploadUrl, sanitizeFileName, StorageError } from "@/lib/storage";

const Body = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(8_388_608),
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

  // Visibility + mutate check (anti-enumeration: 404 dù không-tồn-tại hay không-quyền)
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

  // Path server-generated — client không can thiệp prefix
  const safeName = sanitizeFileName(parsed.data.fileName);
  const path = `attachments/${caseId}/${Date.now()}-${safeName}`;

  try {
    const { signedUploadUrl } = await createUploadUrl(path);
    return NextResponse.json({ uploadUrl: signedUploadUrl, path });
  } catch (e) {
    if (e instanceof StorageError) {
      return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
