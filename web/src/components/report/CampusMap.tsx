"use client";

// UPDATE D — Bản đồ khuôn viên TƯƠNG TÁC (SVG/DOM thuần, KHÔNG WebGL/canvas). Mỗi khu là 1 <button>
// định vị tuyệt đối theo % (toạ độ từ campus-map-layout.ts) → tỉ lệ co giãn theo khung (mobile OK).
// Click:
//   • location bind  → CHỌN luôn (set locationId thật).
//   • building bind  → onSelectBuilding(buildingId) → caller mở nhóm dropdown tòa đó.
//   • decorative     → no-op (cảnh quan, con trỏ default).
// Mã không khớp /api/locations → KHÔNG clickable + console.warn (dev) — chống submit rỗng (§4).
// 0 hex (token theo type), micro-motion = CSS transition token (không useReducedMotion).
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/cn";
import type { LocationDTO } from "@/lib/api-types";
import {
  AREA_TOKENS,
  AREA_TYPE_LABEL,
  CAMPUS_AREAS,
  type AreaType,
  type CampusArea,
} from "@/lib/campus-map-layout";

type Resolved =
  | { status: "location"; loc: LocationDTO }
  | { status: "building"; buildingId: string; name: string }
  | { status: "decorative" }
  | { status: "unresolved" };

interface CampusMapProps {
  locations: LocationDTO[];
  selected: LocationDTO | null;
  onSelectLocation: (id: string) => void;
  onSelectBuilding: (buildingId: string) => void;
}

// Type có mặt trên bản đồ (cho chú giải) — bỏ landmark (chỉ trang trí, không phải địa điểm).
const LEGEND_TYPES: AreaType[] = ["academic", "admin", "sports", "service", "parking", "entrance"];

export function CampusMap({
  locations,
  selected,
  onSelectLocation,
  onSelectBuilding,
}: CampusMapProps) {
  const { locByCode, buildingByCode } = useMemo(() => {
    const locByCode = new Map<string, LocationDTO>();
    const buildingByCode = new Map<string, { id: string; name: string }>();
    for (const l of locations) {
      locByCode.set(l.code, l);
      if (l.buildingId && l.building) {
        buildingByCode.set(l.building.code, { id: l.buildingId, name: l.building.name });
      }
    }
    return { locByCode, buildingByCode };
  }, [locations]);

  const resolve = useMemo(() => {
    return (area: CampusArea): Resolved => {
      if (area.bind.kind === "decorative") return { status: "decorative" };
      if (area.bind.kind === "location") {
        const loc = locByCode.get(area.bind.locationCode);
        return loc ? { status: "location", loc } : { status: "unresolved" };
      }
      const b = buildingByCode.get(area.bind.buildingCode);
      return b ? { status: "building", buildingId: b.id, name: b.name } : { status: "unresolved" };
    };
  }, [locByCode, buildingByCode]);

  // Dev-only: cảnh báo rõ khu nào không khớp campus.json (KHÔNG im lặng — §4).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (locations.length === 0) return;
    const missing = CAMPUS_AREAS.filter((a) => resolve(a).status === "unresolved").map((a) => {
      const code = a.bind.kind === "location" ? a.bind.locationCode : a.bind.kind === "building" ? a.bind.buildingCode : "";
      return `${a.key}(${code})`;
    });
    if (missing.length) {
      console.warn(
        `[CampusMap] ${missing.length} khu không khớp /api/locations → không clickable:`,
        missing.join(", "),
      );
    }
  }, [resolve, locations.length]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-3 text-xs">
        Chạm một khu để chọn. Khu nhiều phòng (Dãy A-D, Thư viện, Nhà thi đấu) sẽ mở danh sách phòng
      </p>

      <div className="border-line bg-paper-raised relative aspect-[16/11] w-full overflow-hidden rounded-lg border">
        {CAMPUS_AREAS.map((area) => (
          <AreaButton
            key={area.key}
            area={area}
            resolved={resolve(area)}
            selected={selected}
            onSelectLocation={onSelectLocation}
            onSelectBuilding={onSelectBuilding}
          />
        ))}
      </div>

      {/* Chú giải phân khu (token-only). */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Chú giải phân khu">
        {LEGEND_TYPES.map((t) => {
          const tk = AREA_TOKENS[t];
          return (
            <li key={t} className="text-ink-3 flex items-center gap-1.5 text-[11px]">
              <span
                className={cn(
                  "size-3 shrink-0 rounded-sm border",
                  tk.fill === "bg-transparent" ? "bg-paper" : tk.fill,
                  tk.border,
                  tk.dashed && "border-dashed",
                )}
              />
              {AREA_TYPE_LABEL[t]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AreaButton({
  area,
  resolved,
  selected,
  onSelectLocation,
  onSelectBuilding,
}: {
  area: CampusArea;
  resolved: Resolved;
  selected: LocationDTO | null;
  onSelectLocation: (id: string) => void;
  onSelectBuilding: (buildingId: string) => void;
}) {
  const tk = AREA_TOKENS[area.type];
  const pos = {
    top: `${area.pos.top}%`,
    left: `${area.pos.left}%`,
    width: `${area.pos.width}%`,
    height: `${area.pos.height}%`,
  };
  const clickable = resolved.status === "location" || resolved.status === "building";
  const isSelected =
    (resolved.status === "location" && selected?.id === resolved.loc.id) ||
    (resolved.status === "building" && selected?.buildingId === resolved.buildingId);

  const shape = area.type === "entrance" ? "rounded-full" : "rounded-[4px]";
  const baseBox = cn(
    "absolute flex flex-col items-center justify-center gap-0.5 border p-1 text-center ease-quiet transition-all duration-200",
    shape,
    tk.fill,
    tk.border,
    tk.text,
    tk.dashed && "border-dashed",
  );

  // Cảnh quan / khu không khớp dữ liệu → KHÔNG tương tác (không chọn được).
  if (!clickable) {
    return (
      <div
        aria-hidden
        style={pos}
        className={cn(baseBox, "pointer-events-none opacity-50")}
        data-area={area.key}
        data-decorative="true"
      >
        {area.type === "landmark" ? (
          <span className="bg-ink-2/70 h-3/4 w-[2px] rounded-full" />
        ) : (
          <span className="px-0.5 text-[8px] leading-[1.1] break-words text-center sm:text-[10px]">
            {area.refLabel}
          </span>
        )}
      </div>
    );
  }

  const realName = resolved.status === "location" ? resolved.loc.name : resolved.name;
  const ariaLabel =
    resolved.status === "building" ? `${realName} - mở danh sách phòng` : realName;
  // YÊU CẦU: KHÔNG icon trên bản đồ — TRỪ duy nhất cổng trường (entrance). Mọi khu khác chỉ hiện
  // NHÃN, cho chữ XUỐNG DÒNG (break-words, không truncate) + thu nhỏ font để chữ dài (vd "Nhà thi
  // đấu đa năng") luôn vừa trong ô, không tràn/biến mất.
  const isGate = area.type === "entrance";

  return (
    <button
      type="button"
      style={pos}
      data-area={area.key}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={() =>
        resolved.status === "location"
          ? onSelectLocation(resolved.loc.id)
          : onSelectBuilding(resolved.buildingId)
      }
      className={cn(
        baseBox,
        "focus-visible:outline-signal cursor-pointer hover:z-20 hover:-translate-y-0.5 hover:shadow-md focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2",
        isSelected &&
          "outline-signal z-30 outline outline-2 outline-offset-2",
        // Khu trong suốt (nhà xe) khi chọn cần nền để nổi viền.
        isSelected && tk.fill === "bg-transparent" && "bg-sunken",
      )}
    >
      {isGate ? (
        <area.Icon size={15} weight={isSelected ? "fill" : "regular"} className="shrink-0" />
      ) : (
        <span className="w-full px-0.5 text-[8px] leading-[1.1] font-medium break-words text-center sm:text-[10px]">
          {realName}
        </span>
      )}
    </button>
  );
}
