// PUT/DELETE /api/cases/[id]/vote — vote up/down trên case.
//
// PUT { value: 1 | -1 }: upsert vote của user cho case hiện tại. Đã có vote → cập nhật value.
// DELETE: bỏ vote (no-op nếu chưa có → vẫn 200). Trả aggregate { upCount, downCount, score, myVote }.
//
// Quyền: user THẤY case (findFirst+caseWhereForRole → 404 nếu không); AUDITOR → 403.
// Audit: CREATE (vote mới) / UPDATE (đổi value) / DELETE (bỏ vote) qua tx.auditLog.create.
// KHÔNG lộ danh tính người vote — chỉ aggregate + myVote của chính người gọi.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { voteSchema } from "@/lib/validation";
import { caseWhereForRole } from "@/lib/cases";
import { classifyMutationError } from "@/lib/http-errors";
import { AuditAction, Role } from "@/generated/prisma/client";

async function getVoteAggregate(caseId: string, userId: string) {
  const [groups, myVoteRow] = await Promise.all([
    prisma.vote.groupBy({ by: ["value"], where: { caseId }, _count: { value: true } }),
    prisma.vote.findUnique({ where: { userId_caseId: { userId, caseId } }, select: { value: true } }),
  ]);
  const upCount = groups.find((g) => g.value === 1)?._count.value ?? 0;
  const downCount = groups.find((g) => g.value === -1)?._count.value ?? 0;
  return { upCount, downCount, score: upCount - downCount, myVote: (myVoteRow?.value ?? null) as 1 | -1 | null };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === Role.AUDITOR) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let raw: unknown;
    try { raw = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = voteSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });

    const { id: caseId } = await params;
    const meta = clientMeta(request);

    const found = await prisma.case.findFirst({
      where: { id: caseId, ...caseWhereForRole({ sub: user.id, role: user.role }) },
      select: { id: true },
    });
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.vote.findUnique({
        where: { userId_caseId: { userId: user.id, caseId } },
        select: { id: true, value: true },
      });

      if (existing) {
        await tx.vote.update({ where: { id: existing.id }, data: { value: parsed.data.value } });
        await tx.auditLog.create({
          data: {
            actorId: user.id, action: AuditAction.UPDATE, entityType: "Vote", entityId: existing.id,
            metadata: { before: { value: existing.value }, after: { value: parsed.data.value } },
            ipAddress: meta.ipAddress, userAgent: meta.userAgent,
          },
        });
      } else {
        const v = await tx.vote.create({ data: { userId: user.id, caseId, value: parsed.data.value } });
        await tx.auditLog.create({
          data: {
            actorId: user.id, action: AuditAction.CREATE, entityType: "Vote", entityId: v.id,
            metadata: { after: { caseId, value: parsed.data.value } },
            ipAddress: meta.ipAddress, userAgent: meta.userAgent,
          },
        });
      }
    });

    const agg = await getVoteAggregate(caseId, user.id);
    return NextResponse.json(agg);
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("vote PUT error:", err);
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
    if (user.role === Role.AUDITOR) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: caseId } = await params;
    const meta = clientMeta(request);

    const found = await prisma.case.findFirst({
      where: { id: caseId, ...caseWhereForRole({ sub: user.id, role: user.role }) },
      select: { id: true },
    });
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.vote.findUnique({
        where: { userId_caseId: { userId: user.id, caseId } },
        select: { id: true, value: true },
      });
      if (!existing) return; // no-op
      await tx.vote.delete({ where: { id: existing.id } });
      await tx.auditLog.create({
        data: {
          actorId: user.id, action: AuditAction.DELETE, entityType: "Vote", entityId: existing.id,
          metadata: { before: { caseId, value: existing.value } },
          ipAddress: meta.ipAddress, userAgent: meta.userAgent,
        },
      });
    });

    const agg = await getVoteAggregate(caseId, user.id);
    return NextResponse.json(agg);
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("vote DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
