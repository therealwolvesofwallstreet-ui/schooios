// GET /api/notifications — danh sách thông báo CỦA TÔI (phân trang + lọc unreadOnly).
//   where luôn ghim userId=mình → không bao giờ lọt notification của người khác.
//   unreadCount tính ĐỘC LẬP với filter `where` (badge "chưa đọc" đúng kể cả khi đang xem all).
//
// Đọc nhất quán (snapshot): gói 3 query trong $transaction với isolationLevel=RepeatableRead.
//   READ COMMITTED mặc định lấy snapshot MỚI mỗi câu lệnh ⇒ total/unreadCount/page có thể lệch nếu
//   có ghi xen giữa. RepeatableRead đóng băng 1 snapshot tại câu đầu cho cả transaction. An toàn &
//   "miễn phí" ở đây: transaction CHỈ ĐỌC nên không thể vướng serialization-failure (40001) → không
//   cần retry; chạy tốt qua transaction-pooler (isolation set trong BEGIN).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { listNotificationsQuery } from "@/lib/validation";
import { classifyMutationError } from "@/lib/http-errors";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = listNotificationsQuery.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    const { page, limit, unreadOnly } = parsed.data;

    const where = { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) };

    const [total, unreadCount, notifications] = await prisma.$transaction(
      [
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId: user.id, isRead: false } }),
        prisma.notification.findMany({
          where,
          // id desc làm tiebreaker → phân trang TẤT ĐỊNH khi trùng createdAt (notification batch
          // qua createMany dùng chung created_at = CURRENT_TIMESTAMP → skip/take có thể bỏ sót/lặp
          // dòng nếu thiếu khoá phụ duy nhất). Nhất quán với cases list/emergency lane.
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
          include: { case: { select: { id: true, caseCode: true } } },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return NextResponse.json({
      notifications,
      unreadCount,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    // GET mở $transaction (RepeatableRead) → cạn pool/timeout là lỗi tạm thời → 503 + Retry-After.
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("notifications GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
