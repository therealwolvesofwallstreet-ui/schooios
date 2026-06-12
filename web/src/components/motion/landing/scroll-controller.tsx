"use client";
// SCROLL CONTROLLER (F2c) — CHUYỂN CẢNH bằng hiệu ứng: cuộn xuống → Landing TAN (fade + zoom nhẹ) trong
// khi Login HIỆN DẦN (crossfade tại chỗ), KHÔNG phải "cuộn tới section bên dưới". Lenis (smooth) + GSAP
// ScrollTrigger scrub: sân khấu STICKY phủ viewport, layer landing autoAlpha 1→0, layer login 0→1.
// Chỉ mount ở full-motion (ThresholdScene gác reduced-motion → KHÔNG Lenis/crossfade, hiện tĩnh + anchor).
// Ease-out only (DIRECTION §motion). Lenis/GSAP client-only (dynamic ssr:false ở caller). KHÔNG đụng auth.
import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { emitScenePhase, type ScenePhase } from "./scene-phase";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollController({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrap.current;
    if (!root) return;

    // Bắt đầu ở đỉnh (Landing) — vô hiệu cú cuộn-tới-form do autoFocus input lúc mount.
    window.scrollTo(0, 0);

    const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3) });
    lenis.on("scroll", ScrollTrigger.update);
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    const driver = root.querySelector<HTMLElement>("[data-scene-driver]");
    const landing = root.querySelector<HTMLElement>("[data-landing-layer]");
    const loginLayer = root.querySelector<HTMLElement>("[data-login-layer]");

    // F5c MOTION-BUDGET: phát phiên hiệu pha crossfade khi ĐỔI (KHÔNG mỗi frame) → LandingStage/
    // ThresholdStage tự pause frameloop của layer KHÔNG hiển thị ⇒ ở nghỉ chỉ 1 canvas render.
    let lastPhase: ScenePhase | null = null;
    const setPhase = (p: ScenePhase) => {
      if (p !== lastPhase) {
        lastPhase = p;
        emitScenePhase(p);
      }
    };
    setPhase("landing"); // khởi đầu ở landing → threshold canvas idle ngay từ đầu

    const ctx = gsap.context(() => {
      if (driver && landing && loginLayer) {
        // Login bắt đầu ẩn (autoAlpha 0 → visibility:hidden → form KHÔNG tab được tới khi hiện) + phóng khẽ.
        gsap.set(loginLayer, { autoAlpha: 0, scale: 1.04 });
        // Crossfade scrub theo cuộn: landing TAN (mờ + zoom ra), login HIỆN (mờ→rõ + về scale 1).
        gsap
          .timeline({
            scrollTrigger: {
              trigger: driver,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
              // Pha theo tiến trình: đỉnh=landing, đáy=login, giữa=both (crossfade cần CẢ HAI render).
              onUpdate: (self) =>
                setPhase(self.progress < 0.02 ? "landing" : self.progress > 0.98 ? "login" : "both"),
            },
          })
          .to(landing, { autoAlpha: 0, scale: 1.08, ease: "none" }, 0)
          .to(loginLayer, { autoAlpha: 1, scale: 1, ease: "none" }, 0);
      }
    }, root);

    // "Vào hệ thống →" / "Cuộn xuống ↓" → cuộn tới cuối driver (crossfade chạy hết → login hiện rõ).
    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if ((href === "#vao-he-thong" || href === "#cuon-xuong") && driver) {
        e.preventDefault();
        lenis.scrollTo(driver.offsetHeight, { offset: 0 });
      }
    };
    root.addEventListener("click", onAnchor);

    return () => {
      root.removeEventListener("click", onAnchor);
      ctx.revert();
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return <div ref={wrap}>{children}</div>;
}
