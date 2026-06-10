"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Plus, ArrowRight } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { STATUS_LABEL, STATUS_BADGE, STATUS_ORDER, formatDateTime } from "@/lib/case-display";
import type { CaseStatus } from "@/lib/api-types";

export default function ReportListPage() {
  const router = useRouter();
  const { cases, listLoading, fetchList } = useReportStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "ALL">("ALL");

  useEffect(() => {
    fetchList().catch(() => {});
  }, [fetchList]);

  const filtered = cases.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      c.caseCode.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách sự vụ</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý và tra cứu các báo cáo bạn được phép xem.</p>
        </div>
        <button
          onClick={() => router.push("/report/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] shrink-0"
        >
          <Plus size={18} /> Tạo báo cáo mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Tìm theo Mã sự vụ (VD: CASE-2026-00001) hoặc Tiêu đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="relative shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Filter size={18} />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CaseStatus | "ALL")}
            className="w-full md:w-auto pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none transition-all cursor-pointer text-slate-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {listLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-sm">
          Đang tải danh sách sự vụ...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Search size={40} className="opacity-20" />
          <p className="text-sm font-medium">Không có sự vụ nào khớp điều kiện.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/report/${c.id}`)}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:w-36">
                <span
                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider w-fit ${STATUS_BADGE[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
                {c.isEmergency && (
                  <span className="bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md text-center uppercase animate-pulse">
                    KHẨN CẤP
                  </span>
                )}
                {!c.isEmergency && c.studentFlaggedEmergency && (
                  <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md text-center uppercase">
                    HS báo khẩn
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {c.caseCode}
                  </span>
                  {c.isSensitive && (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                      NHẠY CẢM
                    </span>
                  )}
                  <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {c.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {c.category.name} • {c.locationRef?.name ?? c.location ?? "Chưa xác định"} •{" "}
                  {formatDateTime(c.createdAt)}
                </p>
              </div>

              <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all">
                <ArrowRight size={18} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
