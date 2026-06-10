"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, ShieldAlert, Clock, CheckCircle2, Plus, ArrowRight } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function ReportListPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  const { reports } = useReportStore();
  const { role } = useAuthStore();

  // State lưu trữ từ khóa tìm kiếm và bộ lọc
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

 useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // THUẬT TOÁN TÌM KIẾM VÀ LỌC
  const filteredReports = reports.filter((report) => {
    // 1. Lọc theo từ khóa (Mã ID hoặc Tiêu đề)
    const matchSearch = 
      report.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Lọc theo trạng thái
    const matchStatus = statusFilter === "Tất cả" || report.status === statusFilter;
    
    // 3. Phân quyền: Học sinh chỉ thấy báo cáo của mình (tạm thời mock bằng cách lọc, thực tế sẽ lọc theo userEmail)
    // Ở bản MVP này, ta cho Student thấy list báo cáo do học sinh tạo chung để dễ test.
    
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER & NÚT TẠO MỚI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách sự vụ</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý và tra cứu toàn bộ báo cáo trong hệ thống.</p>
        </div>
        <button
          onClick={() => router.push("/report/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] shrink-0"
        >
          <Plus size={18} /> Tạo báo cáo mới
        </button>
      </div>

      {/* KHU VỰC THANH TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        {/* Ô Tìm kiếm */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Tìm theo Mã sự vụ (VD: SOS-123) hoặc Tiêu đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Nút thả xuống Lọc trạng thái */}
        <div className="relative shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Filter size={18} />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none transition-all cursor-pointer text-slate-700"
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Chờ tiếp nhận">Chờ tiếp nhận</option>
            <option value="Đang xử lý">Đang xử lý</option>
            <option value="Đã giải quyết">Đã giải quyết</option>
          </select>
        </div>
      </div>

      {/* DANH SÁCH BÁO CÁO THU ĐƯỢC KHI LỌC */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Search size={40} className="opacity-20" />
          <p className="text-sm font-medium">Không tìm thấy sự vụ nào khớp với điều kiện tìm kiếm.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filteredReports.map((report) => (
            <div 
              key={report.id} 
              onClick={() => router.push(`/report/${report.id}`)}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              {/* Badge Trạng thái / SOS */}
              <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:w-32">
                <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider w-fit ${
                  report.status === "Chờ tiếp nhận" ? "bg-amber-100 text-amber-700" :
                  report.status === "Đang xử lý" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {report.status === "Chờ tiếp nhận" && <Clock size={12} />}
                  {report.status === "Đang xử lý" && <ShieldAlert size={12} />}
                  {report.status === "Đã giải quyết" && <CheckCircle2 size={12} />}
                  {report.status}
                </span>
                
                {report.isEmergency && (
                  <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md text-center uppercase">
                    SOS Khẩn
                  </span>
                )}
              </div>

              {/* Thông tin chính */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{report.id}</span>
                  <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {report.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {report.category} • {report.location} • {report.createdAt}
                </p>
              </div>

              {/* Nút Xem chi tiết (Chỉ hiện khi hover trên PC) */}
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