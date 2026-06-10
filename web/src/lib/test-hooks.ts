// ⚠️ HOOK CHỈ DÀNH CHO TEST CONCURRENCY (fault injection) — VÔ HIỆU hoàn toàn trừ khi env
// P5_TEST_HOOKS="1". TUYỆT ĐỐI KHÔNG set P5_TEST_HOOKS ở production (Vercel không có biến này).
//
// Lý do tồn tại: optimistic-lock chỉ "thua" khi một writer khác commit GIỮA lúc route đọc `cur`
// và lúc route chạy updateMany. Qua HTTP black-box không thể ép cửa sổ đó một cách tất định
// (phụ thuộc timing/độ trễ pool). Hook này cho test chèn delay vào đúng cửa sổ ấy để CHỨNG MINH
// tất định rằng route THỰC SỰ chặn ghi-đè theo version (updatedAt), không phải may rủi timing.
//
// An toàn: no-op nếu thiếu env (chỉ 1 phép so sánh chuỗi); chỉ kích khi có header x-p5-test-delay-ms;
// delay bị kẹp [0, 2000]ms để không thành vector DoS kể cả khi lỡ bật.
import type { NextRequest } from "next/server";

export async function maybeTestDelay(req: NextRequest): Promise<void> {
  if (process.env.P5_TEST_HOOKS !== "1") return;
  const raw = req.headers.get("x-p5-test-delay-ms");
  if (!raw) return;
  const ms = Math.min(Math.max(Number(raw) || 0, 0), 2000);
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}
