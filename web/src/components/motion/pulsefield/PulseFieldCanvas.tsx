"use client";
// PULSEFIELD · MID tier [PATTERN] (motion §3,§5) — Canvas 2D "mạng tiếng nói" sống cho mobile/máy yếu:
// node warm trôi nhẹ + sợi nối + quét-sáng (light-sweep) + node khẩn đập. Rẻ (KHÔNG WebGL). DPR-aware,
// rAF, dừng khi tab ẩn + cleanup (§5 LAW). Lớp TRANG TRÍ (aria-hidden) — số/sổ ở AdminHome mới mang nghĩa.
import { useEffect, useRef } from "react";
import {
  DESIGN_HALF_W,
  buildLinks,
  buildNodes,
  deriveField,
  readPalette,
  swatchForKind,
} from "./field-data";
import type { DashboardResponse } from "@/lib/api-types";

const ASSEMBLE_MS = 1300;
const SWEEP_PERIOD = 7000; // ms / vòng quét

export default function PulseFieldCanvas({ metrics }: { metrics: DashboardResponse | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement;
    let W = parent?.clientWidth || canvas.clientWidth || 320;
    let H = parent?.clientHeight || canvas.clientHeight || 160;
    const resize = () => {
      W = parent?.clientWidth || W;
      H = parent?.clientHeight || H;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const palette = readPalette();
    const spec = deriveField(metrics);
    const nodes = buildNodes(spec);
    const links = buildLinks(nodes);

    const padX = 10;
    const padY = 8;
    const px = (x: number) => padX + ((x + DESIGN_HALF_W) / (DESIGN_HALF_W * 2)) * (W - padX * 2);
    const py = (y: number) => padY + ((y + 1) / 2) * (H - padY * 2);
    const amp = Math.min(W, H) * 0.045;

    let raf = 0;
    let start = 0;
    let pausedAt = 0;
    let paused = false;

    const frame = (now: number) => {
      if (!start) start = now;
      const ms = now - start;
      const tSec = ms / 1000;
      const assemble = Math.min(ms / ASSEMBLE_MS, 1);
      const sweepX = ((ms % SWEEP_PERIOD) / SWEEP_PERIOD) * (W + 200) - 100;

      ctx.clearRect(0, 0, W, H);

      // toạ độ tức thời (drift) — tính 1 lần/frame.
      const cx: number[] = new Array(nodes.length);
      const cy: number[] = new Array(nodes.length);
      const ca: number[] = new Array(nodes.length); // alpha assembly per-node
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        const ox = Math.sin(tSec * 0.42 + n.seed * 6.283) * amp;
        const oy = Math.cos(tSec * 0.33 + n.seed * 5.117) * amp * 0.8;
        cx[i] = px(n.x) + ox;
        cy[i] = py(n.y) + oy;
        ca[i] = Math.max(0, Math.min(1, (assemble - n.seed * 0.45) / 0.55));
      }

      // sợi mạng — Camel mờ, alpha theo assembly 2 đầu.
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = palette.mute.hex;
      for (let k = 0; k < links.length; k++) {
        const [i, j] = links[k]!;
        const a = Math.min(ca[i]!, ca[j]!);
        if (a <= 0.01) continue;
        ctx.globalAlpha = a * 0.28;
        ctx.beginPath();
        ctx.moveTo(cx[i]!, cy[i]!);
        ctx.lineTo(cx[j]!, cy[j]!);
        ctx.stroke();
      }

      // node — tròn warm; quét-sáng + hot đập.
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        const a = ca[i]!;
        if (a <= 0.01) continue;
        const sw = swatchForKind(palette, n.kind);
        const glow = Math.exp(-Math.pow((cx[i]! - sweepX) / (W * 0.12 + 1), 2));
        const pulse = n.hot ? 0.5 + 0.5 * Math.sin(tSec * 2.2 + n.seed * 6.283) : 0;
        const baseR = 1.1 + n.seed * 1.5;
        const r = baseR + (n.hot ? 1.4 + pulse * 1.1 : 0) + glow * 0.9;

        if (n.hot) {
          ctx.globalAlpha = (0.16 + pulse * 0.14) * a;
          ctx.fillStyle = palette.signal.hex;
          ctx.beginPath();
          ctx.arc(cx[i]!, cy[i]!, r + 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = a * (0.5 + 0.42 * glow + (n.hot ? 0.25 : 0));
        ctx.fillStyle = n.hot ? palette.signal.hex : sw.hex;
        ctx.beginPath();
        ctx.arc(cx[i]!, cy[i]!, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) {
        paused = true;
        pausedAt = performance.now();
        cancelAnimationFrame(raf);
      } else if (paused) {
        paused = false;
        start += performance.now() - pausedAt;
        raf = requestAnimationFrame(frame);
      }
    };
    const onResize = () => resize();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [metrics]);

  return <canvas ref={ref} aria-hidden="true" className="h-full w-full" />;
}
