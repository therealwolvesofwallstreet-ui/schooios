"use client";

// /report — "BÁO CÁO CỦA TÔI": danh sách ĐẦY ĐỦ case do user tạo (server `?mine=true` → AND createdById,
// vẫn trong role-where ⇒ KHÔNG nới quyền; phân trang SERVER). Khác StudentHome (preview "gần đây", limit
// nhỏ, client-filter — không đầy đủ). TÁI DÙNG useCaseList (KHÔNG hook mới). Hàng = ledger hairline +
// signal-gutter theo trạng thái (NEW=signal "đang chờ" · đang xử lý=gold · RESOLVED/CLOSED=dormant) + mono
// caseCode + StatusPill + title → hồ sơ. Mọi role vào được (nav chỉ hiện mục cho STUDENT; server scope
// theo createdById nên role khác vào thẳng cũng chỉ thấy case HỌ tạo — không rò). KHÔNG reduced-motion.
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { useCaseList } from "@/hooks/useCaseList";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { StatusPill } from "@/components/ui/StatusPill";
import { Hairline } from "@/components/ui/Hairline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Pager } from "@/components/ui/Pager";
import { AgingBadge } from "@/components/ui/AgingBadge";
import { ErrorState } from "@/components/app/states";
import type { CaseListItem, CaseStatus } from "@/lib/api-types";

const PAGE_SIZE = 20;

// signal-gutter theo trạng thái: NEW = signal (vừa cất, đang chờ) · RESOLVED/CLOSED = dormant (đã khép) ·
// còn lại (đang chạy vòng đời) = gold.
function gutterTone(status: CaseStatus): SignalTone {
  if (status === "NEW") return "signal";
  if (status === "RESOLVED" || status === "CLOSED") return "dormant";
  return "gold";
}

export function MyReportsView() {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  // scope = user.id (cache key chống va chạm chéo-role — useCaseList §); request gửi ?mine=true.
  const { cases, total, totalPages, isLoading, isError, refetch } = useCaseList(user?.id ?? "report", {
    mine: true,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      <header className="flex flex-col items-start gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-ink font-serif text-3xl leading-snug">Báo cáo của tôi</h1>
          <p className="text-ink-3 text-sm">Những tiếng nói bạn đã cất lên, theo dòng thời gian.</p>
        </div>
        <Link href="/report/new">
          <Button variant="primary" size="md">
            Báo cáo vấn đề
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <ReportsSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} message="Không tải được báo cáo của bạn." />
      ) : cases.length === 0 ? (
        <EmptyState
          message="Bạn chưa cất tiếng nói nào."
          action={
            <Link href="/report/new">
              <Button variant="secondary" size="sm">
                Báo cáo vấn đề
              </Button>
            </Link>
          }
        />
      ) : (
        <section className="flex flex-col gap-4">
          <p className="text-ink-3 font-mono text-[11px] tracking-[0.12em] tabular-nums">{total} báo cáo</p>
          <ul data-testid="my-reports-list" className="flex flex-col">
            {cases.map((c, i) => (
              <li key={c.id} className="flex flex-col">
                {i > 0 && <Hairline />}
                <ReportRow c={c} />
              </li>
            ))}
          </ul>
          <Pager page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      )}
    </div>
  );
}

function ReportRow({ c }: { c: CaseListItem }) {
  const tone = gutterTone(c.status);
  return (
    <Link
      href={`/cases/${c.id}`}
      className="focus-visible:outline-ink group hover:bg-sunken -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <SignalDot tone={tone} size="sm" pulse={tone === "signal"} />
      <span className="text-ink-3 shrink-0 font-mono text-[11px] tracking-[0.12em]">{c.caseCode}</span>
      <StatusPill status={c.status} className="shrink-0" />
      <span className="text-ink line-clamp-1 min-w-0 flex-1 text-sm">{c.title}</span>
      <AgingBadge createdAt={c.createdAt} status={c.status} />
    </Link>
  );
}

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-5" data-testid="my-reports-skeleton">
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
