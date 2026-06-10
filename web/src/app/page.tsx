"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldAlert } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { STATUS_LABEL, STATUS_BADGE, formatDateTime } from "@/lib/case-display";

export default function HomePage() {
  const router = useRouter();
  const { cases, listLoading, fetchList } = useReportStore();
  const { role } = useAuthStore();
  const isPrivileged = role !== null && role !== "STUDENT";

  useEffect(() => {
    fetchList().catch(() => {});
  }, [fetchList]);

  return (
    <div className="space-y-6">
      {/* CHÀO MỪNG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              {isPrivileged ? "Bảng điều khiển điều phối" : "Hệ thống báo cáo sự vụ"}
            </h2>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {isPrivileged
              ? "Tiếp nhận và điều phối các sự vụ trong trường."
              : "Chào mừng bạn trở lại. Hãy gửi báo cáo nếu phát hiện sự cố."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push("/report/new")}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-100 transition-all active:scale-[0.98]"
          >
            <ShieldAlert size={16} /> Báo khẩn cấp
          </button>
          <button
            onClick={() => router.push("/report/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
          >
            <Plus size={16} /> Tạo báo cáo
          </button>
        </div>
      </div>

      {/* SỰ VỤ GẦN ĐÂY (số liệu tổng hợp đầy đủ ở trang Tổng quan — M4 /api/dashboard) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            {isPrivileged ? "Sự vụ gần đây" : "Báo cáo của bạn"}
          </h3>
          <button onClick={() => router.push("/report")} className="text-xs font-bold text-blue-600 hover:text-blue-700">
            Xem tất cả
          </button>
        </div>

        {listLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Đang tải...</div>
        ) : cases.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Chưa có sự vụ nào được ghi nhận.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cases.slice(0, 5).map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/report/${c.id}`)}
                className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0 gap-4 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-slate-800 truncate">
                    <span className="font-mono text-xs text-slate-400 mr-2">{c.caseCode}</span>
                    {c.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    {c.category.name} • {c.locationRef?.name ?? c.location ?? "—"} • {formatDateTime(c.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${STATUS_BADGE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  {c.isEmergency && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 uppercase tracking-wide">
                      SOS
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
