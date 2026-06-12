// "x phút/giờ/ngày trước" — TÍNH CLIENT (Date.now). ⚠ KHÔNG gọi ở SSR (giá trị phụ thuộc thời điểm →
// hydration mismatch); chỉ dùng trong client view sau khi list đã fetch (Bảng tin /feed). Đầu vào ISO
// từ server; rác → chuỗi rỗng. Gọn cho mốc gần; ≥30 ngày quy về tháng/năm.
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < MIN) return "vừa xong";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ trước`;
  const days = Math.floor(diff / DAY);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}
