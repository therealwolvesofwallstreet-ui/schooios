"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Bell, Check, Clock, ShieldAlert, FileText, RefreshCw, UserCheck, CheckCircle2, MessageSquare } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { formatDateTime } from "@/lib/case-display";
import type { NotificationType } from "@/lib/api-types";

const ICON: Record<NotificationType, React.ReactNode> = {
  EMERGENCY_CONFIRMED: <ShieldAlert size={18} />,
  STATUS_CHANGED: <RefreshCw size={18} />,
  CASE_ASSIGNED: <UserCheck size={18} />,
  CASE_RESOLVED: <CheckCircle2 size={18} />,
  COMMENT_ADDED: <MessageSquare size={18} />,
};
const TONE: Record<NotificationType, string> = {
  EMERGENCY_CONFIRMED: "bg-red-50 text-red-600",
  STATUS_CHANGED: "bg-purple-50 text-purple-600",
  CASE_ASSIGNED: "bg-blue-50 text-blue-600",
  CASE_RESOLVED: "bg-green-50 text-green-600",
  COMMENT_ADDED: "bg-sky-50 text-sky-600",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, loading, fetchNotifications, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications().catch(() => {});
  }, [fetchNotifications]);

  const onReadAll = async () => {
    try {
      await markAllAsRead();
      toast.success("Đã đánh dấu tất cả là đã đọc.");
    } catch {
      toast.error("Không thể đánh dấu đã đọc.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Thông báo {unreadCount > 0 && <span className="text-blue-600">({unreadCount} chưa đọc)</span>}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">Cập nhật hoạt động, đổi trạng thái và cảnh báo sự vụ.</p>
          </div>
        </div>
        <button
          onClick={onReadAll}
          disabled={unreadCount === 0}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          title="Đánh dấu tất cả đã đọc"
        >
          <Check size={16} /> <span className="hidden sm:inline">Đọc tất cả</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
          Đang tải thông báo...
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
          <Bell size={32} className="opacity-30 mb-1" />
          Hộp thư thông báo của bạn đang trống.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => item.case && router.push(`/report/${item.case.id}`)}
              className={`p-5 flex items-start gap-4 transition-all ${!item.isRead ? "bg-blue-50/40" : "bg-white"} ${item.case ? "cursor-pointer hover:bg-slate-50" : ""}`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${TONE[item.type] ?? "bg-slate-50 text-slate-500"}`}>
                {ICON[item.type] ?? <FileText size={18} />}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h4 className={`text-sm ${!item.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"} truncate`}>
                    {item.message}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
                    <Clock size={12} /> {formatDateTime(item.createdAt)}
                  </span>
                </div>
                {item.case && (
                  <p className="text-xs text-slate-400 font-mono">{item.case.caseCode}</p>
                )}
              </div>
              {!item.isRead && <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0 animate-pulse" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
