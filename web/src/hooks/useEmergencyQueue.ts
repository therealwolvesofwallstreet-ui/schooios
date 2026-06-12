"use client";

// GET /api/cases/emergency → TUYẾN KHẨN: case đã xác nhận khẩn (isEmergency=true). Quyền: ADMIN/STAFF/
// AUDITOR; STUDENT → 403. Sensitivity ĐÃ gate Ở SERVER (OR:[{isSensitive:false},{assignedToId:me}]) —
// FE KHÔNG tự lọc/đoán, chỉ render những gì server trả. `activeOnly=true` → server loại RESOLVED/CLOSED.
// 403 TÁCH khỏi isError → UI hiện "ngoài quyền" điềm tĩnh thay vì lỗi-tải-lại (mirror useAudit). 401 →
// api.ts tự điều hướng /login. queryClient KHÔNG retry 403 (chỉ 429/503). staleTime:0 = server-truth.
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { EmergencyCasesResponse } from "@/lib/api-types";

export function useEmergencyQueue(activeOnly: boolean) {
  const q = useQuery({
    queryKey: ["cases", "emergency", { activeOnly }] as const,
    queryFn: () =>
      api.get<EmergencyCasesResponse>(
        `/api/cases/emergency${activeOnly ? "?activeOnly=true" : ""}`,
      ),
    staleTime: 0,
  });
  const forbidden = q.error instanceof ApiError && q.error.status === 403;
  return {
    cases: q.data?.cases ?? [],
    total: q.data?.total ?? 0,
    isLoading: q.isLoading,
    isError: q.isError && !forbidden,
    forbidden,
    refetch: q.refetch,
  };
}
