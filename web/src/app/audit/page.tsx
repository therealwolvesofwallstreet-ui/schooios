"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Clock, Activity, Lock } from "lucide-react";
import { useAuditStore } from "@/store/useAuditStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuditLogPage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  
  const { logs } = useAuditStore();
  const { role } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) return null;

  // CHẶN BẢO MẬT: Nếu là học sinh, lập tức văng ra ngoài hoặc báo lỗi
  if (role !== "ADMIN" && role !== "AUDITOR") {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-4">
        <div className="bg-red-50 p-4 rounded-full text-red-500 inline-block mb-2">
          <Lock size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Khu vực cấm truy cập</h2>
        <p className="text-slate-500">Chỉ có Ban Giám Hiệu và Quản trị viên mới có quyền xem Lịch sử kiểm toán.</p>
        <button onClick={() => router.push("/")} className="text-blue-600 font-bold hover:underline mt-4">
          Quay lại Trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-lg text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-3 rounded-xl text-emerald-400 border border-slate-700">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Lịch sử kiểm toán (Audit Log)
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-500/30">SECURE</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Ghi nhận mọi thao tác thay đổi dữ liệu trong hệ thống.</p>
          </div>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2">
          <Activity size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-slate-300">Tổng số: {logs.length} logs</span>
        </div>
      </div>

      {/* DANH SÁCH LOG */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <ShieldCheck size={40} className="opacity-20" />
          <p className="text-sm font-medium">Hệ thống chưa ghi nhận thao tác nào.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Thời gian</th>
                  <th className="p-4 font-bold">Thao tác</th>
                  <th className="p-4 font-bold">Chi tiết</th>
                  <th className="p-4 font-bold">Thực hiện bởi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><Clock size={14}/> {log.timestamp}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[11px] font-extrabold px-2 py-1 rounded-md ${
                        log.action === "TẠO SỰ VỤ" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{log.details}</td>
                    <td className="p-4 text-slate-500 font-mono text-xs">{log.actor}</td>
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