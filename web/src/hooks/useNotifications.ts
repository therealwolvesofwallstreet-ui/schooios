"use client";

// GET /api/notifications → thông báo CỦA TÔI (server lọc theo userId từ JWT — FE KHÔNG gửi param sở
// hữu). Phân trang + unreadOnly SERVER-DRIVEN (FE không tự lọc/sort). `unreadCount` luôn về kèm =
// nguồn-sự-thật cho badge. staleTime:0 = server-truth mỗi mount.
//
// read-all KHÔNG decrement cục bộ: invalidate PREFIX ["notifications"] → CẢ list LẪN badge refetch
// từ server → badge luôn = server-truth (không lệch nếu có thông báo mới chen giữa).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NotificationsResponse } from "@/lib/api-types";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

function buildQuery(page?: number, limit?: number, unreadOnly?: boolean): string {
  const sp = new URLSearchParams();
  if (page != null) sp.set("page", String(page));
  if (limit != null) sp.set("limit", String(limit));
  if (unreadOnly != null) sp.set("unreadOnly", String(unreadOnly));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function useNotifications(page = 1, limit = 20, unreadOnly = false) {
  const q = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, "list", { page, limit, unreadOnly }] as const,
    queryFn: () =>
      api.get<NotificationsResponse>(`/api/notifications${buildQuery(page, limit, unreadOnly)}`),
    staleTime: 0,
  });
  return {
    notifications: q.data?.notifications ?? [],
    unreadCount: q.data?.unreadCount ?? 0,
    total: q.data?.total ?? 0,
    page: q.data?.page ?? page,
    totalPages: q.data?.totalPages ?? 1,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}

// Badge TopBar: chỉ cần CON SỐ → limit=1 (payload tối thiểu), đọc `unreadCount` server-truth.
// `enabled` để không bắn khi chưa có phiên (vd lúc đăng xuất/chuyển trang công khai).
export function useUnreadCount(enabled = true) {
  const q = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, "unread"] as const,
    queryFn: () => api.get<NotificationsResponse>("/api/notifications?page=1&limit=1"),
    enabled,
    staleTime: 0,
  });
  return { unreadCount: q.data?.unreadCount ?? 0 };
}

export function useReadAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.patch<{ success: boolean; updated: number }>("/api/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}
