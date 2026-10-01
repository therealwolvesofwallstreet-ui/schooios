"use client";

// /emergency — TUYẾN KHẨN (ADMIN/STAFF/AUDITOR; STUDENT → 403 → PermissionDenied, KHÔNG render lane).
// Giọng "takeover" GỌN cho vận hành: chrome khẩn THƯỜNG TRỰC trên bề mặt Depth (Cowhide) + nhịp đỏ LTT
// "thở" (SignalDot pulse — opt-out duy nhất = globals.css reduced-motion; KHÔNG gate runtime). Danh sách
// tái dùng MiniSpine (mọi case isEmergency → dot đỏ LTT pulse) → điều hướng hồ sơ. Toggle ?activeOnly
// SERVER-DRIVEN (loại RESOLVED/CLOSED). Sensitivity ĐÃ gate ở server — FE KHÔNG tự lọc. States dùng chung.
import { useState } from "react";
import { useEmergencyQueue } from "@/hooks/useEmergencyQueue";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, PermissionDenied } from "@/components/app/states";
import { MiniSpine } from "@/components/app/home/MiniSpine";
import { cn } from "@/lib/cn";

export function EmergencyView() {
  // Mặc định = ĐANG MỞ: tuyến khẩn ưu tiên vụ chưa giải quyết. server-driven qua ?activeOnly.
  const [activeOnly, setActiveOnly] = useState(true);
  const { cases, isLoading, isError, forbidden, refetch } = useEmergencyQueue(activeOnly);

  // Quyền: server là chân lý. STUDENT → 403 → màn ngoài-quyền (KHÔNG render lane).
  if (forbidden) return <PermissionDenied />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      {/* Đầu trang cùng ngữ pháp các trang khác (tiêu đề + mô tả); số vụ là điểm nhấn đỏ DUY NHẤT. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-ink font-serif text-3xl leading-snug">Vụ việc khẩn cấp</h1>
          <p className="text-ink-3 text-sm">Những vụ việc được ưu tiên khẩn cấp xử lý</p>
        </div>
        <p data-testid="emergency-count" className="flex shrink-0 items-baseline gap-2">
          <span
            className={cn(
              "font-display text-4xl font-semibold tabular-nums",
              cases.length > 0 ? "text-emergency" : "text-ink-3",
            )}
          >
            {cases.length}
          </span>
          <span className="text-ink-3 text-sm">vụ</span>
        </p>
      </header>

      {/* Toggle ?activeOnly — SERVER-DRIVEN (không tự lọc FE). */}
      <div
        role="group"
        aria-label="Lọc vụ việc khẩn cấp"
        data-testid="emergency-filter"
        className="flex items-center gap-5"
      >
        <FilterTab active={activeOnly} onClick={() => setActiveOnly(true)} testid="filter-active">
          Đang mở
        </FilterTab>
        <FilterTab active={!activeOnly} onClick={() => setActiveOnly(false)} testid="filter-all">
          Tất cả
        </FilterTab>
      </div>

      {isLoading ? (
        <LaneSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} message="Không tải được vụ việc khẩn cấp" />
      ) : cases.length === 0 ? (
        <EmptyState
          message={
            activeOnly ? "Không có vụ khẩn cấp nào đang mở" : "Chưa có vụ khẩn cấp nào"
          }
        />
      ) : (
        <div data-testid="emergency-list">
          <MiniSpine cases={cases} />
        </div>
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

function LaneSkeleton() {
  return (
    <div className="ml-1.5 flex flex-col gap-5 pl-6" data-testid="emergency-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
