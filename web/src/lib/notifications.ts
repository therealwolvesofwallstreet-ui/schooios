// Helper tạo Notification dùng chung cho mọi route (P6+). Notification chỉ có MỘT field nội dung:
// `message` (gộp toàn bộ text hiển thị) — KHÔNG title/body (khớp schema thật).
//
// `client` (mặc định prisma) nhận thêm Prisma.TransactionClient để chạy TRONG $transaction của
// route gọi (vd comment): comment + audit + notify phải all-or-nothing (atomic). Dùng createMany
// (1 round-trip) thay vì N create. Dedupe userIds + bỏ rỗng → không gửi trùng/rác.
import { prisma } from "@/lib/prisma";
import type { Prisma, NotificationType } from "@/generated/prisma/client";

export async function createNotification(
  input: { userIds: string[]; type: NotificationType; message: string; caseId?: string | null },
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  const ids = [...new Set(input.userIds)].filter(Boolean); // dedupe + loại chuỗi rỗng
  if (ids.length === 0) return 0;
  const r = await client.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: input.type,
      message: input.message,
      caseId: input.caseId ?? null,
    })),
  });
  return r.count;
}
