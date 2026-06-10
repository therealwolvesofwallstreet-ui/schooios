import { create } from "zustand";
import { api } from "@/lib/api";
import type { NotificationDTO, NotificationsResponse } from "@/lib/api-types";

// Nối API thật: GET /api/notifications (+?unreadOnly) + PATCH /api/notifications/read-all.
// KHÔNG mock, KHÔNG lưu ở trình duyệt. unreadCount lấy TỪ server (nguồn sự thật).
interface NotificationState {
  notifications: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (unreadOnly) => {
    set({ loading: true });
    try {
      const data = await api.get<NotificationsResponse>(
        `/api/notifications${unreadOnly ? "?unreadOnly=true" : ""}`,
      );
      set({ notifications: data.notifications, unreadCount: data.unreadCount, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markAllAsRead: async () => {
    await api.patch("/api/notifications/read-all");
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));
