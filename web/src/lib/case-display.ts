import type { CaseStatus, CasePriority } from "@/lib/api-types";

// MỘT CHIỀU: enum (nguồn = API) → nhãn VN + class màu để HIỂN THỊ. KHÔNG dùng nhãn VN làm dữ liệu;
// đổi status luôn gọi PATCH /status với ENUM thật. (Đồng bộ DATA_MODEL CaseStatus 7 trạng thái.)

export const STATUS_LABEL: Record<CaseStatus, string> = {
  NEW: "Chờ tiếp nhận",
  TRIAGED: "Đã phân loại",
  ASSIGNED: "Đã giao",
  IN_PROGRESS: "Đang xử lý",
  WAITING_FOR_USER: "Chờ phản hồi",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
};

export const STATUS_BADGE: Record<CaseStatus, string> = {
  NEW: "bg-amber-100 text-amber-700",
  TRIAGED: "bg-sky-100 text-sky-700",
  ASSIGNED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  WAITING_FOR_USER: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-200 text-slate-600",
};

export const STATUS_ORDER: CaseStatus[] = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "RESOLVED",
  "CLOSED",
];

export const PRIORITY_LABEL: Record<CasePriority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
};

export const PRIORITY_BADGE: Record<CasePriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export const PRIORITY_ORDER: CasePriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Bản SAO hiển thị của workflow.ts ALLOWED_TRANSITIONS (server là nguồn sự thật & enforce 400).
// Dùng để CHỈ hiện nút status hợp lệ — KHÔNG thay thế kiểm tra server.
export const ALLOWED_NEXT: Record<CaseStatus, CaseStatus[]> = {
  NEW: ["TRIAGED"],
  TRIAGED: [], // ASSIGNED chỉ sinh qua /assign
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING_FOR_USER", "RESOLVED"],
  WAITING_FOR_USER: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

export function formatDateTime(iso: string): string {
  // Hiển thị giờ địa phương VN; dữ liệu gốc là ISO/UTC từ server.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
