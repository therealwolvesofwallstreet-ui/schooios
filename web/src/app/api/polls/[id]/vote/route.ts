// POST /api/polls/[id]/vote — bình chọn / đổi lựa chọn 1 poll (Update B).
//
// Mọi role TRỪ AUDITOR (read-only → 403). 1 phiếu/user/poll (unique) — gọi lại = ĐỔI optionId
//   (upsert, KHÔNG cộng dồn). optionId PHẢI thuộc poll này (else 400); poll đã đóng (now>closesAt)
//   → 400; poll không tồn tại / đã xoá → 404. No-op (chọn lại đúng option cũ) → KHÔNG audit.
//   Race double-submit (P2002) bắt → coi như thành công. Trả poll results mới (count/percent/myOptionId).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { votePollSchema } from "@/lib/validation";
import { classifyMutationError } from "@/lib/http-errors";
import { enrichOnePoll, pollSelect } from "@/lib/broadcast";
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

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = votePollSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    const { optionId } = parsed.data;

    const { id } = await params;
    // Nạp poll (sống) + options để validate optionId-thuộc-poll + closesAt. Không thấy → 404.
    const poll = await prisma.poll.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, closesAt: true, options: { select: { id: true } } },
    });
    if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // optionId phải thuộc poll này (chống bình chọn option của poll khác / option rác).
    if (!poll.options.some((o) => o.id === optionId))
      return NextResponse.json({ error: "Invalid option for this poll" }, { status: 400 });
    // Poll đã đóng → không nhận phiếu mới.
    if (poll.closesAt && poll.closesAt.getTime() < Date.now())
      return NextResponse.json({ error: "Poll is closed" }, { status: 400 });

    const meta = clientMeta(request);
    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.pollVote.findUnique({
          where: { userId_pollId: { userId: user.id, pollId: id } },
          select: { optionId: true },
        });
        if (existing?.optionId === optionId) return; // no-op: chọn lại đúng option cũ → KHÔNG audit
        await tx.pollVote.upsert({
          where: { userId_pollId: { userId: user.id, pollId: id } },
          create: { userId: user.id, pollId: id, optionId },
          update: { optionId },
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
            entityType: "PollVote",
            entityId: id,
            metadata: {
              before: existing ? { optionId: existing.optionId } : undefined,
              after: { optionId },
            },
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          },
        });
      });
    } catch (err) {
      // Double-submit đồng thời → P2002 = idempotent thành công (phiếu đã ghi), không phải lỗi.
      if (!isUniqueViolation(err)) throw err;
    }

    const fresh = await prisma.poll.findUniqueOrThrow({ where: { id }, select: pollSelect });
    const shaped = await enrichOnePoll(fresh, user.id);
    return NextResponse.json({ poll: shaped });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("POST /api/polls/[id]/vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
