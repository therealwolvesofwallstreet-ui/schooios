import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useNotificationStore } from "./useNotificationStore"; 
import { useAuditStore } from "./useAuditStore"; 
import toast from "react-hot-toast";

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  priority: string;
  isEmergency: boolean;
  isConfidential: boolean;
  status: "Chờ tiếp nhận" | "Đang xử lý" | "Đã giải quyết";
  createdAt: string;
  imageUrl?: string | null; // <--- KHÚC NÀY ĐỂ LƯU LINK ẢNH NÈ
}

interface ReportState {
  reports: Report[];
  addReport: (newReport: Omit<Report, "id" | "status" | "createdAt">) => void;
  updateStatus: (id: string, newStatus: Report["status"]) => void;
}

export const useReportStore = create<ReportState>()(
  persist(
    (set) => ({
      reports: [],

      addReport: (newReport) =>
        set((state) => {
          const id = "SOS-" + Math.floor(100000 + Math.random() * 900000);
          const createdAt = new Date().toLocaleString("vi-VN", {
            hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
          });

          const fullReport: Report = { ...newReport, id, status: "Chờ tiếp nhận", createdAt };

          if (fullReport.isEmergency) {
            useNotificationStore.getState().addNotification("🚨 SỰ VỤ KHẨN CẤP MỚI!", `Mã số ${id}: "${fullReport.title}" cần xử lý ngay!`, "emergency");
            toast.error(`Đã phát SOS khẩn cấp: ${id}!`, { icon: '🚨', duration: 5000 });
          } else {
            useNotificationStore.getState().addNotification("📝 Tiếp nhận báo cáo mới", `Sự vụ ${id} đã được tạo thành công.`, "new_report");
            toast.success(`Tạo báo cáo ${id} thành công!`);
          }

          useAuditStore.getState().addLog("TẠO SỰ VỤ", `Sự vụ mã ${id} (${fullReport.title}) được tạo trên hệ thống.`, "Hệ thống / Người dùng");

          return { reports: [fullReport, ...state.reports] };
        }),

      updateStatus: (id, newStatus) =>
        set((state) => {
          const updatedReports = state.reports.map((report) => {
            if (report.id === id) {
              
              useNotificationStore.getState().addNotification("🔄 Cập nhật tiến độ", `Sự vụ ${id} chuyển sang trạng thái: "${newStatus}".`, "status_change");
              useAuditStore.getState().addLog("ĐỔI TRẠNG THÁI", `Chuyển sự vụ ${id} từ "${report.status}" sang "${newStatus}".`, "Admin");

              toast.success(`Đã chuyển ${id} sang: ${newStatus}`);

              return { ...report, status: newStatus };
            }
            return report;
          });
          return { reports: updatedReports };
        }),
    }),
    { name: "school-os-reports" }
  )
);