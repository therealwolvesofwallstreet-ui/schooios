// WORD TEXTURE — đóng gói wordmark HAI GIỌNG vào 1 texture (decoration; KHÔNG auth logic):
//   • R channel = "Schoo" (italic Cormorant Garamond — giọng con người, serif HERO warm; trước: Fraunces)
//   • G channel = "IOS"   (IBM Plex Sans semibold — giọng hệ thống, sans)
// Họ serif đọc từ --font-cormorant (next/font) ở runtime — KHÔNG hardcode tên family băm.
// Shader đọc .r/.g để hé hai giọng bằng hai sweep riêng (xem threshold-shaders.ts). Vẽ trên canvas
// DPR-aware, căn giữa. PHẢI await document.fonts.load() CẢ HAI face trước khi vẽ (nếu không, canvas
// dùng fallback → đo sai bề rộng → wordmark lệch/đổi khi font về). flipY mặc định của CanvasTexture
// → vẽ "thẳng" (y tăng xuống) là hiện đúng chiều trên màn.
import { CanvasTexture, LinearFilter, type Texture } from "three";

// Họ serif warm từ biến next/font (--font-cormorant). Fallback an toàn nếu biến trống/SSR.
function serifFamily(): string {
  if (typeof window === "undefined") return '"Cormorant Garamond", Georgia, serif';
  return (
    getComputedStyle(document.documentElement).getPropertyValue("--font-cormorant").trim() ||
    '"Cormorant Garamond", Georgia, serif'
  );
}

// Vẽ wordmark vào canvas (đã có context). w/h = kích thước CSS px (không nhân DPR — đã setTransform).
export function drawWord(canvas: HTMLCanvasElement, w: number, h: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // nền đen = "tắt" mọi kênh (R/G/B = 0) → shader chỉ thấy nét chữ ở R/G.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const fs = Math.min(w * 0.135, 200);
  const y = h * 0.45; // hơi trên giữa → nằm dưới Pulse (oc.y≈0.66 trong shader, flipY)
  const serif = `italic 500 ${fs}px ${serifFamily()}`;
  const sans = `600 ${fs * 0.82}px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // letterSpacing là thuộc tính tùy chọn của canvas 2D context (chưa có trong type lib cũ).
  const ls = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const hasLS = "letterSpacing" in ctx;

  // đo bề rộng để căn giữa
  ctx.font = serif;
  const wA = ctx.measureText("Schoo").width;
  ctx.font = sans;
  if (hasLS) ls.letterSpacing = `${fs * 0.04}px`;
  const wB = ctx.measureText("IOS").width + fs * 0.04 * 2;
  if (hasLS) ls.letterSpacing = "0px";

  const gap = fs * 0.05;
  const total = wA + gap + wB;
  const x0 = (w - total) / 2;

  // R channel = serif "Schoo" (con người) · G channel = sans "IOS" (hệ thống)
  ctx.font = serif;
  ctx.fillStyle = "#ff0000";
  ctx.fillText("Schoo", x0, y);
  ctx.font = sans;
  ctx.fillStyle = "#00ff00";
  if (hasLS) ls.letterSpacing = `${fs * 0.04}px`;
  ctx.fillText("IOS", x0 + wA + gap, y - fs * 0.02);
  if (hasLS) ls.letterSpacing = "0px";
}

// Đảm bảo cả hai face đã nạp trước khi đo/vẽ (tránh fallback đo sai). best-effort: lỗi/timeout → vẽ
// bằng những gì có (swap font sau là hiếm và vô hại — texture redraw-on-resize).
export async function ensureWordFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`italic 500 200px ${serifFamily()}`, "Schoo"),
      document.fonts.load('600 164px "IBM Plex Sans"', "IOS"),
    ]);
    await document.fonts.ready;
  } catch {
    // bỏ qua — vẽ với font hiện có
  }
}

// Tạo CanvasTexture (LinearFilter) đã vẽ wordmark. Trả kèm canvas để redraw-on-resize.
export function buildWordTexture(w: number, h: number): { texture: Texture; canvas: HTMLCanvasElement } {
  const canvas = document.createElement("canvas");
  drawWord(canvas, w, h);
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return { texture, canvas };
}
