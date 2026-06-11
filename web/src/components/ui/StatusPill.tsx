// Status badge (UI Grammar): pill viền hairline + label sans + dot.
// Nhãn VN 1-chiều từ case-display.STATUS_LABEL; màu dot từ status-theme (KHÔNG STATUS_BADGE).
import { STATUS_LABEL } from "@/lib/case-display";
import type { CaseStatus } from "@/lib/api-types";
import { STATUS_TONE } from "./status-theme";
import { SignalDot } from "./SignalDot";
import { cn } from "@/lib/cn";

export function StatusPill({
  status,
  className,
}: {
  status: CaseStatus;
  className?: string;
}) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "border-line text-ink-2 inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium",
        className,
      )}
    >
      <SignalDot tone={tone} size="sm" pulse={tone === "signal"} />
      {STATUS_LABEL[status]}
    </span>
  );
}
