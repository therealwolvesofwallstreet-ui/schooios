"use client";

// Nạp danh sách STAFF (isActive) để nạp picker "Giao cho…" của ADMIN.
// enabled=(role==='ADMIN') → STAFF/STUDENT/AUDITOR KHÔNG BAO GIỜ phát request (tránh 403).
// staleTime: 60s (staff list ít thay đổi trong 1 phiên giao việc).
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UsersResponse, UserRef } from "@/lib/api-types";

export function useAssignableStaff(enabled: boolean): {
  staff: UserRef[];
  isLoading: boolean;
  isError: boolean;
} {
  const q = useQuery({
    queryKey: ["users", "assignable-staff"] as const,
    queryFn: () => api.get<UsersResponse>("/api/users?role=STAFF&limit=100"),
    enabled,
    staleTime: 60_000,
  });
  return {
    staff: q.data?.users ?? [],
    isLoading: q.isLoading && enabled,
    isError: q.isError,
  };
}
