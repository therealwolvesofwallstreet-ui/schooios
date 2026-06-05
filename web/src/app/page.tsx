"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, AlertTriangle, CheckCircle2, Clock, Plus, ShieldAlert } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore"; 

export default function Dashboard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  const { reports } = useReportStore();
  const { role } = useAuthStore(); 

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) return null; 

  const totalReports = reports.length;
  const pendingReports = reports.filter(r => r.status === "Chờ tiếp nhận").length;
  const processingReports = reports.filter(r => r.status === "Đang xử lý").length;
  const emergencyReports = reports.filter(r => r.isEmergency).length;

  return (
    <div className="space-y-6">
      
      {/* KHỐI CHÀO MỪNG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              {role === "admin" ? "Bảng điều khiển Ban Giám Hiệu" : "Hệ thống báo cáo sự vụ"}
            </h2>
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider ${role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
              {role === "admin" ? "Admin" : "Học sinh"}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {role === "admin" ? "Quản lý và điều phối các sự vụ trong toàn trường." : "Chào mừng bạn trở lại. Hãy gửi báo cáo nếu phát hiện sự cố."}
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push("/report/new")}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-100 transition-all active:scale-[0.98]"
          >
            <ShieldAlert size={16} /> SOS Khẩn cấp
          </button>
          
          <button
            onClick={() => router.push("/report/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
          >
            <Plus size={16} /> Tạo báo cáo
          </button>
        </div>
      </div>

      {/* 4 CỤC THỐNG KÊ */}
      {role === "admin" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shrink-0"><FileText size={22} /></div>
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Tổng số vụ</p>
              <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-0.5">{totalReports}</h3>
            </div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-amber-50 p-3 rounded-xl text-amber-600 shrink-0"><Clock size={22} /></div>
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Chờ tiếp nhận</p>
              <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-0.5">{pendingReports}</h3>
            </div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-purple-50 p-3 rounded-xl text-purple-600 shrink-0"><AlertTriangle size={22} /></div>
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Đang xử lý</p>
              <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-0.5">{processingReports}</h3>
            </div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-xl text-red-600 shrink-0"><ShieldAlert size={22} /></div>
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Khẩn cấp</p>
              <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-0.5">{emergencyReports}</h3>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH BÁO CÁO GẦN ĐÂY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            {role === "admin" ? "Tất cả sự vụ gần đây" : "Báo cáo của bạn"}
          </h3>
          <button onClick={() => router.push("/report")} className="text-xs font-bold text-blue-600 hover:text-blue-700">Xem tất cả</button>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Chưa có sự vụ nào được ghi nhận.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.slice(0, 3).map((report) => (
              <div key={report.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0 gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-slate-800 truncate">{report.title}</h4>
                  <p className="text-xs text-slate-400 font-medium">{report.location} • {report.createdAt}</p>
                </div>
                
                {/* ĐỘ LẠI KHU VỰC BADGE: HIỆN TRẠNG THÁI LUÔN Ở ĐÂY */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    report.status === "Chờ tiếp nhận" ? "bg-amber-50 text-amber-600" :
                    report.status === "Đang xử lý" ? "bg-blue-50 text-blue-600" :
                    "bg-green-50 text-green-600"
                  }`}>
                    {report.status}
                  </span>
                  {report.isEmergency && (
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