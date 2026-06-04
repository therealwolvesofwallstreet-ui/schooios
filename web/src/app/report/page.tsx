"use client";

import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Filter } from "lucide-react";

export default function ReportListPage() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Báo cáo của tôi</h2>
          <p className="text-slate-500 text-sm mt-1">Quản lý và theo dõi tiến độ các sự vụ bạn đã gửi.</p>
        </div>
        <button 
          onClick={() => router.push("/report/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Plus size={18} /> Tạo báo cáo
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Tìm theo mã sự vụ, tiêu đề..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"/>
        </div>
        <button className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-2 text-slate-600 hover:bg-slate-50 transition-all font-medium text-sm">
          <Filter size={16} /> Lọc
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-50 p-4 rounded-full mb-4">
          <FileText size={32} className="text-slate-300" />
        </div>
        <h3 className="text-slate-700 font-bold mb-1">Chưa có dữ liệu</h3>
        <p className="text-slate-500 text-sm">Bạn chưa tạo báo cáo sự cố nào.</p>
      </div>
    </div>
  );
}