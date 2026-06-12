"use client";

// GET /api/cases/[id] → hồ sơ đầy đủ. queryKey ["cases", id] để mutation invalidate đúng 1 case.
// 404 ĐỒNG NHẤT (không-thấy = không-tồn-tại, anti-enumeration) → tách `notFound` khỏi `isError`
// để UI hiện "không tìm thấy" (serif 1 dòng) thay vì lỗi-tải-lại. 401 → api.ts đã tự điều hướng.
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { CaseDetail, CaseResponse } from "@/lib/api-types";

export const caseDetailKey = (id: string) => ["cases", id] as const;

export function useCaseDetail(caseId: string) {
  const q = useQuery({
    queryKey: caseDetailKey(caseId),
    queryFn: () => api.get<CaseResponse>(`/api/cases/${caseId}`),
    staleTime: 0, // hồ sơ sống: luôn server-truth (đặc biệt sau mutation/409 reload)
  });
  const notFound = q.error instanceof ApiError && q.error.status === 404;
  return {
    case: (q.data?.case as CaseDetail | undefined) ?? null,
    isLoading: q.isLoading,
    isError: q.isError && !notFound,
    notFound,
    refetch: q.refetch,
  };
}
