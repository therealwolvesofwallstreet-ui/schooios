"use client";

// GET /api/cases → danh sách case ĐÃ LỌC SERVER-SIDE theo role (caseWhereForRole). FE KHÔNG gửi param
// sở hữu/role — server đọc JWT. Trang chủ chia bucket CLIENT-SIDE trên union đã-lọc (xem StaffHome/
// StudentHome). staleTime:0 = server-truth mỗi mount.
//
// queryKey CÓ `scope` (= user.id) đứng trước params: STAFF và STUDENT cùng gọi useCaseList(limit:100)
// → nếu KHÔNG scope sẽ trùng 1 key, staleTime:0 trả cache phiên cũ ngay rồi mới refetch → LÓE list
// sai-role lúc đổi vai. Scope theo user.id ⇒ va chạm chéo-role là BẤT KHẢ về mặt cấu trúc.
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CasesListResponse, CaseStatus } from "@/lib/api-types";

export interface CaseListParams {
  status?: CaseStatus;
  isEmergency?: boolean;
  page?: number;
  limit?: number;
}

function buildQuery(params: CaseListParams): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.isEmergency != null) sp.set("isEmergency", String(params.isEmergency));
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function useCaseList(scope: string, params: CaseListParams = {}) {
  const q = useQuery({
    queryKey: ["cases", "list", scope, params] as const,
    queryFn: () => api.get<CasesListResponse>(`/api/cases${buildQuery(params)}`),
    staleTime: 0,
  });
  return {
    cases: q.data?.cases ?? [],
    total: q.data?.total ?? 0,
    page: q.data?.page ?? 1,
    totalPages: q.data?.totalPages ?? 1,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}
