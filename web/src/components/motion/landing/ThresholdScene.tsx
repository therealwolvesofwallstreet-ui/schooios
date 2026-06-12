"use client";
// THRESHOLD SCENE (F2c) — ghép Landing + Login thành MỘT cảnh cuộn trên /login (PLAYBOOK §3).
// Landing hiện cho MỌI người (reduced-motion tắt ANIMATION, KHÔNG ẩn nội dung):
//   • SSR / first-paint / prefers-reduced-motion → Landing TĨNH (LandingStatic, forceTier="reduced",
//     0 canvas/animation) + login, CUỘN GỐC (không Lenis/GSAP). Khớp HTML server → 0 hydration mismatch.
//   • full-motion → Landing R3F (viewport đầu) → cuộn mượt (Lenis+GSAP) → login card trồi.
// Landing-first cả hai chế độ (scrollTo 0 bù autoFocus); form tới được tức thì qua link "Vào hệ thống".
// GIỮ NGUYÊN auth: children (header+form+hooks) → ThresholdAuthSurface, KHÔNG đụng logic.
// three/Lenis/GSAP nạp dynamic(ssr:false) — KHÔNG vào server bundle (motion §6/§8).
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Stage } from "@/components/motion/stage/Stage";
import { ThresholdAuthSurface } from "@/components/auth/threshold/ThresholdAuthSurface";
import { LandingNav } from "@/components/landing/LandingNav";
import LandingStatic from "@/components/landing/LandingStatic";
import { useHydrated } from "@/hooks/useHydrated";

const LandingStage = dynamic(() => import("@/components/landing/LandingStage"), { ssr: false });
const LandingCanvas = dynamic(() => import("@/components/landing/LandingCanvas"), { ssr: false });
const ScrollController = dynamic(() => import("./scroll-controller"), { ssr: false });

// prefers-reduced-motion qua useSyncExternalStore (KHÔNG setState-in-effect — chuẩn repo, xem useHydrated).
// Server snapshot = true (reduced) → SSR an toàn (anchor tới form); client đọc media thật + theo dõi đổi.
const RM_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeRM,
    () => window.matchMedia(RM_QUERY).matches,
    () => true,
  );
}

export function ThresholdScene({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const reduced = usePrefersReducedMotion();
  const fullMotion = hydrated && !reduced;

  // Landing-first: bù cú cuộn-tới-form do autoFocus input lúc mount (full-motion ScrollController cũng tự
  // scrollTo 0). Form vẫn tới được TỨC THÌ qua link "Vào hệ thống". KHÔNG đụng form — chỉ điều khiển scroll trang.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [fullMotion]);

  const login = (
    <div data-login-layer id="vao-he-thong">
      <ThresholdAuthSurface>{children}</ThresholdAuthSurface>
    </div>
  );

  // SSR / first-paint / reduced-motion → Landing TĨNH (forceTier="reduced" = LandingStatic SVG, khớp server
  // → 0 hydration mismatch) + login, cuộn gốc. AI CŨNG thấy landing; reduced chỉ bỏ Lenis/GSAP + R3F.
  if (!fullMotion) {
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
        {login}
      </div>
    );
  }

  // Full-motion: Landing R3F (trang trí, aria-hidden ở Stage) trên đỉnh → cuộn mượt → login trồi.
  return (
    <ScrollController>
      {/* [F2-audit] nền DEPTH Cowhide cố định sau cảnh: khi Landing (sáng) mờ dần, lộ ra depth (thế giới
          login) thay vì giấy Linen sáng → bắc cầu liên tục, KHÔNG còn "đường nối giấy" chói ở handoff. */}
      <div aria-hidden="true" className="bg-depth pointer-events-none fixed inset-0 -z-10" />
      <section data-landing-layer className="relative h-[100svh] w-full overflow-hidden">
        <Stage
          high={LandingStage}
          mid={LandingCanvas}
          reduced={<LandingStatic />}
          className="h-full w-full"
        >
          <LandingNav />
        </Stage>
      </section>
      {login}
    </ScrollController>
  );
}
