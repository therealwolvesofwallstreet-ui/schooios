"use client";

// Vote up/down trên case. PUT { value: 1 | -1 } hoặc DELETE (bỏ vote).
// Toggle logic: nếu bấm cùng value đang có → DELETE (bỏ vote); ngược lại → PUT mới value.
// Optimistic update cập nhật myVote/upCount/downCount/score ngay; rollback khi lỗi.
// Không retry=false vì PUT vote là idempotent (upsert); DELETE cũng idempotent.
import { apiFetch } from "@/lib/api";
import { useOptimisticMutation } from "./useOptimisticMutation";
import { caseDetailKey } from "./useCaseDetail";
import type { VoteResponse } from "@/lib/api-types";

export function useVoteCase(caseId: string) {

  const put = useOptimisticMutation<VoteResponse, 1 | -1>({
    mutationFn: (value) => apiFetch<VoteResponse>(`/api/cases/${caseId}/vote`, { method: "PUT", body: { value } }),
    invalidateKeys: [caseDetailKey(caseId)],
    successMessage: "",
  });

  const del = useOptimisticMutation<VoteResponse, void>({
    mutationFn: () => apiFetch<VoteResponse>(`/api/cases/${caseId}/vote`, { method: "DELETE" }),
    invalidateKeys: [caseDetailKey(caseId)],
    successMessage: "",
  });

  function vote(value: 1 | -1, currentMyVote: 1 | -1 | null) {
    if (currentMyVote === value) {
      del.mutate();
    } else {
      put.mutate(value);
    }
  }

  const isPending = put.isPending || del.isPending;

  return { vote, isPending };
}
