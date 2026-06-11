"use client";

// TRANG CHỦ ADMIN/AUDITOR — "Đài quan sát": số ĐÀI-KỶ-NIỆM mono lớn + sổ hàng đợi (ledger) + rail
// loại/nơi + PulseField (placeholder seam, F4 thả bản sống vào). KHÔNG donut/chart-junk (FRONTEND.md
// Dashboard metric grammar). Đây là FILE DUY NHẤT import useDashboardMetrics ⇒ STAFF/STUDENT 0 call.
//
// ⚠ KEY DRIFT (đọc đúng kẻo bug): byStatus/byPriority → `_count`; byCategory/byLocation → `count`.
// ⚠ ĐỌC PHÒNG THỦ: số ?? 0, mảng ?? [] → thiếu field/mảng (partial response) ra EmptyState ô đó,
//   KHÔNG sập trang, KHÔNG để undefined lọt DOM. Lỗi tải toàn cục = ErrorState (điềm tĩnh, KHÔNG đỏ).
// readOnly=true (AUDITOR): KHÔNG affordance hành động (chỉ-xem); ADMIN giữ nguyên ngữ nghĩa điều phối.
import dynamic from "next/dynamic";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Card } from "@/components/ui/Card";
import { Hairline } from "@/components/ui/Hairline";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/app/states";
import { STATUS_TONE } from "@/components/ui/status-theme";
import { STATUS_LABEL, PRIORITY_LABEL, STATUS_ORDER, PRIORITY_ORDER } from "@/lib/case-display";
import type { CaseStatus, CasePriority } from "@/lib/api-types";

// PulseField nạp qua dynamic(ssr:false) — giữ mọi ruột động (canvas/three ở F4) NGOÀI server bundle,
// mirror ReleaseBurst. Placeholder hiện tại nhẹ, nhưng seam sẵn cho bản sống.
const PulseField = dynamic(() => import("@/components/motion/PulseField"), { ssr: false });

export function AdminHome({ readOnly = false }: { readOnly?: boolean }) {
  const { metrics, isLoading, isError, refetch } = useDashboardMetrics();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !metrics) return <ErrorState onRetry={() => void refetch()} />;

  // Đọc phòng thủ — partial response không được phép sập trang.
  const byStatus = metrics.byStatus ?? [];
  const byPriority = metrics.byPriority ?? [];
  const byCategory = metrics.byCategory ?? [];
  const byLocation = metrics.byLocation ?? [];

  const statusCount = (s: CaseStatus) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const priorityCount = (p: CasePriority) => byPriority.find((b) => b.priority === p)?._count ?? 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink font-serif text-3xl leading-snug">Đài quan sát</h1>
        <p className="text-ink-3 text-sm">
          {readOnly ? "Chế độ chỉ xem — toàn cảnh hệ thống." : "Toàn cảnh hệ thống sự vụ."}
        </p>
      </header>

      {/* Số đài-kỷ-niệm — mono lớn, signal đỏ CHỈ cho khẩn đang mở. */}
      <section
        data-testid="memorial-numbers"
        className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-5"
      >
        <MemorialNumber label="Tổng vụ" value={metrics.totalCases ?? 0} />
        <MemorialNumber label="Mới hôm nay" value={metrics.newToday ?? 0} />
        <MemorialNumber label="Khẩn đang mở" value={metrics.emergencyOpen ?? 0} signal />
        <MemorialNumber label="Chưa giao" value={metrics.unassigned ?? 0} />
        <MemorialNumber label="Tồn đọng" value={metrics.stale ?? 0} />
      </section>

      {/* PulseField — placeholder seam (parent định kích thước qua className). */}
      <section className="flex flex-col gap-3">
        <h2 className="text-ink-3 font-mono text-[11px] tracking-[0.18em] uppercase">Mạch hệ thống</h2>
        <PulseField metrics={metrics} className="border-line h-40 rounded-md border md:h-48" />
      </section>

      {/* Sổ hàng đợi — ledger hairline, KHÔNG donut. byStatus/byPriority đọc _count. */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Ledger
          title="Theo trạng thái"
          rows={STATUS_ORDER.map((s) => ({
            key: s,
            tone: STATUS_TONE[s],
            label: STATUS_LABEL[s],
            count: statusCount(s),
          }))}
          empty={byStatus.length === 0}
        />
        <Ledger
          title="Theo mức ưu tiên"
          rows={PRIORITY_ORDER.map((p) => ({
            key: p,
            tone: p === "CRITICAL" ? "emergency" : "running",
            label: PRIORITY_LABEL[p],
            count: priorityCount(p),
          }))}
          empty={byPriority.length === 0}
        />
      </section>

      {/* Rail loại/nơi — byCategory/byLocation đọc `count` (KHÔNG _count). Top theo count giảm dần. */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Rail
          title="Theo loại"
          items={[...byCategory]
            .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
            .slice(0, 6)
            .map((c) => ({ key: c.categoryId, label: c.name, count: c.count ?? 0 }))}
        />
        <Rail
          title="Theo nơi"
          items={[...byLocation]
            .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
            .slice(0, 6)
            .map((l) => ({ key: l.locationId, label: `${l.code} · ${l.name}`, count: l.count ?? 0 }))}
          footnote={
            (metrics.unlocated ?? 0) > 0 ? `Chưa rõ nơi: ${metrics.unlocated}` : undefined
          }
        />
      </section>
    </div>
  );
}

function MemorialNumber({
  label,
  value,
  signal = false,
}: {
  label: string;
  value: number;
  signal?: boolean;
}) {
  const hot = signal && value > 0;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2">
        <span
          className={`font-mono text-4xl tabular-nums md:text-5xl ${hot ? "text-signal" : "text-ink"}`}
        >
          {value}
        </span>
        {hot && <SignalDot tone="emergency" size="md" pulse />}
      </span>
      <span className="text-ink-3 text-[11px] tracking-[0.12em] uppercase">{label}</span>
    </div>
  );
}

function Ledger({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { key: string; tone: SignalTone; label: string; count: number }[];
  empty: boolean;
}) {
  return (
    <Card>
      <h2 className="text-ink-3 mb-4 font-mono text-[11px] tracking-[0.18em] uppercase">{title}</h2>
      {empty ? (
        <EmptyState message="Chưa có dữ liệu." className="py-8" />
      ) : (
        <ul className="flex flex-col">
          {rows.map((r, i) => (
            <li key={r.key} className="flex flex-col">
              {i > 0 && <Hairline className="my-2.5" />}
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-2 flex items-center gap-2.5 text-sm">
                  <SignalDot tone={r.tone} size="sm" />
                  {r.label}
                </span>
                <span className="text-ink font-mono text-sm tabular-nums">{r.count}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Rail({
  title,
  items,
  footnote,
}: {
  title: string;
  items: { key: string; label: string; count: number }[];
  footnote?: string;
}) {
  return (
    <Card>
      <h2 className="text-ink-3 mb-4 font-mono text-[11px] tracking-[0.18em] uppercase">{title}</h2>
      {items.length === 0 ? (
        <EmptyState message="Chưa có dữ liệu." className="py-8" />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between gap-4">
              <span className="text-ink-2 line-clamp-1 text-sm">{it.label}</span>
              <span className="text-ink-3 font-mono text-sm tabular-nums">{it.count}</span>
            </li>
          ))}
        </ul>
      )}
      {footnote && <p className="text-ink-3 mt-4 text-xs">{footnote}</p>}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 py-6" data-testid="dashboard-skeleton">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-40 w-full md:h-48" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
