// Chọn tier cho Release Burst tại runtime (client-only).
//   reduced [LAW]  — prefers-reduced-motion → DOM-fade tĩnh, KHÔNG particle (motion §7).
//   mid     [PATTERN] — mobile / máy yếu / không WebGL2 → Canvas 2D.
//   high    [ONE-OFF] — desktop đủ lực + WebGL2 → R3F GPU particles.
export type BurstTier = "high" | "mid" | "reduced";

export function hasWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function detectBurstTier(): BurstTier {
  if (typeof window === "undefined") return "reduced";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduced";

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
