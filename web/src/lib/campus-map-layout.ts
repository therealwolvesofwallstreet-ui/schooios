// Campus map layout — UPDATE D. Toạ độ + cấu trúc khu lấy TỪ design-vision/campus-map-ref.tsx
// (bản vẽ sơ đồ khuôn viên). NHÃN gợi ý + BIND lấy TỪ docs/data/campus.json (mã THẬT, KHÔNG đoán id).
// Mỗi area gắn 1 trong 3 kiểu bind:
//   • building   — tòa nhiều phòng (≥2 location): click MỞ nhóm dropdown của tòa để chọn phòng con.
//   • location   — địa điểm độc lập (tòa 1-phòng hoặc khu không thuộc tòa): click CHỌN luôn.
//   • decorative — cảnh quan (cột cờ) HOẶC khối không có địa điểm thật trong campus.json (căn tin 2):
//                  KHÔNG chọn được, chỉ trang trí.
// Mã (buildingCode/locationCode) đối chiếu campus.json; runtime CampusMap resolve sang id thật từ
// /api/locations — resolve hụt → log cảnh báo dev + render KHÔNG-clickable (chống submit rỗng).
// 0 hex: màu khu map từ type → token Tailwind (xem AREA_TOKENS).
import {
  MapPin,
  Car,
  Monitor,
  BookOpen,
  ForkKnife,
  Books,
  GraduationCap,
  Buildings,
  Trophy,
  Barbell,
  Medal,
  Waves,
  Flag,
} from "@phosphor-icons/react";
import type { IconComponent } from "@/components/app-shell/nav";

export type AreaType =
  | "academic"
  | "admin"
  | "sports"
  | "service"
  | "parking"
  | "entrance"
  | "landmark";

export type AreaBind =
  | { kind: "building"; buildingCode: string }
  | { kind: "location"; locationCode: string }
  | { kind: "decorative" };

export interface CampusArea {
  /** Key ổn định cho render/test (không hiển thị cho người dùng). */
  key: string;
  /** Nhãn gợi ý từ bản vẽ; nhãn THẬT hiển thị lấy từ dữ liệu API khi resolve được. */
  refLabel: string;
  /** % toạ độ trong khung bản đồ (top/left/width/height). */
  pos: { top: number; left: number; width: number; height: number };
  type: AreaType;
  Icon: IconComponent;
  bind: AreaBind;
}

// Toạ độ NGUYÊN BẢN từ campus-map-ref.tsx. Bind = đối chiếu campus.json (KHÔNG đoán).
export const CAMPUS_AREAS: CampusArea[] = [
  // — Lối vào / sân trước —
  { key: "gate", refLabel: "Cổng vào trường", pos: { top: 2, left: 10, width: 15, height: 5 }, type: "entrance", Icon: MapPin, bind: { kind: "location", locationCode: "ENTRY-1" } },
  { key: "parking-student", refLabel: "Nhà xe học sinh", pos: { top: 2, left: 38, width: 14, height: 10 }, type: "parking", Icon: Car, bind: { kind: "location", locationCode: "PKG-STUDENT-1" } },
  // — Khối học (tòa nhiều phòng → mở nhóm) —
  { key: "block-c", refLabel: "Dãy C", pos: { top: 12, left: 47, width: 16, height: 8 }, type: "academic", Icon: Monitor, bind: { kind: "building", buildingCode: "C" } },
  { key: "block-a", refLabel: "Dãy A", pos: { top: 22, left: 45, width: 8, height: 32 }, type: "academic", Icon: BookOpen, bind: { kind: "building", buildingCode: "A" } },
  { key: "block-b", refLabel: "Dãy B", pos: { top: 22, left: 57, width: 8, height: 32 }, type: "academic", Icon: BookOpen, bind: { kind: "building", buildingCode: "B" } },
  // — Dịch vụ —
  { key: "canteen-1", refLabel: "Căn tin", pos: { top: 10, left: 75, width: 10, height: 15 }, type: "service", Icon: ForkKnife, bind: { kind: "location", locationCode: "CANTEEN-1" } },
  // campus.json CHỈ có 1 căn tin (CANTEEN-1) → khối thứ 2 trên bản vẽ là TRANG TRÍ (không có địa điểm thật).
  { key: "canteen-2-decor", refLabel: "Cảnh quan", pos: { top: 27, left: 75, width: 10, height: 15 }, type: "service", Icon: ForkKnife, bind: { kind: "decorative" } },
  // — Thư viện / hành chính —
  { key: "library", refLabel: "Thư viện điện tử", pos: { top: 38, left: 28, width: 13, height: 16 }, type: "academic", Icon: Books, bind: { kind: "building", buildingCode: "LIB" } },
  { key: "admin", refLabel: "Khu Hiệu bộ", pos: { top: 58, left: 26, width: 15, height: 26 }, type: "admin", Icon: GraduationCap, bind: { kind: "location", locationCode: "ADMIN-1" } },
  // Cột cờ = cảnh quan trung tâm (location FLAG-1 vẫn chọn được qua danh sách); trên bản đồ chỉ trang trí.
  { key: "flagpole", refLabel: "Cột cờ", pos: { top: 62, left: 54, width: 2, height: 10 }, type: "landmark", Icon: Flag, bind: { kind: "decorative" } },
  { key: "block-d", refLabel: "Dãy D", pos: { top: 58, left: 57, width: 8, height: 26 }, type: "academic", Icon: BookOpen, bind: { kind: "building", buildingCode: "D" } },
  { key: "tradition", refLabel: "Nhà truyền thống", pos: { top: 88, left: 38, width: 18, height: 6 }, type: "admin", Icon: Buildings, bind: { kind: "location", locationCode: "Trad-1" } },
  { key: "parking-teacher", refLabel: "Nhà xe giáo viên", pos: { top: 68, left: 8, width: 8, height: 18 }, type: "parking", Icon: Car, bind: { kind: "location", locationCode: "PKG-TEACHER-1" } },
  // — Khu thể thao —
  { key: "football", refLabel: "Sân bóng đá", pos: { top: 46, left: 75, width: 11, height: 11 }, type: "sports", Icon: Trophy, bind: { kind: "location", locationCode: "SOCCER-1" } },
  { key: "basketball", refLabel: "Sân bóng rổ", pos: { top: 59, left: 76.5, width: 8, height: 9 }, type: "sports", Icon: Barbell, bind: { kind: "location", locationCode: "BASKET-1" } },
  { key: "volleyball", refLabel: "Sân bóng chuyền", pos: { top: 70, left: 76.5, width: 8, height: 9 }, type: "sports", Icon: Medal, bind: { kind: "location", locationCode: "VOLLEY-1" } },
  { key: "gymnasium", refLabel: "Nhà thi đấu đa năng", pos: { top: 62, left: 67, width: 8, height: 22 }, type: "sports", Icon: Barbell, bind: { kind: "building", buildingCode: "GYM" } },
  { key: "pool", refLabel: "Hồ bơi", pos: { top: 83, left: 74, width: 11, height: 11 }, type: "sports", Icon: Waves, bind: { kind: "location", locationCode: "POOL-1" } },
];

// type → token Tailwind (KHÔNG hex). Reinterpret palette bản vẽ sang token WARM dự án:
//   academic Khaki·Line2·Espresso · admin Camel·Caramel·Linen · sports Olive·Cocoa·Linen ·
//   service Linen·Line2·Cocoa · parking nét đứt Camel · entrance Cowhide(depth) · landmark Wine(signal).
export interface AreaToken {
  fill: string;
  border: string;
  text: string;
  dashed?: boolean;
}
export const AREA_TOKENS: Record<AreaType, AreaToken> = {
  academic: { fill: "bg-sunken", border: "border-line-2", text: "text-ink" },
  admin: { fill: "bg-mute", border: "border-link", text: "text-paper-raised" },
  sports: { fill: "bg-rare", border: "border-ink-2", text: "text-paper-raised" },
  service: { fill: "bg-paper-raised", border: "border-line-2", text: "text-ink-2" },
  parking: { fill: "bg-transparent", border: "border-mute", text: "text-ink-2", dashed: true },
  entrance: { fill: "bg-depth", border: "border-depth-sunken", text: "text-on-depth" },
  landmark: { fill: "bg-transparent", border: "border-transparent", text: "text-signal" },
};

export const AREA_TYPE_LABEL: Record<AreaType, string> = {
  academic: "Học tập & Thực hành",
  admin: "Khu Hành chính",
  sports: "Khu Thể thao",
  service: "Dịch vụ · Căn tin",
  parking: "Nhà để xe",
  entrance: "Lối ra vào",
  landmark: "Cảnh quan",
};
