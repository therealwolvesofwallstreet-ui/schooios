"use client";

// /queue — HÀNG CHỜ phân loại (STAFF/ADMIN qua nav; route mở rộng bucket "Đang chờ nhận" của StaffHome).
// TÁI DÙNG useCaseList — KHÔNG hook mới, KHÔNG sửa StaffHome. Lọc + phân trang SERVER-DRIVEN (API.md:
// ?status&isEmergency&page&limit) — FE KHÔNG tự sort/lọc/ghép trang; tin scope server trả.
// "Đang chờ" = GỘP NEW+TRIAGED qua 1 request multi-status (`?status=NEW,TRIAGED` — additive BE,
// KHÔNG client-merge); 2 tab còn lại narrow về 1 status. Mỗi đổi filter → 1 query server, page về 1.
// Hàng = ledger hairline + signal-gutter (NEW=signal "live" · TRIAGED=gold "đã chạm") + mono caseCode
// + StatusPill + title → hồ sơ. KHÔNG reduced-motion. Search (text/pg_trgm) HOÃN → F5+.
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { useCaseList } from "@/hooks/useCaseList";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { StatusPill } from "@/components/ui/StatusPill";
import { Hairline } from "@/components/ui/Hairline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pager } from "@/components/ui/Pager";
import { ErrorState } from "@/components/app/states";
import { cn } from "@/lib/cn";
import type { CaseListItem, CaseStatus } from "@/lib/api-types";

const PAGE_SIZE = 20;

// Bộ lọc HÀNG CHỜ → tham số `status` server-driven. "pending" = gộp NEW+TRIAGED (multi-status).
type QueueFilter = "pending" | "NEW" | "TRIAGED";
const FILTER_STATUS: Record<QueueFilter, CaseStatus | CaseStatus[]> = {
  pending: ["NEW", "TRIAGED"],
  NEW: "NEW",
  TRIAGED: "TRIAGED",
};
const FILTER_LABEL: Record<QueueFilter, string> = {
  pending: "Đang chờ",
  NEW: "Chờ tiếp nhận",
  TRIAGED: "Đã phân loại",
};
const FILTER_ORDER: QueueFilter[] = ["pending", "NEW", "TRIAGED"];

// Signal-gutter: NEW = signal (live, cần tiếp nhận) · TRIAGED = gold (đã phân loại, đã chạm). Khác → dormant.
function gutterTone(status: CaseStatus): SignalTone {
  if (status === "NEW") return "signal";
  if (status === "TRIAGED") return "gold";
  return "dormant";
}

export function QueueView() {
  const { user } = useSession();
  const [filter, setFilter] = useState<QueueFilter>("pending");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [page, setPage] = useState(1);

  // scope = user.id (cache key chống va chạm chéo-role — useCaseList §). request không gửi scope.
  const { cases, totalPages, total, isLoading, isError, refetch } = useCaseList(user?.id ?? "queue", {
    status: FILTER_STATUS[filter],
    isEmergency: emergencyOnly ? true : undefined,
    page,
    limit: PAGE_SIZE,
  });

  // Đổi filter → page về 1 (tránh xin trang quá tầm của lát mới).
  function pickFilter(f: QueueFilter) {
    setFilter(f);
    setPage(1);
  }
  function toggleEmergency() {
    setEmergencyOnly((v) => !v);
    setPage(1);
  }

  const emptyMessage = emergencyOnly
    ? "Không có vụ khẩn nào ở bước này."
    : filter === "NEW"
      ? "Không có vụ nào đang chờ tiếp nhận."
      : filter === "TRIAGED"
        ? "Không có vụ nào đã phân loại."
        : "Không có vụ nào đang chờ.";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink font-serif text-3xl leading-snug">Hàng chờ</h1>
        <p className="text-ink-3 text-sm">Tiếp nhận và phân loại những vụ việc đang chờ.</p>
      </header>

      {/* Lọc SERVER-DRIVEN — tab status + chip khẩn (gạch-chân / tô đậm = active). */}
      <div
        role="group"
        aria-label="Lọc hàng chờ"
        data-testid="queue-filter"
        className="flex flex-wrap items-center gap-x-6 gap-y-3"
      >
        <div className="flex items-center gap-5">
          {FILTER_ORDER.map((f) => (
            <FilterTab
              key={f}
              active={filter === f}
              onClick={() => pickFilter(f)}
              testid={`filter-${f.toLowerCase()}`}
            >
              {FILTER_LABEL[f]}
            </FilterTab>
          ))}
        </div>
        <span aria-hidden="true" className="bg-line-2 h-4 w-px" />
        <button
          type="button"
          onClick={toggleEmergency}
          data-testid="filter-emergency"
          aria-pressed={emergencyOnly}
          className={cn(
            "focus-visible:outline-ink inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2",
            emergencyOnly
              ? "border-signal text-signal font-medium"
              : "border-line text-ink-3 hover:text-ink-2",
          )}
        >
          <SignalDot tone="emergency" size="sm" pulse={emergencyOnly} />
          Chỉ khẩn
        </button>
      </div>

      {isLoading ? (
        <QueueSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} message="Không tải được hàng chờ." />
      ) : cases.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <section className="flex flex-col gap-4">
          <p className="text-ink-3 font-mono text-[11px] tracking-[0.12em] tabular-nums">
            {total} vụ
          </p>
          <ul data-testid="queue-list" className="flex flex-col">
            {cases.map((c, i) => (
              <li key={c.id} className="flex flex-col">
                {i > 0 && <Hairline />}
                <QueueRow c={c} />
              </li>
            ))}
          </ul>
          <Pager page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      )}
    </div>
  );
}

function QueueRow({ c }: { c: CaseListItem }) {
  const tone = gutterTone(c.status);
  return (
    <Link
      href={`/cases/${c.id}`}
      className="focus-visible:outline-ink group hover:bg-sunken -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <SignalDot tone={tone} size="sm" pulse={tone === "signal"} />
      <span className="text-ink-3 shrink-0 font-mono text-[11px] tracking-[0.12em]">
        {c.caseCode}
      </span>
      <StatusPill status={c.status} className="shrink-0" />
      <span className="text-ink line-clamp-1 min-w-0 flex-1 text-sm">{c.title}</span>
    </Link>
  );
}

function FilterTab({
  active,
  onClick,
  testid,
  children,
}: {
  active: boolean;
  onClick: () => void;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      aria-pressed={active}
      className={cn(
        "focus-visible:outline-ink rounded-sm border-b-2 pb-1 text-sm transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2",
        active
          ? "border-signal text-signal font-medium"
          : "text-ink-3 hover:text-ink-2 border-transparent",
      )}
    >
      {children}
    </button>
  );
}

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-5" data-testid="queue-skeleton">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}
