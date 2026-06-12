// Tuổi vụ việc — suy luận CLIENT từ `createdAt`. ⚠ KHÔNG phải SLA/`dueAt` thật, KHÔNG phải giá trị
// server: chỉ là chỉ-báo tồn-đọng phía hiển thị. Ngưỡng 'stale' (mở ∧ ≥7 ngày) KHỚP định nghĩa
// "stale" của dashboard (docs/API.md). Tính client (list fetch client-side → 0 SSR value) ⇒ 0 hydration
// mismatch. Đồng status đóng (RESOLVED/CLOSED) ⇒ isOpen=false ⇒ KHÔNG bao giờ aging/stale.
import type { CaseStatus } from "@/lib/api-types";

const DAY_MS = 86_400_000;
const CLOSED_STATUSES: CaseStatus[] = ["RESOLVED", "CLOSED"];

export type AgingTier = "fresh" | "aging" | "stale";

export interface CaseAge {
  days: number;
  tier: AgingTier;
  isOpen: boolean;
}

export function caseAge(createdAt: string, status: CaseStatus): CaseAge {
  const isOpen = !CLOSED_STATUSES.includes(status);
  const created = new Date(createdAt).getTime();
  const days = Number.isNaN(created) ? 0 : Math.floor((Date.now() - created) / DAY_MS);
  let tier: AgingTier = "fresh";
  if (isOpen && days >= 7) tier = "stale";
  else if (isOpen && days >= 2) tier = "aging";
  return { days, tier, isOpen };
}
