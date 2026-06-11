"use client";

// Lookup locations cho màn tạo báo cáo. GET /api/locations (chỉ isActive, sort theo code —
// server-driven). staleTime dài như categories.
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LocationsResponse } from "@/lib/api-types";

export const LOCATIONS_QUERY_KEY = ["locations"] as const;

export function useLocations() {
  const q = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: () => api.get<LocationsResponse>("/api/locations"),
    staleTime: 5 * 60_000,
  });
  return {
    locations: q.data?.locations ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}
