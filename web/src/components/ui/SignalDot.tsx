// THE SIGNAL — motif lõi. Một dấu nhỏ mang nghĩa theo VAI TRÒ màu:
//  signal = voice/now/cần-chú-ý (HIẾM) · gold = resolved/đã-ghi-nhận · running = đang-chạy (ink) ·
//  dormant = ngủ (viền rỗng) · emergency = khẩn (oxblood). pulse = "thở" (opacity, KHÔNG shimmer).
import { cn } from "@/lib/cn";

export type SignalTone = "signal" | "gold" | "running" | "dormant" | "emergency";

const TONE: Record<SignalTone, string> = {
  signal: "bg-signal",
  gold: "bg-gold",
  running: "bg-ink",
  emergency: "bg-emergency",
  dormant: "bg-transparent border border-line-2",
};

const SIZE = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
} as const;

export function SignalDot({
  tone = "signal",
  size = "md",
  pulse = false,
  className,
}: {
  tone?: SignalTone;
  size?: keyof typeof SIZE;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rounded-full",
        SIZE[size],
        TONE[tone],
        pulse && "animate-pulse",
        className,
      )}
    />
  );
}
