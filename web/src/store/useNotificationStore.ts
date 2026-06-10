import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  type: "new_report" | "status_change" | "emergency";
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (title: string, description: string, type: NotificationItem["type"]) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [
        // Dữ liệu mẫu ban đầu để giao diện không bị trống
        {
          id: "noti-1",
          title: "Hệ thống SchoolOS",
          description: "Chào mừng bạn đến với hệ thống vận hành sự vụ số SchoolOS.",
          createdAt: "11:30 05/06/2026",
          isRead: false,
          type: "new_report"
        }
      ],

      // Hàm thêm thông báo mới
      addNotification: (title, description, type) =>
        set((state) => {
          const newNoti: NotificationItem = {
            id: "noti-" + Date.now(),
            title,
            description,
            type,
            isRead: false,
            createdAt: new Date().toLocaleString("vi-VN", {
              hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
            }),
          };
          return { notifications: [newNoti, ...state.notifications] };
        }),

      // Hàm đánh dấu tất cả là đã đọc
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        })),

      // Hàm xóa sạch thông báo
      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: "school-os-notifications",
    }
  )
);