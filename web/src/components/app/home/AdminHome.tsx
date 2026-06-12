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
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useHydrated } from "@/hooks/useHydrated";
import { EASE_EMERGE_BEZIER } from "@/lib/cubic-bezier";
import { Card } from "@/components/ui/Card";
import { Hairline } from "@/components/ui/Hairline";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/app/states";
import { STATUS_TONE } from "@/components/ui/status-theme";
import { STATUS_LABEL, PRIORITY_LABEL, STATUS_ORDER, PRIORITY_ORDER } from "@/lib/case-display";
import { cn } from "@/lib/cn";
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

      {/* Xu hướng — Chart1 = thanh phân-đoạn trạng thái (KHÔNG donut/canvas/lib; thuần SVG/CSS). Mỗi
          đoạn → /cases?status=… (drill-down). Ledger "Theo trạng thái" bên dưới là chú-giải-số. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-ink-3 font-mono text-[11px] tracking-[0.18em] uppercase">Xu hướng</h2>
        <StatusBar byStatus={byStatus} />
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

      {/* Loại/nơi — byCategory/byLocation đọc `count` (KHÔNG _count). Top theo count giảm dần.
          Chart2 = thanh tỉ-lệ "Theo loại" (THAY Rail cũ), mỗi hàng → /cases?category=…&cat=…. */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <CategoryBars
          items={[...byCategory]
            .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
            .slice(0, 6)
            .map((c) => ({ id: c.categoryId, name: c.name, count: c.count ?? 0 }))}
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
      {/* Xu hướng (StatusBar) — giữ skeleton đại diện để skeleton→content KHÔNG nhảy layout. */}
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}

// tone → màu nền (mirror SignalDot.TONE, token-only — 0 hex). Dùng tô đoạn thanh trạng thái.
const TONE_FILL: Record<SignalTone, string> = {
  signal: "bg-signal",
  gold: "bg-gold",
  running: "bg-ink",
  emergency: "bg-emergency",
  dormant: "bg-line-2",
};

// Chart1 — thanh phân-đoạn theo trạng thái (width đoạn ∝ _count/Σ_count). KHÔNG donut/canvas. Mỗi đoạn
// là 1 Link → /cases?status=… . Width grow gate theo HYDRATE (SSR/static = không animate → 0 mismatch).
function StatusBar({ byStatus }: { byStatus: { status: CaseStatus; _count: number }[] }) {
  const staticFirst = !useHydrated();
  const total = byStatus.reduce((s, b) => s + (b._count ?? 0), 0);
  const countOf = (s: CaseStatus) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const segments = STATUS_ORDER.map((s) => ({ s, count: countOf(s) })).filter((x) => x.count > 0);

  return (
    <Card>
      <h2 className="text-ink-3 mb-4 font-mono text-[11px] tracking-[0.18em] uppercase">
        Phân bố trạng thái
      </h2>
      {total === 0 ? (
        <EmptyState message="Chưa có dữ liệu." className="py-8" />
      ) : (
        <div
          data-testid="chart-status"
          role="group"
          aria-label="Phân bố trạng thái — chọn một đoạn để mở danh sách"
          className="bg-sunken flex h-8 w-full overflow-hidden rounded-md"
        >
          {segments.map(({ s, count }, i) => (
            <motion.div
              key={s}
              className="h-full min-w-[3px]"
              initial={staticFirst ? false : { width: 0 }}
              animate={{ width: `${(count / total) * 100}%` }}
              transition={{ duration: 0.6, ease: EASE_EMERGE_BEZIER, delay: Math.min(i * 0.05, 0.3) }}
            >
              <Link
                href={`/cases?status=${s}`}
                title={`${STATUS_LABEL[s]}: ${count}`}
                aria-label={`${STATUS_LABEL[s]}: ${count} vụ`}
                className={cn(
                  "focus-visible:outline-ink block h-full w-full transition-opacity duration-150 ease-quiet hover:opacity-85 focus-visible:outline-2 focus-visible:-outline-offset-2",
                  TONE_FILL[STATUS_TONE[s]],
                )}
              />
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Chart2 — thanh tỉ-lệ top loại (width ∝ count/max). Fill gold trên track sunken. Mỗi hàng → /cases
// ?category=…&cat=… (facet client ở AllCasesView). Width grow gate theo HYDRATE.
function CategoryBars({ items }: { items: { id: string; name: string; count: number }[] }) {
  const staticFirst = !useHydrated();
  const max = items.reduce((m, it) => Math.max(m, it.count), 0) || 1;

  return (
    <Card>
      <h2 className="text-ink-3 mb-4 font-mono text-[11px] tracking-[0.18em] uppercase">Theo loại</h2>
      {items.length === 0 ? (
        <EmptyState message="Chưa có dữ liệu." className="py-8" />
      ) : (
        <ul data-testid="chart-category" className="flex flex-col gap-3">
          {items.map((it, i) => (
            <li key={it.id}>
              <Link
                href={`/cases?category=${it.id}&cat=${encodeURIComponent(it.name)}`}
                className="focus-visible:outline-ink group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="mb-1 flex items-center justify-between gap-4">
                  <span className="text-ink-2 group-hover:text-ink line-clamp-1 text-sm transition-colors duration-150 ease-quiet">
                    {it.name}
                  </span>
                  <span className="text-ink-3 shrink-0 font-mono text-sm tabular-nums">
                    {it.count}
                  </span>
                </div>
                <div className="bg-sunken h-1.5 w-full overflow-hidden rounded-full">
                  <motion.div
                    className="bg-gold h-full rounded-full"
                    initial={staticFirst ? false : { width: 0 }}
                    animate={{ width: `${(it.count / max) * 100}%` }}
                    transition={{
                      duration: 0.6,
                      ease: EASE_EMERGE_BEZIER,
                      delay: Math.min(i * 0.05, 0.3),
                    }}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
