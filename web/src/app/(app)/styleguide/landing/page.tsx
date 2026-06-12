"use client";

// DEV harness — xem LANDING 3-tier cô lập để verify. ?tier=high|mid|reduced ép forceTier; KHÔNG có →
// auto-detect như prod (reducedMotion=reduce → reduced). ?break=1 → ép `high` NÉM để chứng minh
// StageBoundary rơi xuống fallback (mid). Full-bleed (fixed inset-0) phủ AppShell → ảnh chụp sạch.
// KHÔNG phải màn nghiệp vụ; auth gate qua proxy như mọi route (app). high = LandingStage (F2a-1, frozen).
import { useState } from "react";
import dynamic from "next/dynamic";
import { Stage } from "@/components/motion/stage/Stage";
import { LandingNav } from "@/components/landing/LandingNav";
import LandingStatic from "@/components/landing/LandingStatic";
import type { StageTier } from "@/components/motion/stage/stage-tier";
import { useHydrated } from "@/hooks/useHydrated";

// Nạp y HỆT production: client-only ssr:false → three/canvas KHÔNG vào server bundle.
const LandingStage = dynamic(() => import("@/components/landing/LandingStage"), { ssr: false });
const LandingCanvas = dynamic(() => import("@/components/landing/LandingCanvas"), { ssr: false });

// Component NÉM lúc render — chỉ để test StageBoundary (qua ?break=1). KHÔNG dùng ở prod.
function BrokenHigh(): never {
  throw new Error("F2a-2 forced high failure (StageBoundary degrade test)");
}

function parseTier(): StageTier | undefined {
  if (typeof window === "undefined") return undefined;
  const t = new URLSearchParams(window.location.search).get("tier");
  return t === "high" || t === "mid" || t === "reduced" ? t : undefined;
}
function parseBreak(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("break") === "1";
}

export default function LandingPreviewPage() {
  const [forceTier] = useState<StageTier | undefined>(parseTier);
  const [broken] = useState<boolean>(parseBreak);
  // Harness phụ thuộc query (?tier/?break) chỉ có ở client → gate hydrate (useSyncExternalStore, KHÔNG
  // setState-in-effect): render đầu KHỚP server (rỗng), tránh hydration mismatch. Dev-only, vô hại.
  const hydrated = useHydrated();

  if (!hydrated) return <main className="fixed inset-0 z-50" />;

  const High = broken ? BrokenHigh : LandingStage;

  return (
    <main className="fixed inset-0 z-50" data-force-tier={forceTier ?? "auto"}>
      <Stage
        high={High}
        mid={LandingCanvas}
        reduced={<LandingStatic />}
        forceTier={forceTier}
        className="h-full w-full"
      >
        <LandingNav />
      </Stage>
    </main>
  );
}
