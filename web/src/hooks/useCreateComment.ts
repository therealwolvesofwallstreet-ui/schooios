"use client";

// POST /api/cases/[id]/comments → bình luận mới (kèm author). retry:false — POST KHÔNG idempotent:
// retry trên 503 (commit-ambiguity qua pooler) sẽ sinh comment TRÙNG ÂM THẦM (giống useCreateCase).
// 400 KHÔNG toast — composer đọc mutation.error.body.details/error để hiện inline. Invalidate ["cases",id]
// để Spine tải lại thread (comments[] nằm trong GET detail). isInternal chỉ STAFF/ADMIN (gate ở composer).
import { useOptimisticMutation } from "./useOptimisticMutation";
import { caseDetailKey } from "./useCaseDetail";
import { api } from "@/lib/api";
import type { CommentResponse } from "@/lib/api-types";

export function useCreateComment(caseId: string) {
  return useOptimisticMutation<CommentResponse, { body: string; isInternal?: boolean }>({
    mutationFn: (vars) => api.post<CommentResponse>(`/api/cases/${caseId}/comments`, vars),
    invalidateKeys: [caseDetailKey(caseId)],
    retry: false,
  });
}
