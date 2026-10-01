// Nhãn trạng thái vụ việc: chữ tiếng Việt trên nền màu theo nhóm (KHÔNG dấu chấm).
//  Mới (NEW) = nền xanh LTT đặc (cần chú ý) · đang xử lý = nền xanh nhạt · đã xong = nền xám.
// Nhãn VN 1-chiều từ case-display.STATUS_LABEL; nhóm màu từ status-theme.
import { STATUS_LABEL } from "@/lib/case-display";
import type { CaseStatus } from "@/lib/api-types";
import { STATUS_TONE } from "./status-theme";
import type { SignalTone } from "./SignalDot";
import { cn } from "@/lib/cn";

const TONE_CHIP: Record<SignalTone, string> = {
  signal: "bg-signal text-paper-raised",
  running: "bg-gold-fill text-signal-deep",
  gold: "bg-sunken text-ink-3",
  emergency: "bg-emergency text-paper-raised",
  dormant: "bg-sunken text-ink-3",
};

export function StatusPill({
  status,
  className,
}: {
  status: CaseStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CHIP[STATUS_TONE[status]],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
