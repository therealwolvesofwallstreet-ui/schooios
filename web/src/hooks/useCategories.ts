"use client";

// Lookup categories cho màn tạo báo cáo. GET /api/categories (chỉ isActive, sort theo name —
// server-driven, FE KHÔNG tự sort). staleTime dài: dữ liệu tra cứu ít đổi trong một phiên.
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CategoriesResponse } from "@/lib/api-types";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export function useCategories() {
  const q = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => api.get<CategoriesResponse>("/api/categories"),
    staleTime: 5 * 60_000,
  });
  return {
    categories: q.data?.categories ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch, // cho ChoiceList "Thử lại" khi lookup lỗi (chống dead-end step bắt buộc)
  };
}
