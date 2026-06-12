"use client";

// MINI-SPINE — biến thể GỌN của THE SPINE cho trang chủ: danh sách case dọc theo xương 1px, mỗi node
// là 1 case (link → hồ sơ). First-paint stagger (index×0.04, cap 0.4) gate theo HYDRATE (KHÔNG
// prefers-reduced-motion — owner "immersive cho mọi người"): SSR tĩnh, sau hydrate stagger cho MỌI
// người. Dot theo VAI TRÒ: khẩn = emergency (oxblood, HIẾM), còn lại theo STATUS_TONE. KHÔNG chart.
import Link from "next/link";
import { motion } from "framer-motion";
import { useHydrated } from "@/hooks/useHydrated";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { StatusPill } from "@/components/ui/StatusPill";
import { STATUS_TONE } from "@/components/ui/status-theme";
import type { CaseListItem } from "@/lib/api-types";

const EMERGE = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

export function MiniSpine({ cases }: { cases: CaseListItem[] }) {
  const staticFirst = !useHydrated();
  return (
    <ol className="border-line-2 relative ml-1.5 flex flex-col border-l">
      {cases.map((c, i) => {
        const tone: SignalTone = c.isEmergency ? "emergency" : STATUS_TONE[c.status];
        return (
          <motion.li
            key={c.id}
            className="relative pb-5 pl-6 last:pb-0"
            initial={staticFirst ? false : { opacity: 0, y: 8 }}
            animate={staticFirst ? undefined : { opacity: 1, y: 0 }}
            transition={{ ...EMERGE, delay: Math.min(i * 0.04, 0.4) }}
          >
            <span className="absolute top-1.5 -left-[3px]">
              <SignalDot tone={tone} size="sm" pulse={tone === "emergency"} />
            </span>
            <Link
              href={`/cases/${c.id}`}
              className="focus-visible:outline-ink group -mx-2 flex flex-col gap-1.5 rounded-md px-2 py-1 transition-colors duration-150 ease-quiet hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="flex items-center gap-2">
                <span className="text-ink-3 font-mono text-[11px] tracking-[0.12em]">
                  {c.caseCode}
                </span>
                <StatusPill status={c.status} />
              </span>
              <span className="text-ink group-hover:text-ink line-clamp-1 text-sm font-medium">
                {c.title}
              </span>
            </Link>
          </motion.li>
        );
      })}
    </ol>
  );
}
