"use client";

// RELEASE BURST — khoảnh khắc HS được lắng nghe (stage moment #3, docs/motion-architecture.md §3, §9).
// ORCHESTRATOR 3-tier (chọn runtime, xem burst-tier.ts):
//   • reduced [LAW]    — DOM-fade tĩnh (mono caseCode + serif). KHÔNG particle (motion §7).
//   • mid     [PATTERN] — Canvas 2D dots (mobile/máy yếu), nhẹ, KHÔNG three.
//   • high    [ONE-OFF] — R3F GPU particles (curl-noise) — chunk three TÁCH RIÊNG, nạp KHI tier=high
//                         (motion §6/§8: three KHÔNG vào ops bundle, KHÔNG cả chunk orchestrator này).
// DOM confirmation LUÔN render = vật mang nghĩa DUY NHẤT; lớp particle chỉ TRANG TRÍ (aria-hidden,
// pointer-events-none). SR nghe xác nhận qua FOCUS tiêu đề lúc mount (đọc accessible name dù opacity 0)
// + aria-describedby trỏ tới <p> caseCode → đọc luôn MÃ hồ sơ (live region tĩnh KHÔNG tự announce, nên
// cơ chế thật là focus+describedby). Tier high lỗi (chunk/WebGL) → ErrorBoundary rơi xuống Canvas 2D
// (§6 graceful degrade). Tải qua dynamic(ssr:false) từ trang → client-only.
import { Component, Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SignalDot } from "@/components/ui/SignalDot";
import ReleaseBurstCanvas from "./release-burst/ReleaseBurstCanvas";
import { detectBurstTier, type BurstTier } from "./release-burst/burst-tier";

// Chunk three/R3F — nạp CHỈ khi tier=high (ssr:false). KHÔNG import tĩnh ở đây.
const ReleaseBurstStage = dynamic(() => import("./release-burst/ReleaseBurstStage"), { ssr: false });

export interface ReleaseBurstProps {
  /** Case ID server sinh (CASE-YYYY-00001) — KHÔNG tự chế ở FE. */
  caseCode: string;
  /** Đóng moment (vd: điều hướng về danh sách). Tùy chọn. */
  onDone?: () => void;
  /** DEV-only: ép tier để xem từng tầng ở /styleguide/burst. Prod KHÔNG truyền. */
  forceTier?: BurstTier;
}

// ease-emerge (tokens.css) cho reveal — ease-out, KHÔNG spring/bounce.
const EASE_EMERGE = [0.16, 1, 0.3, 1] as const;

// Tier high lỗi runtime (chunk-load/WebGL throw) → rơi xuống fallback (Canvas 2D), §6 graceful degrade.
class StageBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function ReleaseBurst({ caseCode, onDone, forceTier }: ReleaseBurstProps) {
  // Client-only (nạp qua dynamic ssr:false) → tính tier NGAY ở initializer: không flash, không null branch,
  // và reduced được bắt đúng từ render đầu (không lóe motion trước khi resolve — motion §7 LAW).
  const [tier] = useState<BurstTier>(() => forceTier ?? detectBurstTier());

  // Burst là lời xác nhận DUY NHẤT (không toast) → KHÔNG được câm với SR. Focus tiêu đề khi mount đọc
  // accessible name (dù opacity 0); aria-describedby gắn <p> caseCode để SR đọc kèm MÃ hồ sơ (payload).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const caseCodeId = useId();
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const choreographed = tier === "high" || tier === "mid";
  // DOM text hiện rõ NHƯ particle bắt đầu tan (~0.86s — khớp uReveal start của high tier); reduced → tức thì.
  const base = choreographed ? 0.86 : 0;

  const reveal = (delay: number) =>
    tier === "reduced"
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.32, ease: EASE_EMERGE, delay },
        };

  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Lớp particle — bung→tụ về tâm (nơi DOM caseCode hiện ra). aria-hidden + pointer-events-none. */}
      {choreographed && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {tier === "high" ? (
            <StageBoundary fallback={<ReleaseBurstCanvas caseCode={caseCode} />}>
              <Suspense fallback={null}>
                <ReleaseBurstStage caseCode={caseCode} />
              </Suspense>
            </StageBoundary>
          ) : (
            <ReleaseBurstCanvas caseCode={caseCode} />
          )}
        </div>
      )}

      {/* DOM confirmation — nguồn nghĩa thật (a11y), nổi trên lớp particle. */}
      <motion.div {...reveal(base)} className="relative z-10">
        <SignalDot tone="signal" size="lg" />
      </motion.div>

      <div role="status" aria-live="polite" className="relative z-10 flex flex-col items-center">
        <motion.p
          {...reveal(base + 0.08)}
          id={caseCodeId}
          className="text-ink-3 mt-8 font-mono text-xs tracking-[0.18em] uppercase"
        >
          {caseCode}
        </motion.p>

        <motion.h2
          {...reveal(base + 0.16)}
          ref={headingRef}
          tabIndex={-1}
          aria-describedby={caseCodeId}
          className="text-ink mt-3 max-w-md font-serif text-2xl leading-snug outline-none md:text-3xl"
        >
          Tiếng nói của bạn đã được ghi nhận.
        </motion.h2>
      </div>

      {onDone && (
        <motion.div {...reveal(base + 0.24)} className="relative z-10 mt-10">
          <Button variant="secondary" onClick={onDone}>
            Xong
          </Button>
        </motion.div>
      )}
    </div>
  );
}
