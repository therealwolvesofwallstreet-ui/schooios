"use client";

// /cases — "DUYỆT TẤT CẢ VỤ VIỆC" (đích drill-down của dashboard). ADMIN/AUDITOR thấy toàn dòng sự vụ;
// role khác vào thẳng URL chỉ thấy phần SERVER cho phép (nav chỉ ẩn mục — server là rào chắn thật,
// FE-check chỉ là UX). Lọc status/khẩn = SERVER param qua useCaseList (?status / ?isEmergency) — FE
// KHÔNG client-sort/paginate; đổi filter → page về 1. `initial` (status/emergency/category/cat) đọc từ
// shell để mở sẵn lát drill-down (status validate theo enum, sai → bỏ qua, KHÔNG 400 FE).
//
// NGOẠI LỆ client-filter DUY NHẤT (§2) = category FACET: API không có ?categoryId, nên khi `category`
// set → fetch trang 100 rồi LỌC CLIENT `c.categoryId===category` TRÊN TRANG HIỆN TẠI. Đây là facet PHỤ,
// KHÔNG tái dựng sort/paginate/sensitive (server vẫn gate tầm-nhìn + thứ tự). KHÔNG reduced-motion.
import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { useSession } from "@/hooks/useSession";
import { useCaseList } from "@/hooks/useCaseList";
import { CaseRow } from "./CaseRow";
import { Hairline } from "@/components/ui/Hairline";
import { SignalDot } from "@/components/ui/SignalDot";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pager } from "@/components/ui/Pager";
import { ErrorState } from "@/components/app/states";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/case-display";
import { cn } from "@/lib/cn";
import type { CaseStatus } from "@/lib/api-types";

const PAGE_SIZE = 20;
const FACET_LIMIT = 100;

export interface AllCasesInitial {
  status?: string;
  emergency?: string;
  category?: string;
  cat?: string;
}

function validStatus(s: string | undefined): CaseStatus | null {
  return s && (STATUS_ORDER as readonly string[]).includes(s) ? (s as CaseStatus) : null;
}

export function AllCasesView({ initial = {} }: { initial?: AllCasesInitial }) {
  const { user } = useSession();
  const [status, setStatus] = useState<CaseStatus | null>(() => validStatus(initial.status));
  const [emergencyOnly, setEmergencyOnly] = useState(initial.emergency === "true");
  // Category facet (client-filter ngoại lệ — xem header): id lọc + tên hiển thị, gỡ được.
  const [category, setCategory] = useState<string | null>(initial.category ?? null);
  const catName = initial.cat ?? null;
  const [page, setPage] = useState(1);

  const facetActive = !!category;
  const { cases, total, totalPages, isLoading, isError, refetch } = useCaseList(
    user?.id ?? "all-cases",
    {
      status: status ?? undefined,
      isEmergency: emergencyOnly ? true : undefined,
      page: facetActive ? 1 : page,
      limit: facetActive ? FACET_LIMIT : PAGE_SIZE,
    },
  );

  // Lọc theo loại CHỈ trên lát hiện tại — KHÔNG tự sort/paginate (server giữ thứ tự + tầm-nhìn).
  const visible = facetActive ? cases.filter((c) => c.categoryId === category) : cases;

  function pickStatus(s: CaseStatus | null) {
    setStatus(s);
    setPage(1);
  }
  function toggleEmergency() {
    setEmergencyOnly((v) => !v);
    setPage(1);
  }
  function clearCategory() {
    setCategory(null);
    setPage(1);
  }

  const emptyMessage = facetActive
    ? "Không có vụ nào thuộc loại này trên trang hiện tại."
    : emergencyOnly
      ? "Không có vụ khẩn nào ở lát này."
      : status
        ? `Không có vụ nào ở trạng thái "${STATUS_LABEL[status]}".`
        : "Chưa có vụ việc nào.";

  const chip =
    "focus-visible:outline-ink inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink font-serif text-3xl leading-snug">Tất cả vụ việc</h1>
        <p className="text-ink-3 text-sm">
          Toàn bộ sự vụ được lọc theo trạng thái, mức ưu tiên và thể loại
        </p>
      </header>

      {/* Lọc SERVER-DRIVEN: chip "Tất cả" + 7 trạng thái + chip khẩn (+ facet loại nếu drill-down). */}
      <div
        role="group"
        aria-label="Lọc vụ việc"
        data-testid="all-cases-filter"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <FilterTab active={status === null} onClick={() => pickStatus(null)} testid="filter-all">
            Tất cả
          </FilterTab>
          {STATUS_ORDER.map((s) => (
            <FilterTab
              key={s}
              active={status === s}
              onClick={() => pickStatus(s)}
              testid={`filter-${s.toLowerCase()}`}
            >
              {STATUS_LABEL[s]}
            </FilterTab>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleEmergency}
            data-testid="filter-emergency"
            aria-pressed={emergencyOnly}
            className={cn(
              chip,
              emergencyOnly
                ? "border-signal text-signal font-medium"
                : "border-line text-ink-3 hover:text-ink-2",
            )}
          >
            <SignalDot tone="emergency" size="sm" pulse={emergencyOnly} />
            Chỉ khẩn
          </button>
          {facetActive && (
            <button
              type="button"
              onClick={clearCategory}
              data-testid="facet-category"
              className={cn(chip, "border-line text-ink-2 hover:text-ink")}
            >
              Loại: {catName ?? "—"}
              <X size={11} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {facetActive && (
        <p className="text-ink-3 font-mono text-[11px] tracking-[0.12em]">
          Lọc theo loại trên trang hiện tại
        </p>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} message="Không tải được danh sách vụ việc." />
      ) : visible.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <section className="flex flex-col gap-4">
          <p className="text-ink-3 font-mono text-[11px] tracking-[0.12em] tabular-nums">
            {facetActive ? `${visible.length} vụ · lát hiện tại` : `${total} vụ`}
          </p>
          <ul data-testid="all-cases-list" className="flex flex-col">
            {visible.map((c, i) => (
              <li key={c.id} className="flex flex-col">
                {i > 0 && <Hairline />}
                <CaseRow c={c} />
              </li>
            ))}
          </ul>
          {/* Facet = lát hiện tại → KHÔNG phân trang server (note đã giải thích). */}
          {!facetActive && <Pager page={page} totalPages={totalPages} onPageChange={setPage} />}
        </section>
      )}
    </div>
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

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-5" data-testid="all-cases-skeleton">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}
