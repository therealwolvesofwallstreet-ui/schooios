"use client";
// STAGE — scaffold tổng quát cho MỌI sân khấu immersive (login Threshold, hero, …). 3-tier
// (stage-tier.ts) tách lớp TRANG TRÍ (WebGL/Canvas, aria-hidden) khỏi lớp NỘI DUNG (children,
// z-10, tương tác). DOM children LUÔN render ở mọi tier = vật mang nghĩa DUY NHẤT (motion §7 LAW):
//   • high   → <StageBoundary><Suspense><High/></Suspense></StageBoundary> (lỗi → mid/reduced).
//   • mid    → <Mid/> (hoặc reduced nếu không có mid).
//   • reduced→ render `reduced` tĩnh, KHÔNG canvas (prefers-reduced-motion / SSR).
// high/mid do CALLER bọc sẵn dynamic(ssr:false) → three/R3F KHÔNG vào server bundle (motion §6/§8).
import { Suspense, useMemo, type ComponentType, type ReactNode } from "react";
import { StageBoundary } from "./StageBoundary";
import { detectStageTier, type StageTier } from "./stage-tier";
import { useHydrated } from "@/hooks/useHydrated";

export interface StageProps {
  /** Tier high — R3F/WebGL. Caller truyền vào ĐÃ bọc dynamic(ssr:false). */
  high: ComponentType;
  /** Tier mid — Canvas 2D (tùy chọn). Caller bọc dynamic(ssr:false). Thiếu → dùng reduced. */
  mid?: ComponentType;
  /** Tier reduced — DOM tĩnh, KHÔNG canvas. Cũng là fallback cuối cùng. */
  reduced?: ReactNode;
  /** Nội dung mang nghĩa (form, CTA…) — LUÔN render trên lớp z-10, tương tác được. */
  children?: ReactNode;
  /** DEV-only: ép tier để xem từng tầng. Prod KHÔNG truyền. */
  forceTier?: StageTier;
  /** Class cho container (kích thước/relative/overflow-hidden). */
  className?: string;
}

export function Stage({ high: High, mid: Mid, reduced, children, forceTier, className }: StageProps) {
  // #418 FIX (F5c): tier hydration-gated. Render client ĐẦU TIÊN (useHydrated=false) → "reduced", KHỚP
  // server (detectStageTier SSR→"reduced") ⇒ 0 hydration mismatch. Sau hydrate → tier NĂNG LỰC thật.
  // Children (z-10) LUÔN render BẤT KỂ tier (dưới) → KHÔNG remount (autoFocus input KHÔNG re-fire).
  const hydrated = useHydrated();
  const tier: StageTier = useMemo(
    () => forceTier ?? (hydrated ? detectStageTier() : "reduced"),
    [forceTier, hydrated],
  );

  // Lớp TRANG TRÍ: WebGL/Canvas dưới nội dung, aria-hidden + pointer-events-none (SR bỏ qua, không
  // chắn click form). reduced KHÔNG render canvas nào.
  let decoration: ReactNode = null;
  if (tier === "high") {
    const fallback: ReactNode = Mid ? <Mid /> : (reduced ?? null);
    decoration = (
      <StageBoundary fallback={fallback}>
        <Suspense fallback={reduced ?? null}>
          <High />
        </Suspense>
      </StageBoundary>
    );
  } else if (tier === "mid") {
    decoration = Mid ? <Mid /> : (reduced ?? null);
  } else {
    decoration = reduced ?? null;
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {decoration}
      </div>
      {/* Nội dung mang nghĩa — nổi trên lớp trang trí, tương tác được. */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
