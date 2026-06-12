"use client";
// RELEASE BURST · MID tier [PATTERN] (motion §3, §5) — Canvas 2D dots (rAF) cho mobile/máy yếu.
// Cùng ngôn ngữ scatter→converge→dissolve về impression caseCode, nhưng rẻ: dot có hạn, KHÔNG WebGL.
// Ease token qua cubicBezier (lib/cubic-bezier). DPR-aware · cap dot · cleanup khi unmount + tab ẩn
// (§5 LAW). Lớp TRANG TRÍ (aria-hidden) — DOM confirmation mới là vật mang nghĩa (§7).
import { useEffect, useRef } from "react";
import { sampleText } from "./sample-text";
import { easeEmerge, easeQuiet } from "@/lib/cubic-bezier";

const DURATION = 1180; // ms (cinematic)
const MAX_DOTS = 150;

export default function ReleaseBurstCanvas({ caseCode }: { caseCode: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement;
    const W = parent?.clientWidth || canvas.clientWidth || 320;
    const H = parent?.clientHeight || canvas.clientHeight || 320;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.scale(dpr, dpr);

    const signal =
      getComputedStyle(document.documentElement).getPropertyValue("--color-signal").trim() ||
      "#743014";

    const sampled = sampleText(caseCode, { fontPx: 64, step: 7, maxPoints: MAX_DOTS });
    const n = Math.max(sampled.count, 1);
    const cx = W / 2;
    const cy = H / 2;
    const halfW = W * 0.5 * 0.5; // chữ ~50% bề rộng
    const halfH = halfW / (sampled.aspect || 6);
    const spread = Math.max(W, H) * 0.55;

    type Dot = { tx: number; ty: number; dx: number; dy: number; seed: number };
    const dots: Dot[] = [];
    for (let i = 0; i < n; i++) {
      const nx = sampled.positions[i * 2] ?? 0;
      const ny = sampled.positions[i * 2 + 1] ?? 0;
      const a = Math.random() * Math.PI * 2;
      const r = (0.4 + Math.random() * 0.6) * spread;
      dots.push({
        tx: cx + nx * halfW,
        ty: cy - ny * halfH, // ny toán-lên → canvas y-xuống
        dx: Math.cos(a) * r,
        dy: Math.sin(a) * r,
        seed: Math.random(),
      });
    }

    let raf = 0;
    let start = 0;
    let pausedAt = 0;
    let paused = false;

    const frame = (now: number) => {
      if (!start) start = now;
      const t = Math.min((now - start) / DURATION, 1);
      const scatter = easeEmerge(Math.min(t / 0.3, 1));
      const converge = easeQuiet(Math.min(Math.max((t - 0.17) / 0.61, 0), 1));
      const reveal = t < 0.8 ? 1 : 1 - easeEmerge(Math.min((t - 0.8) / 0.2, 1));

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = signal;
      for (const d of dots) {
        const sx = cx + d.dx * scatter;
        const sy = cy + d.dy * scatter;
        const x = sx + (d.tx - sx) * converge;
        const y = sy + (d.ty - sy) * converge;
        ctx.globalAlpha = Math.min(scatter, 1) * reveal * (0.5 + d.seed * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, 1.1 + d.seed * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) {
        paused = true;
        pausedAt = performance.now();
        cancelAnimationFrame(raf);
      } else if (paused) {
        paused = false;
        start += performance.now() - pausedAt; // dời mốc → không nhảy frame
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [caseCode]);

  return <canvas ref={ref} aria-hidden="true" className="h-full w-full" />;
}
