"use client";

// 3 mutation điều phối case (PATCH) qua useOptimisticMutation. CHUNG hợp đồng lỗi:
//  409 (ai đó vừa đổi) → invalidate (RELOAD hồ sơ lấy updatedAt mới) + toast, user tự thử lại bản mới.
// KHÔNG gửi updatedAt/expectedUpdatedAt: docs/API.md chốt body chỉ { ... } — lock là server-internal.
// GIỮ retry mặc định (429/503 ×3): retry một PATCH sau 503 commit-ambiguity KHÔNG thể sinh bản TRÙNG —
// status/assign/emergency là ĐẶT-GIÁ-TRỊ idempotent + server enforce; lần retry hoặc re-apply đúng giá
// trị (no-op) hoặc gặp trạng thái đã đổi → 409/400, KHÔNG có side-effect nhân đôi (KHÁC POST create/
// comment KHÔNG idempotent → phải retry:false). Invalidate cả ["cases"] (list) + ["notifications"]
// (badge server-truth) vì mutation sinh statusHistory/notification phía server.
import { useOptimisticMutation } from "./useOptimisticMutation";
import { caseDetailKey } from "./useCaseDetail";
import { api } from "@/lib/api";
import type { CaseResponse, CaseStatus } from "@/lib/api-types";

const invalidateFor = (caseId: string) =>
  [caseDetailKey(caseId), ["cases"], ["notifications"]] as const;

// PATCH /status — `status` ∈ ALLOWED_NEXT (UI chỉ hiện hợp lệ); ASSIGNED KHÔNG bao giờ ở đây.
export function useChangeStatus(caseId: string) {
  return useOptimisticMutation<CaseResponse, { status: CaseStatus; reason?: string }>({
    mutationFn: (vars) => api.patch<CaseResponse>(`/api/cases/${caseId}/status`, vars),
    invalidateKeys: invalidateFor(caseId),
    successMessage: "Đã cập nhật trạng thái.",
  });
}

// PATCH /assign — self-assign "Nhận xử lý": assignedToId = chính người dùng (lấy ở component).
export function useAssignCase(caseId: string) {
  return useOptimisticMutation<CaseResponse, { assignedToId: string }>({
    mutationFn: (vars) => api.patch<CaseResponse>(`/api/cases/${caseId}/assign`, vars),
    invalidateKeys: invalidateFor(caseId),
    successMessage: "Đã nhận xử lý.",
  });
}

// PATCH /emergency — flip cờ CHÍNH THỨC `isEmergency` (KHÁC studentFlaggedEmergency). Edge oxblood
// đổi tại chỗ chính là xác nhận → không cần successMessage.
export function useFlagEmergency(caseId: string) {
  return useOptimisticMutation<CaseResponse, { isEmergency: boolean; reason?: string }>({
    mutationFn: (vars) => api.patch<CaseResponse>(`/api/cases/${caseId}/emergency`, vars),
    invalidateKeys: invalidateFor(caseId),
  });
}
