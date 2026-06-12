// Chọn tier cho MỌI Stage immersive (client-only) — tổng quát hoá burst-tier để dùng lại cho
// Threshold (login) + bất kỳ sân khấu WebGL nào sau này. Cùng 3 tầng, cùng ngưỡng phát hiện.
//   reduced [LAW]   — prefers-reduced-motion (hoặc SSR) → DOM tĩnh, KHÔNG canvas (motion §7).
//   mid     [PATTERN] — mobile / coarse-pointer / máy yếu / không WebGL2 → Canvas 2D nhẹ.
//   high    [ONE-OFF] — desktop đủ lực + WebGL2 → R3F GPU shader.
export type StageTier = "high" | "mid" | "reduced";

export function hasWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function detectStageTier(): StageTier {
  // SSR (typeof window === undefined) → reduced: render đầu tiên KHÔNG lóe motion, và Stage chỉ chạy
  // client (dynamic ssr:false) nên client sẽ tính lại đúng ở initializer.
  if (typeof window === "undefined") return "reduced";
  // TIER = NĂNG LỰC THIẾT BỊ (WebGL2/mobile/máy yếu), KHÔNG theo prefers-reduced-motion. Chủ ý (owner
  // chốt 2026-06-12): "immersive cho MỌI người" — bỏ degrade theo reduce-motion. Reduce-motion CHỈ còn ở
  // CSS (globals.css) cho transition/keyframes; spectacle WebGL/GSAP chạy cho mọi người (đánh đổi a11y).

  const mobileish =
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const lowPower =
    (nav.hardwareConcurrency ?? 8) < 4 ||
    (nav.deviceMemory ?? 8) < 4 ||
    nav.connection?.saveData === true;

  if (mobileish || lowPower || !hasWebGL2()) return "mid";
  return "high";
}
