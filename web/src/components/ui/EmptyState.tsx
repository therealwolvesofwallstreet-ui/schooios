// Empty = khoảnh khắc con người: serif 1 dòng + khoảng trống + 1 dấu signal (ngủ).
// KHÔNG "No data found". Serif (Newsreader) ĐƯỢC PHÉP ở đây (§4.3).
import { SignalDot } from "./SignalDot";
import { cn } from "@/lib/cn";

export function EmptyState({
  message,
  action,
  className,
}: {
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      <SignalDot tone="dormant" size="lg" />
      <p className="text-ink-2 max-w-sm font-serif text-lg leading-relaxed">{message}</p>
      {action}
    </div>
  );
}
