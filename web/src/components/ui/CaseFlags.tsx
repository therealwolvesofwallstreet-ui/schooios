// Cờ vụ việc dạng nhãn chữ (KHÔNG dấu chấm): "Khẩn" (isEmergency — đỏ LTT, CHỈ dành cho khẩn) ·
// "Nhạy cảm" (isSensitive) · "Ẩn danh" (isAnonymous). FE chỉ render cờ server trả (server đã gate tầm-nhìn).
import { cn } from "@/lib/cn";

export function CaseFlags({
  isEmergency,
  isAnonymous,
  isSensitive,
  className,
}: {
  isEmergency?: boolean;
  isAnonymous?: boolean;
  isSensitive?: boolean;
  className?: string;
}) {
  if (!isEmergency && !isAnonymous && !isSensitive) return null;
  const tag = "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap";
  return (
    <>
      {isEmergency && (
        <span className={cn(tag, "bg-emergency text-paper-raised", className)}>Khẩn</span>
      )}
      {isSensitive && (
        <span className={cn(tag, "border-line-2 text-ink-2 border", className)}>Nhạy cảm</span>
      )}
      {isAnonymous && (
        <span className={cn(tag, "border-line text-ink-3 border", className)}>Ẩn danh</span>
      )}
    </>
  );
}
