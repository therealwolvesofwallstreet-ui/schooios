"use client";
// SCROLL CONTROLLER — ghép Landing→Login thành MỘT cảnh cuộn (F2c). Lenis (smooth scroll) + GSAP
// ScrollTrigger: Landing LÙI (fade + dịch lên) khi cuộn qua viewport đầu; Login TRỒI (translateY-only,
// KHÔNG đụng opacity → form luôn đọc/được tương tác). Anchor "Vào hệ thống"/"Cuộn xuống" → smooth tới
// login. CHỈ mount ở full-motion (ThresholdScene gác reduced-motion → KHÔNG Lenis, anchor tức thì).
// Ease: chỉ ease-out (DIRECTION §motion). Lenis/GSAP nạp client-only (dynamic ssr:false ở caller).
// KHÔNG đụng auth logic — chỉ điều phối cuộn + animate lớp TRANG TRÍ + lề login (transform, không opacity).
import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollController({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrap.current;
    if (!root) return;

    // Bắt đầu ở ĐỈNH (Landing) — vô hiệu cú cuộn-tới-form do autoFocus của input lúc mount.
    window.scrollTo(0, 0);

    // ease-out cubic (token §motion — KHÔNG spring/bounce).
    const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3) });
    lenis.on("scroll", ScrollTrigger.update);
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    const landing = root.querySelector<HTMLElement>("[data-landing-layer]");
    const loginLayer = root.querySelector<HTMLElement>("[data-login-layer]");

    const ctx = gsap.context(() => {
      if (landing) {
        // Landing lùi: fade + dịch lên + co rất nhẹ khi rời khung (scrub theo cuộn).
        // [F2-audit] autoAlpha (KHÔNG opacity): tại opacity 0 → visibility:hidden → gỡ 3 link nav (đã mờ)
        // khỏi tab-order/AT (chống "Tab trúng link vô hình"). Cuộn lên lại → tự hiện.
        gsap.to(landing, {
          autoAlpha: 0,
          y: -48,
          scale: 0.985,
          ease: "none",
          scrollTrigger: { trigger: landing, start: "top top", end: "bottom top", scrub: true },
        });
      }
      if (loginLayer) {
        // Login trồi: CHỈ translateY (form giữ opacity 1 — đọc/tương tác mọi lúc, an toàn a11y).
        gsap.from(loginLayer, {
          y: 64,
          ease: "none",
          scrollTrigger: { trigger: loginLayer, start: "top bottom", end: "top center", scrub: true },
        });
      }
    }, root);

    // "Vào hệ thống →" / "Cuộn xuống ↓" → cuộn mượt tới login (giữ trên một route). "Giới thiệu" no-op.
    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if ((href === "#vao-he-thong" || href === "#cuon-xuong") && loginLayer) {
        e.preventDefault();
        lenis.scrollTo(loginLayer, { offset: 0 });
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
