// Hàng hồ sơ GỌN dùng chung cho LỚP VẬN HÀNH (AllCasesView /cases + DeskView /desk). Clone QueueRow:
// nhãn "Khẩn" (CaseFlags) cho vụ khẩn, KHÔNG dấu chấm.
// + caseCode mono + StatusPill + title line-clamp + AgingBadge (tuổi client, KHÔNG SLA server) → hồ sơ.
// KHÔNG reduced-motion. Server là nguồn thứ tự/tầm-nhìn — hàng chỉ trình bày, KHÔNG tự lọc/sort.
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { AgingBadge } from "@/components/ui/AgingBadge";
import { CaseFlags } from "@/components/ui/CaseFlags";
import type { CaseListItem } from "@/lib/api-types";

export function CaseRow({ c }: { c: CaseListItem }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className="focus-visible:outline-ink group hover:bg-sunken -mx-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md px-2 py-3 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="text-ink-3 shrink-0 font-mono text-xs">
        {c.caseCode}
      </span>
      <StatusPill status={c.status} className="shrink-0" />
      <span className="text-ink order-last line-clamp-2 min-w-0 basis-full text-sm sm:order-none sm:line-clamp-1 sm:basis-0 sm:flex-1">{c.title}</span>
      <CaseFlags isEmergency={c.isEmergency} isAnonymous={c.isAnonymous} isSensitive={c.isSensitive} />
      <AgingBadge createdAt={c.createdAt} status={c.status} />
    </Link>
  );
}
