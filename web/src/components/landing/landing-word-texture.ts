// LANDING WORD TEXTURE — wordmark HAI GIỌNG "Schoo·IOS" đóng vào 1 texture để shader KHẮC NỔI thành gờ
// chữ trên thạch cao (KHÁC threshold: ở đây mặt nạ là CHIỀU CAO gờ chữ, không phải reveal):
//   • R channel = "Schoo" (Cormorant Garamond italic — giọng con người, serif HERO warm)
//   • G channel = "IOS"   (IBM Plex Sans semibold — giọng hệ thống, sans)
// Họ font lấy từ biến next/font (--font-cormorant / --font-plex-sans) ở runtime (next/font sinh tên
// family băm → KHÔNG hardcode "Cormorant Garamond" literal vì sẽ KHÔNG khớp instance). PHẢI await
// document.fonts.load trước khi đo/vẽ (fallback đo sai → wordmark lệch khi font về). flipY mặc định của
// CanvasTexture → vẽ y-tăng-xuống là hiện đúng chiều.
import { CanvasTexture, LinearFilter, type Texture } from "three";

// Đọc họ font từ biến CSS (next/font) — fallback nếu chưa có (SSR/biến trống).
function fontFamily(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function serifSpec(fs: number): string {
  return `italic 500 ${fs}px ${fontFamily("--font-cormorant", '"Cormorant Garamond", Georgia, serif')}`;
}
function sansSpec(fs: number): string {
  return `600 ${fs}px ${fontFamily("--font-plex-sans", '"IBM Plex Sans", system-ui, sans-serif')}`;
}

// Vẽ wordmark vào canvas. w/h = px CSS (đã setTransform DPR).
export function drawLandingWord(canvas: HTMLCanvasElement, w: number, h: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // nền đen = mọi kênh tắt → shader chỉ thấy gờ chữ ở R/G.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const fs = Math.min(w * 0.155, 260); // HERO: lớn hơn threshold (chiếm thân màn)
  const fsB = fs * 0.8;
  const y = h * 0.5;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // letterSpacing là thuộc tính tùy chọn của canvas 2D (chưa có trong type lib cũ).
  const ls = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const hasLS = "letterSpacing" in ctx;

  // đo bề rộng để căn giữa
  ctx.font = serifSpec(fs);
  const wA = ctx.measureText("Schoo").width;
  ctx.font = serifSpec(fs * 0.62);
  const wDot = ctx.measureText("·").width;
  ctx.font = sansSpec(fsB);
  if (hasLS) ls.letterSpacing = `${fsB * 0.05}px`;
  const wB = ctx.measureText("IOS").width + fsB * 0.05 * 2;
  if (hasLS) ls.letterSpacing = "0px";

  const gap = fs * 0.06;
  const total = wA + gap + wDot + gap + wB;
  const x0 = (w - total) / 2;

  // R = serif "Schoo" (con người) · gờ chữ → đỏ thuần (255,0,0)
  ctx.font = serifSpec(fs);
  ctx.fillStyle = "#ff0000";
  ctx.fillText("Schoo", x0, y);
  // dấu "·" nối hai giọng (đặt ở R, nhỏ hơn)
  ctx.font = serifSpec(fs * 0.62);
  ctx.fillText("·", x0 + wA + gap, y - fs * 0.04);
  // G = sans "IOS" (hệ thống) · gờ chữ → lục thuần (0,255,0)
  ctx.font = sansSpec(fsB);
  ctx.fillStyle = "#00ff00";
  if (hasLS) ls.letterSpacing = `${fsB * 0.05}px`;
  ctx.fillText("IOS", x0 + wA + gap + wDot + gap, y - fs * 0.02);
  if (hasLS) ls.letterSpacing = "0px";
}

// Đảm bảo cả hai face đã nạp (tránh fallback đo sai). best-effort: lỗi/timeout → vẽ với font hiện có.
export async function ensureLandingWordFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(serifSpec(200)),
      document.fonts.load(sansSpec(160)),
    ]);
    await document.fonts.ready;
  } catch {
    // bỏ qua — vẽ với font hiện có
  }
}

// Tạo CanvasTexture (LinearFilter cho bevel mượt) đã vẽ wordmark. Trả kèm canvas để redraw-on-resize.
export function buildLandingWordTexture(
  w: number,
  h: number,
): { texture: Texture; canvas: HTMLCanvasElement } {
  const canvas = document.createElement("canvas");
  drawLandingWord(canvas, w, h);
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return { texture, canvas };
}
