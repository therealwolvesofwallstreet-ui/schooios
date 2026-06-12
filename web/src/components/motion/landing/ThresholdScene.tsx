"use client";
// THRESHOLD SCENE (F2c) — ghép Landing + Login thành MỘT cảnh cuộn trên /login. IMMERSIVE CHO MỌI NGƯỜI
// (owner chốt 2026-06-12: BỎ reduce-motion gating — KHÔNG degrade theo prefers-reduced-motion):
//   • SSR / first-paint → Landing TĨNH (LandingStatic, forceTier="reduced", SSR-safe) + login HIỆN
//     (truy cập được, khớp server → 0 hydration mismatch).
//   • hydrated → CROSSFADE: Landing (R3F/Canvas theo NĂNG LỰC thiết bị) TAN ↔ Login HIỆN DẦN (Lenis+GSAP).
// Landing-first (scrollTo 0 bù autoFocus); form tới được qua link "Vào hệ thống" / cuộn. GIỮ NGUYÊN auth.
// three/Lenis/GSAP nạp dynamic(ssr:false). Reduce-motion CHỈ còn ở CSS (globals.css) — spectacle chạy cho mọi người.
import { useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Stage } from "@/components/motion/stage/Stage";
import { ThresholdAuthSurface } from "@/components/auth/threshold/ThresholdAuthSurface";
import { LandingNav } from "@/components/landing/LandingNav";
import LandingStatic from "@/components/landing/LandingStatic";
import { useHydrated } from "@/hooks/useHydrated";

const LandingStage = dynamic(() => import("@/components/landing/LandingStage"), { ssr: false });
const LandingCanvas = dynamic(() => import("@/components/landing/LandingCanvas"), { ssr: false });
const ScrollController = dynamic(() => import("./scroll-controller"), { ssr: false });

export function ThresholdScene({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();

  // Landing-first: bù cú cuộn-tới-form do autoFocus input lúc mount (ScrollController cũng tự scrollTo 0).
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [hydrated]);

  const login = <ThresholdAuthSurface>{children}</ThresholdAuthSurface>;

  // SSR / first-paint → Landing TĨNH (forceTier="reduced" = LandingStatic SVG, khớp server → 0 mismatch) +
  // login HIỆN (truy cập được). Hydrate → crossfade immersive cho MỌI người (theo năng lực thiết bị).
  if (!hydrated) {
    return (
      <div className="bg-depth">
        <section data-landing-layer className="relative h-[100svh] w-full overflow-hidden">
          <Stage
            high={LandingStage}
            mid={LandingCanvas}
            reduced={<LandingStatic />}
            forceTier="reduced"
            className="h-full w-full"
          >
            <LandingNav />
          </Stage>
        </section>
        <div id="vao-he-thong">{login}</div>
      </div>
    );
  }

  // Full-motion: CHUYỂN CẢNH crossfade. Sân khấu STICKY phủ viewport; cuộn (driver cao 180vh) lái GSAP
  // scrub: layer Landing TAN (fade+zoom) ↔ layer Login HIỆN DẦN tại chỗ — KHÔNG cuộn tới section dưới.
  // Nền DEPTH Cowhide cố định sau cảnh → khi landing tan lộ ra thế giới login, liên tục warm.
  return (
    <ScrollController>
      <div aria-hidden="true" className="bg-depth pointer-events-none fixed inset-0 -z-10" />
      <div data-scene-driver className="relative h-[180vh] w-full">
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
          <div data-landing-layer className="absolute inset-0">
            <Stage
              high={LandingStage}
              mid={LandingCanvas}
              reduced={<LandingStatic />}
              className="h-full w-full"
            >
              <LandingNav />
            </Stage>
          </div>
          <div data-login-layer id="vao-he-thong" className="absolute inset-0">
            {login}
          </div>
        </div>
      </div>
    </ScrollController>
  );
}
