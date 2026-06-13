// POST/GET /api/polls — Bình chọn BGH trên feed (Update B).
//
// POST: CHỈ ADMIN tạo (role khác → 403); Poll + PollOption[] (order theo index) trong 1 $transaction
//   + audit(CREATE,"Poll"). GET: mọi role đã đăng nhập đọc (broadcast công khai). Lọc deletedAt IS
//   NULL; sort (createdAt desc, id desc). count/percent/myOptionId bồi qua enrichPolls (1 groupBy +
//   1 findMany cho cả trang → KHÔNG N+1; percent an toàn chia-0). isClosed = now > closesAt.
// Lỗi: 401 · 403 non-ADMIN · 400 json/zod (options ngoài 2–8, closesAt sai) · 503 · 500.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { createPollSchema, listBroadcastQuery } from "@/lib/validation";
import { classifyMutationError } from "@/lib/http-errors";
import { enrichOnePoll, enrichPolls, pollSelect } from "@/lib/broadcast";
import { AuditAction, Prisma, Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== Role.ADMIN)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createPollSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    const { question, options, closesAt } = parsed.data;

    const meta = clientMeta(request);
    const poll = await prisma.$transaction(async (tx) => {
      const p = await tx.poll.create({
        data: {
          authorId: user.id,
          question,
          closesAt: closesAt ? new Date(closesAt) : null,
          options: { create: options.map((text, i) => ({ text, order: i })) },
        },
        select: pollSelect,
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.CREATE,
          entityType: "Poll",
          entityId: p.id,
          metadata: { after: { optionCount: options.length, closesAt: closesAt ?? null } },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });
      return p;
    });

    // Poll mới chưa có phiếu → enrich cho count/percent=0, myOptionId=null, isClosed tính từ closesAt.
    const shaped = await enrichOnePoll(poll, user.id);
    return NextResponse.json({ poll: shaped }, { status: 201 });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("POST /api/polls error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = listBroadcastQuery.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    const { page, limit } = parsed.data;
    const where: Prisma.PollWhereInput = { deletedAt: null };

    const [rows, total] = await prisma.$transaction([
      prisma.poll.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: pollSelect,
      }),
      prisma.poll.count({ where }),
    ]);
    const polls = await enrichPolls(rows, user.id);

    return NextResponse.json({
      polls,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("GET /api/polls error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
