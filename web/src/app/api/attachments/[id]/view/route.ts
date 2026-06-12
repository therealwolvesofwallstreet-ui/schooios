import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { caseWhereForRole } from "@/lib/cases";
import { createViewUrl, StorageError } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: attachmentId } = await params;

  // Fetch attachment; gate on case visibility (anti-enumeration: 404 = invisible OR not-exist)
  const attachment = await prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      case: { deletedAt: null, ...caseWhereForRole({ sub: actor.id, role: actor.role }) },
    },
    select: { id: true, filePath: true },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { url, expiresAt } = await createViewUrl(attachment.filePath);
    return NextResponse.json({ url, expiresAt });
  } catch (e) {
    if (e instanceof StorageError) {
      return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
