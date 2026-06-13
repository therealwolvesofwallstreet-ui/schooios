"use client";

// /feed — "BẢNG TIN" (STUDENT). useCaseList(page,limit:20) KHÔNG `mine` → server trả CÔNG KHAI
// (non-sensitive) ∪ của-mình = dòng tin (KHÁC /report `mine:true` = chỉ của mình). FE KHÔNG tự lọc
// sensitive (server đã gate) / KHÔNG tự sort (newest-first là thứ tự server). READ-ONLY: hàng → hồ sơ;
// KHÔNG comment/upvote/nút hành động. Hàng giàu hơn ledger: title serif + caseCode mono + StatusPill +
// AgingBadge + thời-gian-tương-đối (client) + tên loại. KHÔNG reduced-motion.
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { useCaseList } from "@/hooks/useCaseList";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { StatusPill } from "@/components/ui/StatusPill";
import { AgingBadge } from "@/components/ui/AgingBadge";
import { Hairline } from "@/components/ui/Hairline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pager } from "@/components/ui/Pager";
import { ErrorState } from "@/components/app/states";
import { STATUS_TONE } from "@/components/ui/status-theme";
import { formatDateTime } from "@/lib/case-display";
import { relativeTime } from "@/lib/relative-time";
import type { CaseListItem } from "@/lib/api-types";
import { BroadcastLane } from "./BroadcastLane";

const PAGE_SIZE = 20;

export function FeedView() {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  // KHÔNG `mine` → feed công khai ∪ của-mình (server-scoped). Thứ tự + tầm-nhìn do server quyết.
  const { cases, total, totalPages, isLoading, isError, refetch } = useCaseList(
    user?.id ?? "feed",
    { page, limit: PAGE_SIZE },
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink font-serif text-3xl leading-snug">Bảng tin</h1>
        <p className="text-ink-3 text-sm">Thông báo từ BGH và những báo cáo gần đây</p>
      </header>

      {/* KHU broadcast (Update B) — thêm trên cùng, KHÔNG phá stream case bên dưới. */}
      <BroadcastLane />

      {/* Stream case Đợt 1 — GIỮ NGUYÊN hành vi (useCaseList, FeedRow, Pager). */}
      <section className="flex flex-col gap-4">
        <h2 className="text-ink font-serif text-xl leading-snug">Sự việc gần đây</h2>
        {isLoading ? (
          <FeedSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} message="Không tải được bảng tin." />
        ) : cases.length === 0 ? (
          <EmptyState message="Chưa có tiếng nói nào được chia sẻ." />
        ) : (
          <>
            <p className="text-ink-3 font-mono text-[11px] tracking-[0.12em] tabular-nums">{total} tin</p>
            <ul data-testid="feed-list" className="flex flex-col">
              {cases.map((c, i) => (
                <li key={c.id} className="flex flex-col">
                  {i > 0 && <Hairline />}
                  <FeedRow c={c} />
                </li>
              ))}
            </ul>
            <Pager page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}

function FeedRow({ c }: { c: CaseListItem }) {
  const tone: SignalTone = c.isEmergency ? "emergency" : STATUS_TONE[c.status];
  const score = c.score ?? 0;
  return (
    <Link
      href={`/cases/${c.id}`}
      className="focus-visible:outline-ink group hover:bg-sunken -mx-2 flex flex-col gap-1.5 rounded-md px-2 py-3 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex flex-wrap items-center gap-2.5">
        <SignalDot tone={tone} size="sm" pulse={tone === "signal" || tone === "emergency"} />
        <span className="text-ink-3 shrink-0 font-mono text-[11px] tracking-[0.12em]">
          {c.caseCode}
        </span>
        <StatusPill status={c.status} className="shrink-0" />
        <AgingBadge createdAt={c.createdAt} status={c.status} />
      </span>
      <span className="text-ink font-serif text-base leading-snug line-clamp-1">{c.title}</span>
      <span className="text-ink-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <span>{c.category.name}</span>
        <span aria-hidden="true">·</span>
        <span title={formatDateTime(c.createdAt)}>{relativeTime(c.createdAt)}</span>
        {score !== 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {score > 0 ? `▲${score}` : `▼${Math.abs(score)}`}
            </span>
          </>
        )}
      </span>
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-testid="feed-skeleton">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}
