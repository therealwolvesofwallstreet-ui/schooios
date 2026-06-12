"use client";

// PULSEFIELD — "mạch hệ thống" sống trên Đài quan sát (AdminHome). Spectacle moment #3 (DIRECTION-WARM):
// "mạng tiếng nói" warm — node trôi + sợi nối + quét-sáng + node khẩn đập; first-paint assembly. KHÔNG
// donut/chart-junk: metrics chỉ điều tiết KHÔNG-KHÍ (mật độ + vài node khẩn), KHÔNG ánh xạ số→cột.
//
// ──────────────────────────────────────────────────────────────────────────────────────────────
// SEAM CONTRACT (ĐÓNG BĂNG — type + ngữ nghĩa BẤT BIẾN; F4 chỉ thay RUỘT, đã thay ở F3b):
//   • metrics      — payload dashboard sống (DashboardResponse | null). KHÔNG fetch bên trong; data do
//                    parent (AdminHome) sở hữu & truyền xuống. Tier đọc qua field-data (null-safe).
//   • isLoading    — true khi metrics đang bay → render TĨNH điềm tĩnh (reduced), KHÔNG spinner.
//   • reducedMotion— LUẬT: true ⇒ render TĨNH HOÀN TOÀN (tier reduced). KHÔNG truyền (mặc định) ⇒ tier
//                    theo NĂNG LỰC THIẾT BỊ (detectStageTier) — chủ ý owner "immersive cho mọi người"
//                    (spectacle chạy bất kể prefers-reduced-motion; reduce-motion chỉ còn ở CSS globals).
//   • className    — parent ĐỊNH kích thước; PulseField fill hộp, KHÔNG hardcode w/h.
//   • children     — slot phủ nội dung lên field.
// 3-tier dựng qua StageBoundary + Suspense (high R3F lỗi → mid → reduced), three/Canvas lazy ssr:false
// (KHÔNG vào server/ops bundle, mirror ReleaseBurst).
// ──────────────────────────────────────────────────────────────────────────────────────────────
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { StageBoundary } from "@/components/motion/stage/StageBoundary";
import { detectStageTier, type StageTier } from "@/components/motion/stage/stage-tier";
import PulseFieldStatic from "./pulsefield/PulseFieldStatic";
import { cn } from "@/lib/cn";
import type { DashboardResponse } from "@/lib/api-types";

const PulseFieldStage = dynamic(() => import("./pulsefield/PulseFieldStage"), { ssr: false });
const PulseFieldCanvas = dynamic(() => import("./pulsefield/PulseFieldCanvas"), { ssr: false });

export interface PulseFieldProps {
  metrics: DashboardResponse | null;
  isLoading?: boolean;
  reducedMotion?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PulseField({ metrics, isLoading, reducedMotion, className, children }: PulseFieldProps) {
  // Tier chốt 1 lần lúc mount (client-only: PulseField nạp qua dynamic ssr:false ở AdminHome). reducedMotion
  // =true (luật seam) hoặc đang tải → reduced tĩnh; còn lại theo năng lực thiết bị.
  const [tier] = useState<StageTier>(() =>
    reducedMotion === true ? "reduced" : detectStageTier(),
  );
  const effectiveTier: StageTier = isLoading ? "reduced" : tier;

  let decoration: React.ReactNode;
  if (effectiveTier === "high") {
    decoration = (
      <StageBoundary fallback={<PulseFieldCanvas metrics={metrics} />}>
        <Suspense fallback={<PulseFieldStatic metrics={metrics} />}>
          <PulseFieldStage metrics={metrics} />
        </Suspense>
      </StageBoundary>
    );
  } else if (effectiveTier === "mid") {
    decoration = <PulseFieldCanvas metrics={metrics} />;
  } else {
    decoration = <PulseFieldStatic metrics={metrics} />;
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      data-testid="pulsefield"
      data-tier={effectiveTier}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {decoration}
      </div>
      {children}
    </div>
  );
}

export default PulseField;
