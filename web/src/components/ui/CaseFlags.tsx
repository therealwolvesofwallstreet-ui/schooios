// Update C — badge "Nhạy cảm" (isSensitive) + "Ẩn danh" (isAnonymous). Pill hairline mono, token-only
// (gold-fill cho nhạy cảm = cần-chú-ý; ink-3 cho ẩn danh = trung tính). KHÔNG đỏ (oxblood để dành khẩn).
// Badge nhạy cảm CHỈ hiện cho người ĐÃ thấy case (server đã gate tầm-nhìn); FE chỉ render cờ server trả.
import { cn } from "@/lib/cn";

export function CaseFlags({
  isAnonymous,
  isSensitive,
  className,
}: {
  isAnonymous?: boolean;
  isSensitive?: boolean;
  className?: string;
}) {
  if (!isAnonymous && !isSensitive) return null;
  const pill =
    "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase";
  return (
    <>
      {isSensitive && (
        <span className={cn(pill, "border-line bg-gold-fill text-ink", className)}>Nhạy cảm</span>
      )}
      {isAnonymous && (
        <span className={cn(pill, "border-line text-ink-3", className)}>Ẩn danh</span>
      )}
    </>
  );
}
