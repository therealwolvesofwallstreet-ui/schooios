"use client";

// GET /api/audit → nhật ký bất biến TOÀN HỆ (append-only). Quyền: CHỈ ADMIN/AUDITOR; role khác → 403.
// Phân trang + filter entityType/entityId SERVER-DRIVEN (FE không tự lọc). 403 TÁCH khỏi isError →
// UI hiện "ngoài quyền" (điềm tĩnh) thay vì lỗi-tải-lại. queryClient KHÔNG retry 403 (chỉ 429/503).
// 401 → api.ts đã tự điều hướng /login. staleTime:0 = server-truth.
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { AuditResponse } from "@/lib/api-types";

function buildQuery(
  page?: number,
  limit?: number,
  entityType?: string,
  entityId?: string,
): string {
  const sp = new URLSearchParams();
  if (page != null) sp.set("page", String(page));
  if (limit != null) sp.set("limit", String(limit));
  if (entityType) sp.set("entityType", entityType);
  if (entityId) sp.set("entityId", entityId);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function useAudit(page = 1, limit = 20, entityType?: string, entityId?: string) {
  const q = useQuery({
    queryKey: [
      "audit",
      { page, limit, entityType: entityType ?? null, entityId: entityId ?? null },
    ] as const,
    queryFn: () =>
      api.get<AuditResponse>(`/api/audit${buildQuery(page, limit, entityType, entityId)}`),
    staleTime: 0,
  });
  const forbidden = q.error instanceof ApiError && q.error.status === 403;
  return {
    logs: q.data?.logs ?? [],
    total: q.data?.total ?? 0,
    page: q.data?.page ?? page,
    totalPages: q.data?.totalPages ?? 1,
    isLoading: q.isLoading,
    isError: q.isError && !forbidden,
    forbidden,
    refetch: q.refetch,
  };
}
