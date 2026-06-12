// PULSEFIELD · DỮ LIỆU NỀN (dùng chung 3 tier) — sinh "mạng tiếng nói" TẤT ĐỊNH (seeded PRNG) từ
// metrics dashboard. KHÔNG phải chart: metrics chỉ điều tiết KHÔNG-KHÍ (mật độ node + vài node "khẩn"
// sáng), KHÔNG ánh xạ số thành cột/cung. Cùng topology cho high/mid/reduced ⇒ nhất quán + reduced 0-diff.
//
// KHÔNG GIAN THIẾT KẾ (design space): x∈[-HALF_W, HALF_W], y∈[-1, 1] — dải ngang rộng (~5.2:1), khớp
// hộp PulseField (h-40/48, max-w-5xl). Mỗi tier scale design-space → world/pixel của mình.
import type { DashboardResponse } from "@/lib/api-types";

export const DESIGN_HALF_W = 2.6; // nửa bề rộng không-gian thiết kế (tổng 5.2, tỉ lệ ~5.2:1)

export type NodeKind = "link" | "gold" | "signal";

export interface FieldNode {
  x: number; // design space, [-DESIGN_HALF_W, DESIGN_HALF_W]
  y: number; // design space, [-1, 1]
  seed: number; // 0..1 — lệch pha/kích thước/độ trễ assembly
  kind: NodeKind;
  hot: boolean; // node "khẩn" — sáng signal + đập nhẹ (chỉ tier động)
}

export interface FieldSpec {
  nodeCount: number;
  hotCount: number;
}

// ── PRNG tất định (mulberry32) — KHÔNG Math.random ⇒ layout ổn định mọi lần dựng (reduced 2-shot 0-diff).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── metrics → đặc tả trường (null-safe). Field LUÔN sống dù 0 case (min node) — đây là trang trí.
export function deriveField(metrics: DashboardResponse | null | undefined): FieldSpec {
  const total = metrics?.totalCases ?? 0;
  const emergency = metrics?.emergencyOpen ?? 0;
  const nodeCount = Math.max(46, Math.min(120, Math.round(46 + total * 0.6)));
  const hotCount = Math.max(0, Math.min(5, emergency));
  return { nodeCount, hotCount };
}

// ── Sinh node TẤT ĐỊNH. Rải x đều theo cột (jitter) để phủ kín dải; y ngẫu nhiên-có-kiểm-soát.
//    kind nặng gold/link (lặng), ít signal (hiếm); hotCount node đầu = "khẩn" (sáng signal).
export function buildNodes(spec: FieldSpec, seed = 0x5c4001): FieldNode[] {
  const rnd = mulberry32(seed);
  const { nodeCount, hotCount } = spec;
  const nodes: FieldNode[] = [];
  for (let i = 0; i < nodeCount; i++) {
    // cột đều + jitter → không bị chùm cục bộ.
    const col = (i + 0.5) / nodeCount; // 0..1
    const x = (col * 2 - 1) * DESIGN_HALF_W + (rnd() - 0.5) * (DESIGN_HALF_W / nodeCount) * 3.2;
    const y = (rnd() - 0.5) * 1.9;
    const r = rnd();
    const kind: NodeKind = r < 0.5 ? "gold" : r < 0.82 ? "link" : "signal";
    nodes.push({ x, y, seed: rnd(), kind, hot: false });
  }
  // Đánh dấu hot: chọn các node phân tán (bước nhảy) để không dồn 1 chỗ.
  if (hotCount > 0 && nodes.length > 0) {
    const stride = Math.max(1, Math.floor(nodes.length / hotCount));
    for (let k = 0; k < hotCount; k++) {
      const idx = (Math.floor(stride / 2) + k * stride) % nodes.length;
      const n = nodes[idx];
      if (n) {
        n.hot = true;
        n.kind = "signal";
      }
    }
  }
  return nodes;
}

// ── Liên kết "mạng": mỗi node nối tới <=2 hàng xóm gần nhất trong bán kính maxDist (design units),
//    dedupe cặp. Khoảng cách đo trong design-space (đã rộng ngang) → sợi ngắn, tự nhiên.
export function buildLinks(nodes: FieldNode[], maxDist = 0.62): Array<[number, number]> {
  const pairs = new Set<string>();
  const links: Array<[number, number]> = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    const near: Array<{ j: number; d: number }> = [];
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue;
      const b = nodes[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d <= maxDist) near.push({ j, d });
    }
    near.sort((p, q) => p.d - q.d);
    for (const { j } of near.slice(0, 2)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      links.push([i, j]);
    }
  }
  return links;
}

// ── Đọc palette warm từ token CSS (SSOT tokens.css). Trả hex + rgb 0..1 (cho shader: ShaderMaterial
//    KHÔNG color-managed → truyền thẳng .r/.g/.b khớp màu CSS, như ReleaseBurst).
export interface Swatch {
  hex: string;
  rgb: [number, number, number];
}
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return [Number.isFinite(r) ? r : 0, Number.isFinite(g) ? g : 0, Number.isFinite(b) ? b : 0];
}
function readVar(name: string, fallback: string): Swatch {
  let hex = fallback;
  if (typeof window !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v && v.startsWith("#")) hex = v;
  }
  return { hex, rgb: hexToRgb(hex) };
}
export interface Palette {
  signal: Swatch; // Spiced Wine — tiếng nói/khẩn
  link: Swatch; // Toasted Caramel — hệ thống
  gold: Swatch; // Golden Batter idx — đã ghi nhận
  mute: Swatch; // Camel — sợi mạng
  line: Swatch; // hairline
}
export function readPalette(): Palette {
  return {
    signal: readVar("--color-signal", "#743014"),
    link: readVar("--color-link", "#84592B"),
    gold: readVar("--color-gold", "#C99A4A"),
    mute: readVar("--color-mute", "#B2967D"),
    line: readVar("--color-line", "#E2D9C8"),
  };
}

export function swatchForKind(p: Palette, kind: NodeKind): Swatch {
  return kind === "signal" ? p.signal : kind === "gold" ? p.gold : p.link;
}
