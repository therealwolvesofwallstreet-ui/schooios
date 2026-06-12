// Hàng hồ sơ GỌN dùng chung cho LỚP VẬN HÀNH (AllCasesView /cases + DeskView /desk). Clone QueueRow:
// signal-gutter theo VAI TRÒ (khẩn = emergency oxblood pulse · NEW = signal pulse · còn lại STATUS_TONE)
// + caseCode mono + StatusPill + title line-clamp + AgingBadge (tuổi client, KHÔNG SLA server) → hồ sơ.
// KHÔNG reduced-motion. Server là nguồn thứ tự/tầm-nhìn — hàng chỉ trình bày, KHÔNG tự lọc/sort.
import Link from "next/link";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { StatusPill } from "@/components/ui/StatusPill";
import { AgingBadge } from "@/components/ui/AgingBadge";
import { STATUS_TONE } from "@/components/ui/status-theme";
import type { CaseListItem } from "@/lib/api-types";

export function CaseRow({ c }: { c: CaseListItem }) {
  const tone: SignalTone = c.isEmergency ? "emergency" : STATUS_TONE[c.status];
  return (
    <Link
      href={`/cases/${c.id}`}
      className="focus-visible:outline-ink group hover:bg-sunken -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <SignalDot tone={tone} size="sm" pulse={tone === "signal" || tone === "emergency"} />
      <span className="text-ink-3 shrink-0 font-mono text-[11px] tracking-[0.12em]">
        {c.caseCode}
      </span>
      <StatusPill status={c.status} className="shrink-0" />
      <span className="text-ink line-clamp-1 min-w-0 flex-1 text-sm">{c.title}</span>
      <AgingBadge createdAt={c.createdAt} status={c.status} />
    </Link>
  );
}
