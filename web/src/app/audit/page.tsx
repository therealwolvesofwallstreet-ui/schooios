"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Clock, Activity, Lock } from "lucide-react";
import { useAuditStore } from "@/store/useAuditStore";
import { useAuthStore } from "@/store/useAuthStore";
import { formatDateTime } from "@/lib/case-display";
import type { AuditAction } from "@/lib/api-types";

const ACTION_BADGE: Record<AuditAction, string> = {
  CREATE: "bg-blue-50 text-blue-600",
  UPDATE: "bg-slate-100 text-slate-600",
  DELETE: "bg-red-50 text-red-600",
  ASSIGN: "bg-indigo-50 text-indigo-600",
  STATUS_CHANGE: "bg-purple-50 text-purple-600",
  LOGIN: "bg-emerald-50 text-emerald-600",
  LOGOUT: "bg-slate-50 text-slate-500",
  EMERGENCY_FLAG: "bg-red-50 text-red-600",
  SENSITIVE_FLAG: "bg-amber-50 text-amber-600",
};

export default function AuditLogPage() {
  const router = useRouter();
  const { logs, total, loading, fetchAudit } = useAuditStore();
  const { role } = useAuthStore();
  const allowed = role === "ADMIN" || role === "AUDITOR";

  useEffect(() => {
    if (allowed) fetchAudit().catch(() => {});
  }, [allowed, fetchAudit]);

  // Đang hydrate auth (role chưa biết) → loading, KHÔNG flash bảng audit rỗng.
  if (role === null) {
    return <div className="max-w-5xl mx-auto py-20 text-center text-slate-400 text-sm">Đang tải...</div>;
  }

  // CHẶN BẢO MẬT: chỉ ADMIN/AUDITOR (đồng bộ với API 403).
  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-4">
        <div className="bg-red-50 p-4 rounded-full text-red-500 inline-block mb-2">
          <Lock size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Khu vực cấm truy cập</h2>
        <p className="text-slate-500">Chỉ Ban Giám Hiệu và Kiểm toán mới xem được Lịch sử kiểm toán.</p>
        <button onClick={() => router.push("/")} className="text-blue-600 font-bold hover:underline mt-4">
          Quay lại Trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-lg text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-3 rounded-xl text-emerald-400 border border-slate-700">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Lịch sử kiểm toán (Audit Log)
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-500/30">
                IMMUTABLE
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Ghi nhận mọi thao tác thay đổi dữ liệu + đăng nhập.</p>
          </div>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2">
          <Activity size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-slate-300">Tổng số: {total} logs</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-sm">
          Đang tải nhật ký...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <ShieldCheck size={40} className="opacity-20" />
          <p className="text-sm font-medium">Chưa ghi nhận thao tác nào.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Thời gian</th>
                  <th className="p-4 font-bold">Thao tác</th>
                  <th className="p-4 font-bold">Đối tượng</th>
                  <th className="p-4 font-bold">Thực hiện bởi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} /> {formatDateTime(log.createdAt)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[11px] font-extrabold px-2 py-1 rounded-md ${ACTION_BADGE[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {log.entityType}
                      <span className="text-slate-400 font-mono text-xs ml-1">#{log.entityId.slice(0, 8)}</span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {log.actor ? `${log.actor.name} (${log.actor.role})` : "Hệ thống"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
