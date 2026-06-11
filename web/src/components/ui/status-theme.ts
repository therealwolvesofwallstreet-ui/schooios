// Lớp trừu tượng status → token màu (theo UI Grammar FRONTEND.md).
// TÁCH RIÊNG để: (1) StatusPill KHÔNG dùng case-display.STATUS_BADGE (amber/sky lệch palette);
// (2) thêm status mới ở backend = sửa 1 dòng tại đây, không rải khắp component.
// Quy ước: NEW = signal (mới, chưa xử lý — cần chú ý, HIẾM) · các trạng thái đang chạy = running (ink) ·
// RESOLVED/CLOSED = gold (đã ghi nhận). Nhãn VN vẫn lấy từ case-display.STATUS_LABEL (1-chiều).
import type { CaseStatus } from "@/lib/api-types";
import type { SignalTone } from "./SignalDot";

export const STATUS_TONE: Record<CaseStatus, SignalTone> = {
  NEW: "signal",
  TRIAGED: "running",
  ASSIGNED: "running",
  IN_PROGRESS: "running",
  WAITING_FOR_USER: "running",
  RESOLVED: "gold",
  CLOSED: "gold",
};
