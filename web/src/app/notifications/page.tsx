"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Clock, ShieldAlert, FileText, RefreshCw } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function NotificationsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { notifications, markAllAsRead, clearAll } = useNotificationStore();

 useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER CỦA TRANG */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Thông báo hệ thống</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Cập nhật các hoạt động, thay đổi trạng thái và cảnh báo sự vụ.
            </p>
          </div>
        </div>

        {/* CÁC NÚT THAO TÁC NHANH */}
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Đánh dấu tất cả đã đọc"
          >
            <Check size={16} /> <span className="hidden sm:inline">Đọc tất cả</span>
          </button>
          <button
            onClick={clearAll}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Xóa tất cả thông báo"
          >
            <Trash2 size={16} /> <span className="hidden sm:inline">Xóa sạch</span>
          </button>
        </div>
      </div>

      {/* DANH SÁCH THÔNG BÁO */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
          <Bell size={32} className="opacity-30 mb-1" />
          Hộp thư thông báo của bạn đang trống trơn.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-5 flex items-start gap-4 transition-all ${
                !item.isRead ? "bg-blue-50/40" : "bg-white"
              }`}
            >
              {/* ICON THEO TỪNG LOẠI THÔNG BÁO */}
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  item.type === "emergency"
                    ? "bg-red-50 text-red-600"
                    : item.type === "status_change"
                    ? "bg-purple-50 text-purple-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {item.type === "emergency" && <ShieldAlert size={18} />}
                {item.type === "status_change" && <RefreshCw size={18} />}
                {item.type === "new_report" && <FileText size={18} />}
              </div>

              {/* NỘI DUNG THÔNG BÁO */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h4 className={`text-sm ${!item.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"} truncate`}>
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
                    <Clock size={12} /> {item.createdAt}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </div>

              {/* CHẤM XANH BÁO CHƯA ĐỌC */}
              {!item.isRead && (
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}