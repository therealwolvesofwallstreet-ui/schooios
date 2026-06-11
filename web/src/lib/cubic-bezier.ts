// Cubic-bézier easing evaluator (Newton–Raphson trên trục X) — cho motion JS-driven phải tuân ĐÚNG
// đường ease token (tokens.css --ease-quiet/--ease-emerge), tương đương CSS cubic-bezier(x1,y1,x2,y2).
// Dùng ở tier Canvas-2D của Release Burst (tier R3F drive bằng GSAP CustomEase cùng control points).
// Họ ease-out duy nhất — KHÔNG spring/bounce/back/elastic (motion §3 LAW).
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-5) break;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sampleY(t);
  };
}

// ── NGUỒN DUY NHẤT (JS) cho control points ease — mirror tokens.css. Đổi token ⇒ SỬA Ở ĐÂY; mọi nơi
// dùng ease (Framer tuple, GSAP CustomEase, easeEmerge/easeQuiet mid-tier) import từ đây, KHÔNG hardcode
// lại số bezier (chống 3-nơi-lệch-nhau). CSS `--ease-*` là mirror song song — giữ đồng bộ thủ công. ──
export const EASE_EMERGE_BEZIER = [0.16, 1, 0.3, 1] as const; // --ease-emerge (reveal)
export const EASE_QUIET_BEZIER = [0.22, 0.61, 0.36, 1] as const; // --ease-quiet (interactive)

export const easeEmerge = cubicBezier(...EASE_EMERGE_BEZIER);
export const easeQuiet = cubicBezier(...EASE_QUIET_BEZIER);

/** Đường SVG cho GSAP CustomEase từ control points cubic-bezier(x1,y1,x2,y2). */
export function gsapEasePath([x1, y1, x2, y2]: readonly [number, number, number, number]): string {
  return `M0,0 C${x1},${y1} ${x2},${y2} 1,1`;
}
