// Rate-limit in-memory (fixed-window) — P9: chặn brute-force đăng nhập.
//
// ⚠ R-KNOWN-LIMITATION (chủ ý, KHÔNG phải bug): bộ đếm nằm trong RAM của TỪNG instance.
//   - Serverless/Vercel: mỗi cold-start = process mới ⇒ Map rỗng ⇒ kẻ tấn công có thể "reset" bằng
//     cách ép scale-out, và nhiều instance KHÔNG chia sẻ bộ đếm. Đây CHỈ là khoá-vòng-logic +
//     chặn brute-force ở dev/single-instance, KHÔNG phải anti-abuse production.
//   - Production thật: thay bằng store chia sẻ (Upstash Redis / Vercel KV). Hoãn khỏi P9 (tránh phình scope).
//   - Bộ nhớ được CHẶN: sweep THROTTLE (tối đa 1 lần/giây) dọn entry hết hạn; nếu VẪN quá ngưỡng vì
//     flood key sống (ip/identifier do client kiểm soát) thì CLEAR toàn bộ — chấp nhận reset đếm dưới
//     flood (limiter dev-grade) để đổi lấy bound bộ nhớ + không khuếch đại CPU (sweep KHÔNG chạy mỗi request).
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
const MAX_BUCKETS = 10_000;
let lastSweepAt = 0;

// Trả { ok, retryAfter(giây) }. Đếm MỌI lần gọi (kể cả request thành công — không reset khi đúng):
// cửa sổ cố định `windowMs`, cho tối đa `limit` lần; lần thứ (limit+1) trong cùng cửa sổ → ok:false.
export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  // Sweep chống rò bộ nhớ — THROTTLE 1 lần/giây (KHÔNG mỗi request → tránh O(n)/request dưới flood key sống).
  // Dọn entry hết hạn; nếu vẫn quá ngưỡng (toàn key sống) → clear hết để bound bộ nhớ cứng (đánh đổi dev-grade).
  if (buckets.size > MAX_BUCKETS && now - lastSweepAt > 1_000) {
    lastSweepAt = now;
    for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }
  const e = buckets.get(key);
  if (!e || now >= e.resetAt) {
    // Cửa sổ mới (hoặc đã hết hạn) → khởi tạo lại bộ đếm.
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  e.count += 1;
  if (e.count > limit) {
    return { ok: false, retryAfter: Math.ceil((e.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}
