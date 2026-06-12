"use client";

// Nguồn role/identity DUY NHẤT cho FE. GET /api/auth/me mỗi phiên (KHÔNG đọc/giải mã JWT,
// KHÔNG cache role qua localStorage — hợp đồng docs/API.md). staleTime:0 + query key dùng chung
// ['session'] ⇒ React Query DEDUPE: nhiều component gọi useSession() chỉ phát 1 request thật,
// con đọc cache thay vì refetch từng mount → tránh spam mà vẫn server-truth.
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Role } from "@/lib/api-types";

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  email?: string | null;
  sbd?: string | null;
}

interface MeResponse {
  user: SessionUser;
}

export const SESSION_QUERY_KEY = ["session"] as const;

export function useSession() {
  const q = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => api.get<MeResponse>("/api/auth/me"),
    staleTime: 0,
  });
  return {
    user: q.data?.user ?? null,
    role: q.data?.user.role ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}
