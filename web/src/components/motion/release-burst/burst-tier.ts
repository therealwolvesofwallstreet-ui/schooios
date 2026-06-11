// Tier cho Release Burst — nay là alias mỏng của stage-tier (SSOT tổng quát ../stage/stage-tier).
// Giữ tên cũ (detectBurstTier/BurstTier) để ReleaseBurst + styleguide/burst KHÔNG phải đổi import.
//   reduced [LAW]  — prefers-reduced-motion → DOM-fade tĩnh, KHÔNG particle (motion §7).
//   mid     [PATTERN] — mobile / máy yếu / không WebGL2 → Canvas 2D.
//   high    [ONE-OFF] — desktop đủ lực + WebGL2 → R3F GPU particles.
export { detectStageTier as detectBurstTier, hasWebGL2 } from "../stage/stage-tier";
export type { StageTier as BurstTier } from "../stage/stage-tier";
