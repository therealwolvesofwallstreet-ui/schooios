"use client";
// THRESHOLD AUTH SURFACE — khung NGƯỠNG CỬA cho /login: Stage immersive làm phông NỀN (3-tier), form
// đăng nhập (children) ghép CHÍNH GIỮA trên một card scrim-void + backdrop-blur, ở lớp z-10 tương tác.
// three/R3F (high) + Canvas (mid) nạp qua dynamic(ssr:false) → KHÔNG vào server bundle (motion §6/§8);
// reduced = ThresholdStatic (DOM tĩnh) — chính là thứ form-first mà runner reduced-motion thấy.
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Stage } from "@/components/motion/stage/Stage";
import ThresholdStatic from "./ThresholdStatic";

// Chunk three/R3F (high) + Canvas (mid) — nạp CHỈ khi tier tương ứng, client-only. KHÔNG import tĩnh.
const ThresholdStage = dynamic(() => import("./ThresholdStage"), { ssr: false });
const ThresholdCanvas = dynamic(() => import("./ThresholdCanvas"), { ssr: false });

export function ThresholdAuthSurface({ children }: { children: ReactNode }) {
  return (
    <main className="bg-depth text-on-depth relative min-h-screen">
      <Stage
        high={ThresholdStage}
        mid={ThresholdCanvas}
        reduced={<ThresholdStatic />}
        className="min-h-screen"
      >
        {/* Form ghép LỆCH PHẢI trên desktop (mở khoảng trái cho wordmark + ink-field thở — bố cục
         * biên tập Tyrsa/IG), giữa trên mobile. Card scrim-void đọc được trên phông tối. */}
        <div className="flex min-h-screen items-center justify-center px-6 py-16 md:justify-end md:px-[7vw]">
          <div className="border-line-depth bg-[--depth-scrim-depth] w-full max-w-sm rounded-lg border p-8 backdrop-blur-md md:p-10">
            {children}
          </div>
        </div>
      </Stage>
    </main>
  );
}
