"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

export default function NotificationsPage() {
  // Khởi tạo mảng thông báo rỗng bằng State để dọn sạch dữ liệu ảo
  const [notifications, setNotifications] = useState([]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Thông báo</h2>
        <p className="text-slate-500 text-sm mt-1">Cập nhật trạng thái các báo cáo của bạn.</p>
      </div>

      {notifications.length === 0 ? (
        /* TRẠNG THÁI RỖNG SẠCH SẼ KHI CHƯA CÓ THÔNG BÁO THẬT */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Bell size={32} className="text-slate-300" />
          </div>
          <h3 className="text-slate-700 font-bold mb-1">Không có thông báo mới</h3>
          <p className="text-slate-500 text-sm">Hệ thống sẽ gửi thông báo đến bạn khi có cập nhật vụ việc.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {/* Nơi chứa thông báo thật về sau */}
        </div>
      )}
    </div>
  );
}