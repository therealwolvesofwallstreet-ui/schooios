"use client";

// DEV harness — xem LANDING RELIEF (HIGH tier) cô lập để verify craft. forceTier="high" ép R3F mount
// thật (KHÔNG fallback im lặng). Full-bleed (fixed inset-0) phủ AppShell → ảnh chụp sạch chỉ còn phù
// điêu (rig đánh giá craft). Marker data-stage-tier + console.log("tier=high") để rig xác nhận mount
// thật. KHÔNG phải màn nghiệp vụ; auth gate qua proxy như mọi route (app). F2a-1: CHỈ tier HIGH.
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { Stage } from "@/components/motion/stage/Stage";

// Nạp y HỆT production: client-only ssr:false → three KHÔNG vào server bundle, phản chiếu đúng luồng thật.
const LandingStage = dynamic(() => import("@/components/landing/LandingStage"), { ssr: false });

export default function LandingPreviewPage() {
  // Báo mount thật cho rig (console) — Stage forceTier="high" sẽ render <LandingStage/>.
  useEffect(() => {
    console.log("tier=high");
  }, []);

  return (
    <main className="fixed inset-0 z-50" data-stage-tier="high">
      <Stage high={LandingStage} forceTier="high" className="h-full w-full" />
    </main>
  );
}
