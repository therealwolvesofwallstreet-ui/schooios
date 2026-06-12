"use client";
// PULSEFIELD · REDUCED tier [LAW] (motion §7) — DOM/SVG TĨNH, KHÔNG canvas/animation. Cùng topology
// (field-data) với high/mid nhưng đứng yên ⇒ reduced 2-shot 0-diff. Vật mang nghĩa thật là số/sổ ở
// AdminHome; đây chỉ trang trí (aria-hidden). Render khi reducedMotion=true (luật seam) hoặc SSR/fallback.
import { useMemo } from "react";
import {
  DESIGN_HALF_W,
  buildLinks,
  buildNodes,
  deriveField,
  readPalette,
  swatchForKind,
} from "./field-data";
import type { DashboardResponse } from "@/lib/api-types";

// viewBox design-space → pixel: x∈[-2.6,2.6]→[0,VB_W], y∈[-1,1]→[0,VB_H]. slice = phủ kín hộp.
const VB_W = 520;
const VB_H = 100;
const sx = (x: number) => ((x + DESIGN_HALF_W) / (DESIGN_HALF_W * 2)) * VB_W;
const sy = (y: number) => ((y + 1) / 2) * VB_H;

export default function PulseFieldStatic({
  metrics,
}: {
  metrics: DashboardResponse | null;
}) {
  const { nodes, links, palette } = useMemo(() => {
    const spec = deriveField(metrics);
    const ns = buildNodes(spec);
    return { nodes: ns, links: buildLinks(ns), palette: readPalette() };
  }, [metrics]);

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Sợi mạng — hairline Camel mờ. */}
      <g stroke={palette.mute.hex} strokeWidth={0.4} opacity={0.32}>
        {links.map(([i, j], k) => {
          const a = nodes[i]!;
          const b = nodes[j]!;
          return <line key={k} x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} />;
        })}
      </g>
      {/* Node — tròn warm theo kind; hot có quầng signal mờ (TĨNH). */}
      <g>
        {nodes.map((n, i) => {
          const sw = swatchForKind(palette, n.kind);
          const r = 0.9 + n.seed * 1.0 + (n.hot ? 0.8 : 0);
          return (
            <g key={i}>
              {n.hot && (
                <circle cx={sx(n.x)} cy={sy(n.y)} r={r + 2.6} fill={palette.signal.hex} opacity={0.14} />
              )}
              <circle cx={sx(n.x)} cy={sy(n.y)} r={r} fill={sw.hex} opacity={n.hot ? 0.95 : 0.6} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
