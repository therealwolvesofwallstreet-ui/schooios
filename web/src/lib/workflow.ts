// Nguồn DUY NHẤT của state machine vòng đời Case (P5). Mọi route đổi status phải hỏi file này.
// ALLOWED_TRANSITIONS: chỉ liệt kê chuyển status hợp lệ QUA endpoint /status.
//   ASSIGNED KHÔNG là target ở đây — nó CHỈ sinh ra qua endpoint /assign (đi kèm assignedToId),
//   nếu không sẽ tạo case "đã giao nhưng không có người nhận" → bất nhất.
// Quy tắc chống lỗi gõ: chỉ dùng MEMBER enum (CaseStatus.*), không literal chuỗi; kiểu
//   Record<CaseStatus, CaseStatus[]> ép ĐỦ 7 khoá + giá trị đúng kiểu → thiếu/sai khoá = lỗi tsc.
import { CaseStatus } from "@/generated/prisma/client";

export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.NEW]: [CaseStatus.TRIAGED],
  [CaseStatus.TRIAGED]: [], // ASSIGNED chỉ qua /assign
  [CaseStatus.ASSIGNED]: [CaseStatus.IN_PROGRESS],
  [CaseStatus.IN_PROGRESS]: [CaseStatus.WAITING_FOR_USER, CaseStatus.RESOLVED],
  [CaseStatus.WAITING_FOR_USER]: [CaseStatus.IN_PROGRESS, CaseStatus.RESOLVED],
  [CaseStatus.RESOLVED]: [CaseStatus.CLOSED, CaseStatus.IN_PROGRESS], // đóng hoặc mở lại
  [CaseStatus.CLOSED]: [], // terminal
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// Timestamp side-effects khi đổi status (Partial → spread thẳng vào data update).
//   → RESOLVED: set resolvedAt · → CLOSED: set closedAt · reopen (RESOLVED→IN_PROGRESS): clear resolvedAt.
export function statusSideEffects(
  to: CaseStatus,
  from: CaseStatus,
): Partial<{ resolvedAt: Date | null; closedAt: Date | null }> {
  if (to === CaseStatus.RESOLVED) return { resolvedAt: new Date() };
  if (to === CaseStatus.CLOSED) return { closedAt: new Date() };
  if (from === CaseStatus.RESOLVED && to === CaseStatus.IN_PROGRESS) return { resolvedAt: null };
  return {};
}

// Sentinel ném TRONG $transaction khi thua optimistic-lock (updateMany count !== 1) → route map ra 409.
// Định nghĩa ở đây (dùng chung 2 route) để 409-sentinel chỉ tồn tại ở MỘT nơi.
export class ConflictError extends Error {}
