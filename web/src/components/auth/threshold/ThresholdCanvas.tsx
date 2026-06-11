"use client";
// THRESHOLD · MID tier [PATTERN] — Canvas 2D cho mobile/máy yếu: nền VOID ấm gradient + MỘT dấu signal
// đỏ thở mềm + wordmark HAI GIỌNG (Fraunces "Schoo" + Plex "IOS") vẽ MỘT lần. rAF chỉ cho nhịp thở của
// dấu đỏ (rẻ); cleanup khi unmount + tab ẩn (motion §5 LAW). Lớp TRANG TRÍ (Stage bọc aria-hidden).
import { useEffect, useRef } from "react";
import { easeQuiet } from "@/lib/cubic-bezier";

export default function ThresholdCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const root = getComputedStyle(document.documentElement);
    const sig = root.getPropertyValue("--color-signal").trim() || "#d72638";
    const glow = root.getPropertyValue("--color-on-void").trim() || "#f3eee3";
    const cobalt = root.getPropertyValue("--color-cobalt-lift").trim() || "#5e78ff";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement;
    let W = parent?.clientWidth || window.innerWidth || 360;
    let H = parent?.clientHeight || window.innerHeight || 640;

    // Vẽ nền + wordmark MỘT lần (không phụ thuộc thời gian). Chỉ dấu đỏ thở mỗi frame.
    const paintStatic = () => {
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // nền VOID ấm: gradient tối-trên-sáng-khẽ (gợi vault/skylight nhẹ)
      const g = ctx.createRadialGradient(W * 0.5, H * 0.32, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
      g.addColorStop(0, "#16130f");
      g.addColorStop(1, "#0b0908");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // wordmark hai giọng — căn giữa, dưới dấu đỏ
      const fs = Math.min(W * 0.13, 132);
      const y = H * 0.56;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.font = `italic 500 ${fs}px "Fraunces", Georgia, serif`;
      const wA = ctx.measureText("Schoo").width;
      ctx.font = `600 ${fs * 0.82}px "IBM Plex Sans", system-ui, sans-serif`;
      const wB = ctx.measureText("IOS").width;
      const gap = fs * 0.06;
      const x0 = (W - (wA + gap + wB)) / 2;

      ctx.font = `italic 500 ${fs}px "Fraunces", Georgia, serif`;
      ctx.fillStyle = glow; // "Schoo" sáng on-void
      ctx.fillText("Schoo", x0, y);
      ctx.font = `600 ${fs * 0.82}px "IBM Plex Sans", system-ui, sans-serif`;
      ctx.fillStyle = cobalt; // "IOS" mang accent hệ thống
      ctx.fillText("IOS", x0 + wA + gap, y - fs * 0.02);
    };
    paintStatic();

    const dotX = W * 0.5;
    const dotY = H * 0.4;

    let raf = 0;
    let start = 0;
    let paused = false;

    const frame = (now: number) => {
      if (!start) start = now;
      // nhịp thở chậm (~2.4s/chu kỳ), opacity uốn theo ease token cho mềm
      const phase = ((now - start) / 2400) % 1;
      const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2; // 0→1→0
      const breathe = 0.35 + easeQuiet(tri) * 0.55;

      // xoá vùng dấu đỏ rồi vẽ lại halo + lõi (chỉ vùng nhỏ → rẻ)
      const R = Math.min(W, H) * 0.16;
      ctx.clearRect(dotX - R, dotY - R, R * 2, R * 2);
      // nền lại cho vùng vừa xoá (giữ gradient liền mạch)
      const g = ctx.createRadialGradient(W * 0.5, H * 0.32, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
      g.addColorStop(0, "#16130f");
      g.addColorStop(1, "#0b0908");
      ctx.save();
      ctx.beginPath();
      ctx.rect(dotX - R, dotY - R, R * 2, R * 2);
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(dotX - R, dotY - R, R * 2, R * 2);
      ctx.restore();

      // halo
      const halo = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, R);
      halo.addColorStop(0, sig);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = breathe * 0.45;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(dotX, dotY, R, 0, Math.PI * 2);
      ctx.fill();
      // lõi
      ctx.globalAlpha = 0.6 + breathe * 0.4;
      ctx.fillStyle = sig;
      ctx.beginPath();
      ctx.arc(dotX, dotY, Math.min(W, H) * 0.014, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) {
        paused = true;
        cancelAnimationFrame(raf);
      } else if (paused) {
        paused = false;
        start = 0; // mốc lại → không nhảy phase
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onResize = () => {
      W = parent?.clientWidth || window.innerWidth || 360;
      H = parent?.clientHeight || window.innerHeight || 640;
      paintStatic();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="h-full w-full" />;
}
