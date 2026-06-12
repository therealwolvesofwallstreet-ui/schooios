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
    const sig = root.getPropertyValue("--color-signal").trim() || "#743014";
    const glow = root.getPropertyValue("--color-on-depth").trim() || "#f5f1ea";
    const link = root.getPropertyValue("--color-link-lift").trim() || "#a87a3e";
    // WARM: nền DEPTH Cowhide (thay near-black cũ) + wordmark Cormorant (thay Fraunces) — từ tokens.
    const depth = root.getPropertyValue("--color-depth").trim() || "#442d1c";
    const depthSunken = root.getPropertyValue("--color-depth-sunken").trim() || "#36210f";
    const onDepth3 = root.getPropertyValue("--color-on-depth-3").trim() || "#b2967d";
    const serifFam = root.getPropertyValue("--font-cormorant").trim() || '"Cormorant Garamond", Georgia, serif';

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
      g.addColorStop(0, depth);
      g.addColorStop(1, depthSunken);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // wordmark hai giọng — căn giữa, dưới dấu đỏ
      const fs = Math.min(W * 0.13, 132);
      const y = H * 0.56;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const serif = `italic 500 ${fs}px ${serifFam}`;
      const serifDot = `italic 500 ${fs * 0.62}px ${serifFam}`;
      const sans = `600 ${fs * 0.82}px "IBM Plex Sans", system-ui, sans-serif`;
      ctx.font = serif;
      const wA = ctx.measureText("Schoo").width;
      ctx.font = serifDot;
      const wDot = ctx.measureText("·").width;
      ctx.font = sans;
      const wB = ctx.measureText("IOS").width;
      const gap = fs * 0.05;
      const x0 = (W - (wA + gap + wDot + gap + wB)) / 2;
      const xDot = x0 + wA + gap;
      const xB = xDot + wDot + gap;

      ctx.font = serif;
      ctx.fillStyle = glow; // "Schoo" sáng on-depth (Cormorant ital)
      ctx.fillText("Schoo", x0, y);
      ctx.font = serifDot;
      ctx.fillStyle = onDepth3; // dấu · — camel nối hai giọng
      ctx.fillText("·", xDot, y - fs * 0.04);
      ctx.font = sans;
      ctx.fillStyle = link; // "IOS" mang accent hệ thống
      ctx.fillText("IOS", xB, y - fs * 0.02);
    };
    let alive = true;
    paintStatic();
    // Cormorant (next/font) có thể chưa về lúc mount → repaint khi fonts.ready để đo/vẽ đúng (tránh fallback).
    if (document.fonts?.ready) void document.fonts.ready.then(() => { if (alive) paintStatic(); });

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
      g.addColorStop(0, depth);
      g.addColorStop(1, depthSunken);
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
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="h-full w-full" />;
}
