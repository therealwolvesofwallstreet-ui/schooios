"use client";

// POST /api/cases qua useOptimisticMutation (hợp đồng lỗi: 400 KHÔNG toast — form đọc details;
// 409 reload; 429/503/403 toast). Body dùng `sensitive`/`emergency` (KHÔNG isSensitive/isEmergency),
// KHÔNG gửi id/caseCode/status (server tự sinh). 201 → { case } có caseCode → đẩy lên caller (burst).
// KHÔNG successMessage: RELEASE BURST chính là lời xác nhận, tránh toast tranh chấp.
//
// retry:false — POST create KHÔNG idempotent (không version-guard như PATCH). Auto-retry trên 503 do
// commit-ambiguity (mất ack lúc commit qua pooler) sẽ tạo case TRÙNG ÂM THẦM. Tắt auto-retry: 503 →
// báo lỗi 1 lần để người dùng tự quyết. (Khử trùng tuyệt đối khi user tự retry cần idempotency key
// phía server — RESIDUAL, ngoài phạm vi FE/F2.2; xem docs/frontend-roadmap.md F2-2D.)
import { useOptimisticMutation } from "./useOptimisticMutation";
import { api } from "@/lib/api";
import type { CaseListItem, CasePriority, CaseResponse } from "@/lib/api-types";

export interface CreateCaseInput {
  title: string;
  description: string;
  categoryId: string;
  locationId?: string;
  priority?: CasePriority;
  /** Ý chí "cần xử lý ngay" của người báo (KHÔNG phải cờ isEmergency chính thức). */
  emergency?: boolean;
  /** Riêng tư theo loại (server escalate-only). KHÔNG phải isSensitive. */
  sensitive?: boolean;
}

export function useCreateCase(opts: { onCreated: (created: CaseListItem) => void }) {
  return useOptimisticMutation<CaseResponse, CreateCaseInput>({
    mutationFn: (input) => api.post<CaseResponse>("/api/cases", input),
    invalidateKeys: [["cases"]], // forward-compat: queue F2-3 đọc lại danh sách
    retry: false, // POST không idempotent → KHÔNG auto-retry (chống case trùng); xem comment đầu file
    onSuccess: (data) => opts.onCreated(data.case as CaseListItem),
  });
}
