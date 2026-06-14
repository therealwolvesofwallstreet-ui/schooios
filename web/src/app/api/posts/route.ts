// POST/GET /api/posts — Thông báo BGH trên feed (Update B).
//
// POST: CHỈ ADMIN tạo (role khác → 403). GET: mọi role đã đăng nhập đọc (broadcast công khai,
//   KHÔNG case-scoped, KHÔNG sensitivity). Lọc deletedAt IS NULL; sort (createdAt desc, id desc)
//   tiebreaker tất định. upvoteCount + myUpvoted bồi qua enrichPosts (1 groupBy + 1 findMany cho cả
//   trang → KHÔNG N+1). Atomic: post + audit(CREATE,"Post") trong 1 $transaction.
// Lỗi: 401 chưa đăng nhập · 403 non-ADMIN · 400 json/zod · 503 DB tạm thời (Retry-After) · 500.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { createPostSchema, listBroadcastQuery } from "@/lib/validation";
import { classifyMutationError } from "@/lib/http-errors";
import { enrichPosts, postSelect } from "@/lib/broadcast";
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
    const parsed = createPostSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );

    const meta = clientMeta(request);
    const post = await prisma.$transaction(async (tx) => {
      const p = await tx.post.create({
        data: { authorId: user.id, body: parsed.data.body },
        select: postSelect,
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.CREATE,
          entityType: "Post",
          entityId: p.id,
          metadata: { after: { bodyLength: parsed.data.body.length } },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });
      return p;
    });

    // Post mới chưa có vote → upvoteCount 0, myUpvoted false (parity GET shape).
    return NextResponse.json(
      { post: { ...post, upvoteCount: 0, myUpvoted: false } },
      { status: 201 },
    );
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("POST /api/posts error:", err);
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
    const where: Prisma.PostWhereInput = { deletedAt: null };

    const [rows, total] = await prisma.$transaction([
      prisma.post.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: postSelect,
      }),
      prisma.post.count({ where }),
    ]);
    const posts = await enrichPosts(rows, user.id);

    return NextResponse.json({
      posts,
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
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
