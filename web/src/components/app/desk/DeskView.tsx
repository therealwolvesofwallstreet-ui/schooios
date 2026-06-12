"use client";

// /desk — "BÀN LÀM VIỆC" (STAFF). 1 fetch useCaseList(limit:100): scope STAFF ở server =
// {assignedToId=me} ∪ {status∈NEW,TRIAGED}. Sau đó CHIA BUCKET phía CLIENT — đây là các LĂNG KÍNH/facet
// trên union ĐÃ-LỌC, KHÔNG nới quyền (server là rào chắn; FE KHÔNG tự lọc sensitive / sort / paginate).
// Một vụ có thể nằm nhiều bucket (lăng kính chồng nhau — chủ ý). "Tồn đọng" = tier 'stale' (case-aging,
// theo createdAt CLIENT, KHÔNG SLA server). "reopened" BỎ (cần statusHistory — defer). Nav chỉ hiện mục
// với STAFF; role khác vào thẳng URL chỉ thấy phần server cho phép. KHÔNG reduced-motion.
import { useSession } from "@/hooks/useSession";
import { useCaseList } from "@/hooks/useCaseList";
import { caseAge } from "@/lib/case-aging";
import { CaseRow } from "@/components/app/cases/CaseRow";
import { Hairline } from "@/components/ui/Hairline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/app/states";
import type { CaseListItem } from "@/lib/api-types";

const isOpen = (c: CaseListItem) => c.status !== "RESOLVED" && c.status !== "CLOSED";

export function DeskView() {
  const { user } = useSession();
  const me = user?.id ?? "";
  const { cases, isLoading, isError, refetch } = useCaseList(me || "desk", { limit: 100 });

  const mine = cases.filter((c) => c.assignedToId === me);
  const assigned = mine.filter(isOpen);
  const waiting = mine.filter((c) => c.status === "WAITING_FOR_USER");
  const priority = mine.filter(
    (c) => isOpen(c) && (c.priority === "HIGH" || c.priority === "CRITICAL"),
  );
  const emergency = mine.filter((c) => isOpen(c) && c.isEmergency);
  const stale = mine.filter((c) => isOpen(c) && caseAge(c.createdAt, c.status).tier === "stale");
  const unclaimed = cases.filter(
    (c) => (c.status === "NEW" || c.status === "TRIAGED") && c.assignedToId == null,
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink font-serif text-3xl leading-snug">Bàn làm việc</h1>
        <p className="text-ink-3 text-sm">Việc bạn đang gánh, theo từng lăng kính.</p>
      </header>

      {isLoading ? (
        <DeskSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} message="Không tải được bàn làm việc." />
      ) : (
        <>
          <Bucket
            k="assigned"
            title="Được giao cho tôi"
            cases={assigned}
            empty="Bạn chưa được giao vụ nào đang mở."
          />
          <Bucket
            k="waiting"
            title="Chờ phản hồi"
            cases={waiting}
            empty="Không có vụ nào đang chờ phản hồi."
          />
          <Bucket
            k="priority"
            title="Ưu tiên cao"
            cases={priority}
            empty="Không có vụ ưu tiên cao nào của bạn."
          />
          <Bucket k="emergency" title="Khẩn" cases={emergency} empty="Không có vụ khẩn nào của bạn." />
          <Bucket k="stale" title="Tồn đọng" cases={stale} empty="Không có vụ tồn đọng nào." />
          <Bucket
            k="unclaimed"
            title="Đang chờ nhận"
            cases={unclaimed}
            empty="Không có vụ nào đang chờ nhận."
          />
        </>
      )}
    </div>
  );
}

function Bucket({
  k,
  title,
  cases,
  empty,
}: {
  k: string;
  title: string;
  cases: CaseListItem[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-4" data-testid={`desk-bucket-${k}`}>
      <h2 className="text-ink-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase">
        {title}
        <span className="text-ink-3/70 tabular-nums">· {cases.length}</span>
      </h2>
      {cases.length === 0 ? (
        <EmptyState message={empty} className="py-6" />
      ) : (
        <ul className="flex flex-col">
          {cases.map((c, i) => (
            <li key={c.id} className="flex flex-col">
              {i > 0 && <Hairline />}
              <CaseRow c={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeskSkeleton() {
  return (
    <div className="flex flex-col gap-12" data-testid="desk-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-4">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}
