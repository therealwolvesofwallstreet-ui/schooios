"use client";
// LANDING · MID tier [PATTERN] — Canvas 2D cho mobile/máy yếu/không-WebGL2: nền THẠCH CAO ấm (gradient
// định hướng góc trên-trái, khớp ánh sáng az~228°) + wordmark HAI GIỌNG "Schoo·IOS" khắc nổi GIẢ-relief
// (shadow cocoa lệch dưới-phải + highlight raised lệch trên-trái + thân plaster) → giữ ĐÚNG centerpiece
// như high tier, rẻ. Vẽ MỘT lần (tĩnh — calm, KHÔNG đốt pin); repaint khi resize. Màu/họ-font đọc từ
// tokens (SSOT). Lớp TRANG TRÍ (Stage bọc aria-hidden) — nav/tagline là children z-10. KHÔNG three.
import { useEffect, useRef } from "react";
import { ensureLandingWordFonts } from "./landing-word-texture";

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function LandingCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const root = getComputedStyle(document.documentElement);
    const paper = root.getPropertyValue("--color-paper").trim() || "#f5f1ea";
    const raised = root.getPropertyValue("--color-paper-raised").trim() || "#fbf8f1";
    const sunken = root.getPropertyValue("--color-sunken").trim() || "#eae3d5";
    const cocoa = root.getPropertyValue("--color-ink-2").trim() || "#7d5a44";
    const mute = root.getPropertyValue("--color-mute").trim() || "#b2967d";
    const serifFam = cssVar("--font-cormorant", '"Cormorant Garamond", Georgia, serif');
    const sansFam = cssVar("--font-plex-sans", '"IBM Plex Sans", system-ui, sans-serif');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement;
    let W = parent?.clientWidth || window.innerWidth || 360;
    let H = parent?.clientHeight || window.innerHeight || 640;

    const paint = () => {
      W = parent?.clientWidth || window.innerWidth || 360;
      H = parent?.clientHeight || window.innerHeight || 640;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // nền thạch cao ấm: sáng góc trên-trái (≈22%/18%, khớp ánh sáng high) → tối ấm góc dưới-phải.
      // [F2-audit M1] dải rộng hơn + mép ngả camel → có modeling thật, KHÔNG bệt kem (chống washed-out).
      const g = ctx.createRadialGradient(W * 0.24, H * 0.2, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.95);
      g.addColorStop(0, raised);
      g.addColorStop(0.42, paper);
      g.addColorStop(0.82, sunken);
      g.addColorStop(1, mute);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // gờ phù điêu mềm (gợi khối) — bóng camel khẽ ở dưới-phải để mid không trống trải.
      const blob = ctx.createRadialGradient(W * 0.72, H * 0.66, 0, W * 0.72, H * 0.66, Math.max(W, H) * 0.5);
      blob.addColorStop(0, mute);
      blob.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = blob;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // wordmark hai giọng — căn giữa, khắc nổi giả-relief (shadow + highlight + thân plaster).
      const fs = Math.min(W * 0.13, 150);
      const fsB = fs * 0.8;
      const y = H * 0.5;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const serif = (s: number) => `italic 500 ${s}px ${serifFam}`;
      const sans = (s: number) => `600 ${s}px ${sansFam}`;

      ctx.font = serif(fs);
      const wA = ctx.measureText("Schoo").width;
      ctx.font = serif(fs * 0.62);
      const wDot = ctx.measureText("·").width;
      ctx.font = sans(fsB);
      const wB = ctx.measureText("IOS").width;
      const gap = fs * 0.06;
      const x0 = (W - (wA + gap + wDot + gap + wB)) / 2;
      const xDot = x0 + wA + gap;
      const xB = xDot + wDot + gap;

      // vẽ một "lượt" wordmark với offset+màu cho trước (dùng lại cho shadow/highlight/thân).
      const stroke = (dx: number, dy: number, color: string, alpha: number) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.font = serif(fs);
        ctx.fillText("Schoo", x0 + dx, y + dy);
        ctx.font = serif(fs * 0.62);
        ctx.fillText("·", xDot + dx, y - fs * 0.04 + dy);
        ctx.font = sans(fsB);
        ctx.fillText("IOS", xB + dx, y - fs * 0.02 + dy);
      };

      // [F2-audit M1] emboss MẠNH hơn: offset lớn + bóng cocoa đậm → wordmark tách rõ khỏi nền kem.
      const off = Math.max(2, fs * 0.022);
      stroke(off, off, cocoa, 0.72); // shadow dưới-phải (hốc) — đậm để đọc rõ
      stroke(-off, -off, raised, 1.0); // highlight trên-trái (gờ bắt sáng)
      stroke(0, 0, paper, 0.95); // thân chữ = plaster (nổi khỏi nền nhờ bevel)
      ctx.globalAlpha = 1;
    };

    let alive = true;
    // chờ font về (đo đúng bề rộng) rồi vẽ; best-effort.
    void ensureLandingWordFonts().then(() => {
      if (alive) paint();
    });
    paint(); // vẽ ngay (fallback font) — tránh chớp trống; repaint sau khi font về.

    const onResize = () => paint();
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // F5d parallax con trỏ (mid) — dịch CANVAS vài px theo pointer bằng CSS transform (GPU-composite, KHÔNG
  // repaint → 0 chi phí vẽ). scale overscan bù để dịch KHÔNG lộ mép nền (Stage overflow-hidden clip phần
  // thừa). Ease-out lerp trong rAF, DỪNG khi tới đích (không loop nhàn rỗi). CHỈ pointer fine (touch bỏ
  // qua, KHÔNG lỗi). Cleanup: gỡ listener + hủy rAF + reset transform. Tách rời effect paint (không đụng vẽ).
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const MAX = 9; // px lệch tối đa — TINH TẾ
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const apply = () => {
      canvas.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0) scale(1.04)`;
    };
    const tick = () => {
      cx += (tx - cx) * 0.12; // ease-out
      cy += (ty - cy) * 0.12;
      apply();
      raf = Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = -((e.clientX / window.innerWidth) * 2 - 1) * MAX; // dịch NGƯỢC con trỏ = chiều sâu
      ty = -((e.clientY / window.innerHeight) * 2 - 1) * MAX;
      if (raf === 0) raf = requestAnimationFrame(tick);
    };
    canvas.style.willChange = "transform";
    apply(); // đặt overscan ngay (tránh nháy mép khi dịch lần đầu)
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf !== 0) cancelAnimationFrame(raf);
      canvas.style.transform = "";
      canvas.style.willChange = "";
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="h-full w-full" />;
}
