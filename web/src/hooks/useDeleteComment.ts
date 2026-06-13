"use client";

// Xoá comment (soft-delete) — DELETE /api/cases/[id]/comments/[commentId].
// Invalidate case detail để reload comment list (đã lọc deletedAt IS NULL).
import { api } from "@/lib/api";
import { useOptimisticMutation } from "./useOptimisticMutation";
import { caseDetailKey } from "./useCaseDetail";

export function useDeleteComment(caseId: string) {
  return useOptimisticMutation<{ deleted: boolean }, string>({
    mutationFn: (commentId) => api.del<{ deleted: boolean }>(`/api/cases/${caseId}/comments/${commentId}`),
    invalidateKeys: [caseDetailKey(caseId)],
    successMessage: "Đã xoá bình luận.",
    retry: false,
  });
}
