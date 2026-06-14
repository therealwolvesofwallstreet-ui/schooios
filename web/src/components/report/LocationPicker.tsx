"use client";

// UPDATE D — Chọn ĐỊA ĐIỂM gọn (thay danh sách phẳng ~96 mục phải cuộn dài). Hai đường dẫn cùng
// set MỘT `locationId` thật (single source of truth ở caller):
//   • "Danh sách" — dropdown PHÂN CẤP theo tòa (accordion đóng-sẵn → ngắn) + mục độc lập.
//   • "Bản đồ"    — sơ đồ khuôn viên tương tác (click khu → chọn / mở nhóm tòa).
// FE-ONLY: đọc /api/locations (đóng băng) qua caller; KHÔNG đổi contract. Server vẫn là chân lý cho id.
// 0 hex (token), 0 dep mới (icon phosphor), micro-motion = CSS transition token (gãy theo reduced-motion
// toàn cục) → KHÔNG useReducedMotion.
import { useMemo, useState } from "react";
import { CaretDown, ListDashes, MapTrifold, X } from "@phosphor-icons/react";
import { ChoiceList, type Choice } from "@/components/report/ChoiceList";
import { CampusMap } from "@/components/report/CampusMap";
import { ErrorState } from "@/components/app/states";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SignalDot } from "@/components/ui/SignalDot";
import { cn } from "@/lib/cn";
import type { BuildingRef, LocationDTO } from "@/lib/api-types";

export interface LocationGroup {
  buildingId: string;
  building: BuildingRef;
  locations: LocationDTO[];
}

const byCode = (a: LocationDTO, b: LocationDTO) =>
  a.code.localeCompare(b.code, undefined, { numeric: true });

// Nhóm theo tòa: tòa ≥2 phòng → nhóm mở-rộng; tòa 1-phòng HOẶC không thuộc tòa → mục độc lập.
export function groupLocations(locations: LocationDTO[]): {
  groups: LocationGroup[];
  standalone: LocationDTO[];
} {
  const byBuilding = new Map<string, { building: BuildingRef; locs: LocationDTO[] }>();
  const standalone: LocationDTO[] = [];
  for (const l of locations) {
    if (l.buildingId && l.building) {
      const e = byBuilding.get(l.buildingId) ?? { building: l.building, locs: [] };
      e.locs.push(l);
      byBuilding.set(l.buildingId, e);
    } else {
      standalone.push(l);
    }
  }
  const groups: LocationGroup[] = [];
  for (const [buildingId, e] of byBuilding) {
    if (e.locs.length >= 2) {
      groups.push({ buildingId, building: e.building, locations: [...e.locs].sort(byCode) });
    } else {
      standalone.push(...e.locs); // tòa 1-phòng → chọn trực tiếp
    }
  }
  groups.sort((a, b) => a.building.code.localeCompare(b.building.code));
  standalone.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  return { groups, standalone };
}

interface LocationPickerProps {
  value: string | null;
  /** id thật của Location (hoặc null khi bỏ chọn) — caller set vào payload createCase. */
  onChange: (id: string | null) => void;
  locations: LocationDTO[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function LocationPicker({
  value,
  onChange,
  locations,
  isLoading,
  isError,
  onRetry,
}: LocationPickerProps) {
  const [mode, setMode] = useState<"list" | "map">("list");
  const [openBuildingId, setOpenBuildingId] = useState<string | null>(null);

  const { groups, standalone } = useMemo(() => groupLocations(locations), [locations]);
  const selected = useMemo(
    () => locations.find((l) => l.id === value) ?? null,
    [locations, value],
  );

  // Click khu-tòa trên bản đồ → về "Danh sách" + mở sẵn nhóm tòa đó để chọn phòng (liên kết 2 path).
  // Tòa chỉ 1 phòng (không thành group) → chọn luôn phòng đó.
  function openBuilding(buildingId: string) {
    const group = groups.find((g) => g.buildingId === buildingId);
    if (group) {
      setMode("list");
      setOpenBuildingId(buildingId);
    } else {
      const only = locations.find((l) => l.buildingId === buildingId);
      if (only) onChange(only.id);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tóm tắt đã chọn — luôn dạng CHỮ (mobile đọc được ngay, không phụ thuộc bản đồ). */}
      {selected && (
        <div
          data-testid="location-summary"
          className="border-line bg-sunken/50 flex items-center justify-between gap-3 rounded-md border px-3 py-2"
        >
          <span className="text-ink min-w-0 truncate text-sm">
            <span className="text-ink-3 font-mono text-[11px] tracking-wider uppercase">Đã chọn </span>
            {selected.building ? `${selected.building.name} · ` : ""}
            <span className="font-medium">{selected.name}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-ink-3 hover:text-ink ease-quiet flex shrink-0 items-center gap-1 text-xs underline-offset-4 transition-colors duration-150 hover:underline"
          >
            <X size={13} weight="bold" /> Bỏ chọn
          </button>
        </div>
      )}

      {/* Toggle cách chọn. */}
      <div
        role="group"
        aria-label="Cách chọn địa điểm"
        className="border-line inline-flex self-start rounded-full border p-0.5"
      >
        <ModeButton active={mode === "list"} onClick={() => setMode("list")} Icon={ListDashes}>
          Danh sách
        </ModeButton>
        <ModeButton active={mode === "map"} onClick={() => setMode("map")} Icon={MapTrifold}>
          Bản đồ
        </ModeButton>
      </div>

      {/* States dùng chung cho cả 2 mode. */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState compact onRetry={onRetry} message="Không tải được danh sách địa điểm" />
      ) : locations.length === 0 ? (
        <EmptyState message="Chưa có địa điểm nào" className="py-10" />
      ) : mode === "list" ? (
        <ListMode
          groups={groups}
          standalone={standalone}
          value={value}
          onSelect={onChange}
          openBuildingId={openBuildingId}
          setOpenBuildingId={setOpenBuildingId}
        />
      ) : (
        <CampusMap
          locations={locations}
          selected={selected}
          onSelectLocation={(id) => onChange(id)}
          onSelectBuilding={openBuilding}
        />
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof ListDashes;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "focus-visible:outline-ink ease-quiet flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2",
        active ? "bg-sunken text-ink font-medium" : "text-ink-2 hover:text-ink",
      )}
    >
      <Icon size={14} weight={active ? "fill" : "regular"} />
      {children}
    </button>
  );
}

function ListMode({
  groups,
  standalone,
  value,
  onSelect,
  openBuildingId,
  setOpenBuildingId,
}: {
  groups: LocationGroup[];
  standalone: LocationDTO[];
  value: string | null;
  onSelect: (id: string) => void;
  openBuildingId: string | null;
  setOpenBuildingId: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-col">
      {groups.map((g) => {
        const open = openBuildingId === g.buildingId;
        const selectedInGroup = g.locations.find((l) => l.id === value) ?? null;
        const panelId = `loc-group-${g.buildingId}`;
        return (
          <div key={g.buildingId} className="border-line border-b">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenBuildingId(open ? null : g.buildingId)}
              className="hover:bg-sunken/60 focus-visible:bg-sunken ease-quiet flex w-full items-center gap-3 py-3.5 text-left outline-none transition-colors duration-150"
            >
              <SignalDot tone={selectedInGroup ? "running" : "dormant"} size="md" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "text-sm",
                    selectedInGroup ? "text-ink font-medium" : "text-ink-2",
                  )}
                >
                  {g.building.name}
                </span>
                <span className="text-ink-3 mt-0.5 truncate text-xs">
                  {selectedInGroup
                    ? `Đã chọn: ${selectedInGroup.name}`
                    : `${g.locations.length} địa điểm`}
                </span>
              </span>
              <CaretDown
                size={15}
                className={cn(
                  "text-ink-3 ease-quiet shrink-0 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </button>
            {open && (
              <div id={panelId} className="pb-2 pl-6">
                <ChoiceList
                  aria-label={g.building.name}
                  items={g.locations.map(toChoice)}
                  value={value}
                  onChange={onSelect}
                />
              </div>
            )}
          </div>
        );
      })}

      {standalone.length > 0 && (
        <div className="pt-1">
          <ChoiceList
            aria-label="Khu vực khác"
            items={standalone.map(toChoice)}
            value={value}
            onChange={onSelect}
          />
        </div>
      )}
    </div>
  );
}

function toChoice(l: LocationDTO): Choice {
  return { id: l.id, label: l.name, hint: l.code };
}
