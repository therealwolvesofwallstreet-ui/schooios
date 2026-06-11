"use client";

// Trang TRUNG TÂM nghiệp vụ: hồ sơ sống trên Spine + rail hành động/meta. Desktop = [Spine | rail]
// (rail sticky); mobile stack header→spine→actions (grid-cols-1). States: loading (skeleton "thở") ·
// 404 ĐỒNG NHẤT (serif 1 dòng — không phân biệt không-tồn-tại vs không-quyền) · lỗi tải (điềm tĩnh +
// Thử lại). Quyền hiển thị do từng component con tự quyết (panel/composer null khi không phép).
import Link from "next/link";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import { CaseHeader } from "./CaseHeader";
import { Spine } from "./Spine";
import { CaseActionPanel } from "./CaseActionPanel";
import { CommentComposer } from "./CommentComposer";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/case-display";
import type { CaseDetail } from "@/lib/api-types";

export function CaseDetailView({ caseId }: { caseId: string }) {
  const { case: detail, isLoading, isError, notFound, refetch } = useCaseDetail(caseId);

  if (isLoading) return <DetailSkeleton />;
  if (notFound) return <NotFoundState />;
  if (isError || !detail) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="mx-auto max-w-5xl py-10">
      <CaseHeader detail={detail} />
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-8">
          <Spine detail={detail} />
          <CommentComposer caseId={detail.id} />
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <CaseActionPanel detail={detail} />
          <CaseMeta detail={detail} />
        </aside>
      </div>
    </div>
  );
}

function CaseMeta({ detail }: { detail: CaseDetail }) {
  const rows: Array<[string, string]> = [
    ["Loại", detail.category.name],
    ["Nơi", detail.locationRef ? `${detail.locationRef.code} · ${detail.locationRef.name}` : "—"],
    ["Người báo", detail.createdBy.name],
    ["Phụ trách", detail.assignedTo?.name ?? "Chưa giao"],
    ["Tạo lúc", formatDateTime(detail.createdAt)],
  ];
  return (
    <Card>
      <h2 className="text-ink-3 mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">Hồ sơ</h2>
      <dl className="flex flex-col gap-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-3 shrink-0 text-xs">{label}</dt>
            <dd className="text-ink text-right text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl py-10">
      <div className="flex flex-col gap-4 pl-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <div className="mt-10 flex flex-col gap-6 pl-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-5/6" />
        <Skeleton className="h-14 w-4/6" />
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 py-24">
      <h1 className="text-ink font-serif text-2xl leading-snug">Không tìm thấy hồ sơ này.</h1>
      <p className="text-ink-3 text-sm">
        Có thể hồ sơ không tồn tại, hoặc nằm ngoài tầm bạn được xem.
      </p>
      <Link
        href="/"
        className="text-ink-2 hover:text-ink focus-visible:outline-ink rounded-sm text-sm underline-offset-4 transition-colors duration-150 ease-quiet hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        ← Về trang chủ
      </Link>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-24">
      <p className="text-ink-3 font-mono text-xs">Không tải được hồ sơ.</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-ink-2 hover:text-ink focus-visible:outline-ink rounded-sm text-xs underline-offset-4 transition-colors duration-150 ease-quiet hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Thử lại
      </button>
    </div>
  );
}
