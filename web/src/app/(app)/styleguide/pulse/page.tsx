"use client";

// DEV harness — xem PULSEFIELD (spectacle moment #3) cô lập để verify 3-tier, KHÔNG cần /dashboard thật.
//   high = desktop + WebGL2 (auto) · mid = mobile/390 (auto) · reduced = ?reduced=1 (ép reducedMotion).
// (detectStageTier KHÔNG xét prefers-reduced-motion — owner "immersive cho mọi người" — nên reduced chỉ
//  tới qua prop reducedMotion.) Nạp PulseField qua dynamic ssr:false y HỆT AdminHome (tránh hydration).
// KHÔNG phải màn nghiệp vụ; auth gate qua proxy như mọi route (app).
import dynamic from "next/dynamic";
import { useHydrated } from "@/hooks/useHydrated";
import type { DashboardResponse } from "@/lib/api-types";

const PulseField = dynamic(() => import("@/components/motion/PulseField"), { ssr: false });

// Metrics MẪU — đủ giàu để thấy mật độ + node khẩn (emergencyOpen) + tông warm. KHÔNG gọi API.
const SAMPLE: DashboardResponse = {
  totalCases: 64,
  newToday: 7,
  emergencyOpen: 3,
  unassigned: 11,
  stale: 4,
  byStatus: [
    { status: "NEW", _count: 12 },
    { status: "IN_PROGRESS", _count: 9 },
    { status: "RESOLVED", _count: 18 },
  ],
  byPriority: [{ priority: "HIGH", _count: 6 }],
  byCategory: [{ categoryId: "c1", name: "Cơ sở vật chất", count: 20 }],
  byLocation: [{ locationId: "l1", code: "A1", name: "Sân trước", count: 8 }],
  unlocated: 3,
};

function parseReduced(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("reduced") === "1";
}

export default function PulsePreviewPage() {
  // Query (?reduced) chỉ có ở client → gate hydrate (useSyncExternalStore, KHÔNG setState-in-effect):
  // SSR + first-paint render TRUNG TÍNH (placeholder + "…") khớp nhau ⇒ KHÔNG hydration mismatch (#418).
  // Mount PulseField CHỈ sau hydrate ⇒ reducedMotion đúng ngay từ render đầu (tier chốt 1 lần lúc mount).
  const hydrated = useHydrated();
  const reduced = hydrated && parseReduced();
  const boxClass = "border-line h-48 rounded-md border md:h-56";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-10" data-testid="pulse-harness">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-ink-3 font-mono text-xs">
          pulsefield · {!hydrated ? "…" : reduced ? "reduced (forced)" : "auto (high desktop / mid mobile)"}
        </span>
        <a className="text-ink-2 hover:text-ink text-xs underline-offset-4 hover:underline" href="?">
          auto
        </a>
        <a
          className="text-ink-2 hover:text-ink text-xs underline-offset-4 hover:underline"
          href="?reduced=1"
        >
          reduced
        </a>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-ink-3 font-mono text-[11px] tracking-[0.18em] uppercase">Mạch hệ thống</h2>
        {hydrated ? (
          <PulseField
            metrics={SAMPLE}
            reducedMotion={reduced || undefined}
            className={boxClass}
          />
        ) : (
          <div className={boxClass} />
        )}
      </section>
    </div>
  );
}
