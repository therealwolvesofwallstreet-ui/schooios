"use client";
// THRESHOLD SCENE (F2c) — ghép Landing + Login thành MỘT cảnh cuộn trên /login (PLAYBOOK §3).
//   • SSR / first-paint / prefers-reduced-motion → CHỈ login (ThresholdAuthSurface) = ANCHOR tức thì tới
//     form, 0 scroll-anim. Khớp HTML server → KHÔNG hydration mismatch. Đây là thứ auth.spec (reduce) thấy.
//   • full-motion → Landing (viewport đầu, lớp trang trí) → cuộn (Lenis+GSAP) → login card trồi.
// GIỮ NGUYÊN auth: children (header+form+hooks) truyền thẳng vào ThresholdAuthSurface, KHÔNG đụng logic.
// three/Lenis/GSAP nạp dynamic(ssr:false) — KHÔNG vào server bundle (motion §6/§8).
import { useSyncExternalStore, type ReactNode } from "react";
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

  const login = <ThresholdAuthSurface>{children}</ThresholdAuthSurface>;

  // Anchor tức thì tới form: SSR + lúc hydrate (khớp server) + reduced-motion → CHỈ login, 0 scroll-anim.
  if (!hydrated || reduced) return login;

  // Full-motion: Landing (trang trí, aria-hidden ở Stage) trên đỉnh → cuộn → login.
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
      <div data-login-layer id="vao-he-thong">
        {login}
      </div>
    </ScrollController>
  );
}
