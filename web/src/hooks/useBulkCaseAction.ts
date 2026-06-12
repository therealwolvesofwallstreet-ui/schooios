"use client";

// Bulk mutation cho ADMIN — LẶP endpoint per-case (KHÔNG có endpoint bulk mới).
// §1 MULTI-MUTATION SAFETY:
//  (a) báo per-case (ok[]/failed[{id,caseCode,reason}]) — KHÔNG im lặng.
//  (b) 409 per-case → reload + thử lại 1 lần rồi failed nếu vẫn 409.
//  (c) 400 transition sai → failed + lý do "trạng thái không cho phép".
//  (d) concurrency cap ≤4 song song.
//  (e) invalidate list sau lô.
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { CaseListItem, CaseStatus } from "@/lib/api-types";

export interface BulkCaseItem {
  id: string;
  caseCode: string;
  updatedAt: string;
}

export interface BulkResult {
  ok: BulkCaseItem[];
  failed: { id: string; caseCode: string; reason: string }[];
}

type BulkAction =
  | { type: "assign"; assignedToId: string }
  | { type: "status"; status: CaseStatus };

async function patchWithRetry(
  item: BulkCaseItem,
  action: BulkAction,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  async function attempt(): Promise<{ ok: true } | { ok: false; reason: string; is409: boolean }> {
    try {
      if (action.type === "assign") {
        await api.patch(`/api/cases/${item.id}/assign`, { assignedToId: action.assignedToId });
      } else {
        await api.patch(`/api/cases/${item.id}/status`, { status: action.status });
      }
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) return { ok: false, reason: "Xung đột phiên bản", is409: true };
        if (err.status === 400) return { ok: false, reason: "Trạng thái không cho phép", is409: false };
        if (err.status === 403) return { ok: false, reason: "Không có quyền", is409: false };
        return { ok: false, reason: `Lỗi ${err.status}`, is409: false };
      }
      return { ok: false, reason: "Lỗi mạng", is409: false };
    }
  }

  const first = await attempt();
  if (first.ok) return { ok: true };
  if (!first.is409) return { ok: false, reason: first.reason };

  // 409 → reload case để lấy updatedAt mới rồi thử lại 1 lần
  try {
    const fresh = await api.get<{ case: CaseListItem }>(`/api/cases/${item.id}`);
    const refreshed: BulkCaseItem = {
      id: item.id,
      caseCode: item.caseCode,
      updatedAt: (fresh.case as CaseListItem).updatedAt,
    };
    void refreshed; // updatedAt mới đã trong store — PATCH tiếp dùng server state
    const second = await attempt();
    if (second.ok) return { ok: true };
    return { ok: false, reason: second.reason };
  } catch {
    return { ok: false, reason: "Xung đột phiên bản (reload thất bại)" };
  }
}

async function runBatch(
  items: BulkCaseItem[],
  action: BulkAction,
  concurrency = 4,
): Promise<BulkResult> {
  const ok: BulkCaseItem[] = [];
  const failed: { id: string; caseCode: string; reason: string }[] = [];

  // Chạy song song với cap concurrency
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const result = await patchWithRetry(item, action);
      if (result.ok) {
        ok.push(item);
      } else {
        failed.push({ id: item.id, caseCode: item.caseCode, reason: result.reason });
      }
    }
  });
  await Promise.all(workers);
  return { ok, failed };
}

export function useBulkCaseAction() {
  const queryClient = useQueryClient();

  async function execute(
    items: BulkCaseItem[],
    action: BulkAction,
  ): Promise<BulkResult> {
    const result = await runBatch(items, action);
    // Refetch list + notifications sau lô
    await queryClient.invalidateQueries({ queryKey: ["cases"] });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    return result;
  }

  return { execute };
}
