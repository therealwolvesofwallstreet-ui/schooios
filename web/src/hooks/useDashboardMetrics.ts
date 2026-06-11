"use client";

// GET /api/dashboard → tổng hợp toàn hệ (ADMIN/AUDITOR; STAFF·STUDENT → 403). staleTime:0 = server-truth.
// ⚠ DUY NHẤT file này được import — chỉ sống trong cây AdminHome (ADMIN/AUDITOR). STAFF/STUDENT KHÔNG
//   mount AdminHome ⇒ KHÔNG bao giờ phát request /dashboard (đảm bảo Tier-0 "0 call" về mặt CẤU TRÚC).
// ⚠ KEY DRIFT CỐ Ý (hợp đồng đóng băng): byStatus/byPriority dùng `_count`; byCategory/byLocation dùng
//   `count`. Consumer đọc PHÒNG THỦ (?? [] / ?? 0) — thiếu mảng → EmptyState ô đó, KHÔNG sập trang.
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardResponse } from "@/lib/api-types";

export function useDashboardMetrics() {
  const q = useQuery({
    queryKey: ["dashboard"] as const,
    queryFn: () => api.get<DashboardResponse>("/api/dashboard"),
    staleTime: 0,
  });
  return {
    metrics: q.data ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}
