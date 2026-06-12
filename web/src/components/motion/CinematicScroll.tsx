"use client";
// CUỘN ĐIỆN ẢNH (F3c) — Lenis smooth/momentum cho hồ sơ case-detail: cuộn dọc Spine có quán tính, nặng
// tay, "điện ảnh". Host vòng đời thuần (không bọc layout): init Lenis trên window lúc mount, destroy lúc
// unmount (rời trang → trả cuộn thường). Ease-out only (DIRECTION §motion: 1-(1-t)^3 = easeOutCubic).
// Lenis client-only (window) → caller nạp dynamic ssr:false + mount SAU HYDRATE cho MỌI người (KHÔNG
// gate prefers-reduced-motion: owner "immersive cho mọi người"). Lenis tự rAF (KHÔNG kéo gsap vào chunk).
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

export default function CinematicScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3) });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return <>{children}</>;
}
