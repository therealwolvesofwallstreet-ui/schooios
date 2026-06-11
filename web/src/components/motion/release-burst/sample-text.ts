// Offscreen-canvas: chuỗi → đám điểm (point cloud) chuẩn hoá. Client-only (dùng document).
// Lấy mẫu pixel ĐỤC của caseCode đã render → vị trí ĐÍCH cho particle hội tụ ("tụ thành caseCode",
// motion §3). Dùng chung cho tier High (R3F) và Mid (Canvas 2D).
export interface SampledText {
  /** Cặp (nx, ny) chuẩn hoá: nx,ny ∈ [-1,1], gốc ở tâm, y hướng-lên (toán học). */
  positions: Float32Array;
  count: number;
  /** width/height của hộp chữ đã render — để giữ tỉ lệ khi đặt vào không gian thật. */
  aspect: number;
}

export function sampleText(
  text: string,
  opts?: { step?: number; fontPx?: number; maxPoints?: number },
): SampledText {
  const step = Math.max(1, opts?.step ?? 4);
  const fontPx = opts?.fontPx ?? 120;
  const maxPoints = opts?.maxPoints ?? 4000;

  const empty: SampledText = { positions: new Float32Array(0), count: 0, aspect: 1 };
  if (typeof document === "undefined" || !text) return empty;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return empty;

  const font = `700 ${fontPx}px ui-monospace, "SFMono-Regular", monospace`;
  ctx.font = font;
  const w = Math.max(1, Math.ceil(ctx.measureText(text).width) + fontPx);
  const h = Math.max(1, Math.ceil(fontPx * 1.6));
  canvas.width = w;
  canvas.height = h;
  // Resize xoá ctx → set lại trước khi vẽ.
  ctx.font = font;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);

  const data = ctx.getImageData(0, 0, w, h).data;
  const pts: number[] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 128) {
        pts.push((x / w - 0.5) * 2, -(y / h - 0.5) * 2); // y flip: ảnh (xuống) → toán (lên)
      }
    }
  }

  const total = pts.length / 2;
  if (total === 0) return { ...empty, aspect: w / h };

  let positions: Float32Array;
  if (total > maxPoints) {
    const stride = total / maxPoints;
    positions = new Float32Array(maxPoints * 2);
    for (let i = 0; i < maxPoints; i++) {
      const src = Math.floor(i * stride) * 2;
      positions[i * 2] = pts[src];
      positions[i * 2 + 1] = pts[src + 1];
    }
  } else {
    positions = new Float32Array(pts);
  }
  return { positions, count: positions.length / 2, aspect: w / h };
}
