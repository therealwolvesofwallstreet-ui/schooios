"use client";

// Hành động hợp lệ cho 1 case theo (state machine ∩ quyền-role). Nguồn: ALLOWED_NEXT (bản sao
// hiển thị của workflow.ALLOWED_TRANSITIONS) + PERMISSION_TABLE. CHỈ để FE QUYẾT RENDER nút nào —
// server vẫn enforce (400 transition sai / 403 thiếu quyền). ASSIGNED không nằm trong ALLOWED_NEXT
// của bất kỳ status nào ⇒ luật "KHÔNG /status→ASSIGNED" tự thoả. AUDITOR/STUDENT → 0 hành động.
import { ALLOWED_NEXT } from "@/lib/case-display";
import { usePermissionView } from "./usePermissionView";
import type { CaseStatus } from "@/lib/api-types";

export function useWorkflowTransitions(status: CaseStatus) {
  const { can } = usePermissionView();
  const nextStatuses = can("case:changeStatus") ? ALLOWED_NEXT[status] : [];
  const canAssign = can("case:assign", { status });
  const canSetEmergency = can("case:setEmergency");
  return { nextStatuses, canAssign, canSetEmergency };
}
