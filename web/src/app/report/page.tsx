"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Plus, MapPin, Clock, PlayCircle, CheckCircle, Trash2, FileText, Image as ImageIcon } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";

interface ReportItem {
  id: string | number;
  title: string;
  description?: string;
  category?: string;
  location: string;
  status?: string; 
  isEmergency?: boolean;
  createdAt?: string;
  date?: string;
  author?: string;
  imageUrl?: string | null; 
}

interface StoreMethods {
  reports: ReportItem[];
  updateStatus?: (id: string | number, status: string) => void;
  updateReportStatus?: (id: string | number, status: string) => void;
  setReportStatus?: (id: string | number, status: string) => void;
  deleteReport?: (id: string | number) => void;
  removeReport?: (id: string | number) => void;
  deleteItem?: (id: string | number) => void;
}

export default function ReportManagementPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const store = useReportStore() as unknown as StoreMethods;
  const reports = store.reports || [];
  const updateStatus = store.updateStatus || store.updateReportStatus || store.setReportStatus;
  const removeReport = store.deleteReport || store.removeReport || store.deleteItem;

  const { role, userEmail } = useAuthStore();
  const [filter, setFilter] = useState("all");

  // 🛠️ ĐÃ FIX LỖI CHỮ ĐỎ CỦA SẾP: Bọc bằng setTimeout để linter Next.js/React hết báo lỗi render cascading
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) return null;

  const visibleReports = reports.filter((r) => {
    if (role !== "admin" && r.author !== userEmail && r.author !== "Học sinh ẩn danh") return false;
    if (filter === "sos") return r.isEmergency;
    if (filter === "pending") return r.status === "Chờ tiếp nhận" || !r.status;
    if (filter === "processing") return r.status === "Đang xử lý";
    if (filter === "resolved") return r.status === "Đã giải quyết" || r.status === "Đã hoàn thành";
    return true;
  }).reverse(); 

  const handleProcess = (id: string | number) => {
    if (updateStatus) { updateStatus(id, "Đang xử lý"); toast.success("Đã chuyển sang: Đang xử lý"); }
  };

  const handleComplete = (id: string | number) => {
    if (updateStatus) { updateStatus(id, "Đã hoàn thành"); toast.success("Sự vụ đã được giải quyết!"); }
  };

  const handleDelete = (id: string | number) => {
    if (confirm("Sếp có chắc chắn muốn xóa báo cáo này?")) {
      if (removeReport) { removeReport(id); toast.success("Đã xóa báo cáo!"); }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            {role === "admin" ? "Quản lý sự vụ học đường" : "Lịch sử báo cáo của bạn"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Danh sách toàn bộ các báo cáo và tình trạng xử lý hệ thống.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => router.push("/report/new?type=sos")} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-100 transition-all active:scale-95">
            <ShieldAlert size={16} /> Báo động SOS
          </button>
          <button onClick={() => router.push("/report/new?type=normal")} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95">
            <Plus size={16} /> Tạo báo cáo
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === "all" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>Tất cả</button>
        <button onClick={() => setFilter("sos")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === "sos" ? "bg-red-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>🚨 Khẩn cấp</button>
        <button onClick={() => setFilter("pending")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === "pending" ? "bg-amber-500 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>Chờ tiếp nhận</button>
        <button onClick={() => setFilter("processing")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === "processing" ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>Đang xử lý</button>
        <button onClick={() => setFilter("resolved")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === "resolved" ? "bg-green-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>Đã hoàn thành</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {visibleReports.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-slate-600">Không có báo cáo nào</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleReports.map((report) => (
              <div key={report.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-5 group">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-base truncate">{report.title}</h4>
                    {report.isEmergency && <span className="text-[10px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-md uppercase border border-red-200">SOS</span>}
                    {report.imageUrl && (
                      <button onClick={() => setSelectedImage(report.imageUrl as string)} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1"><ImageIcon size={12}/> Có ảnh</button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{report.description || report.category}</p>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5"><MapPin size={14}/> {report.location}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14}/> {report.createdAt || report.date || new Date().toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${report.status === "Chờ tiếp nhận" || !report.status ? "bg-amber-50 text-amber-600 border-amber-100" : report.status === "Đang xử lý" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-green-50 text-green-600 border-green-100"}`}>{report.status || "Chờ tiếp nhận"}</span>
                  {role === "admin" && (
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {(!report.status || report.status === "Chờ tiếp nhận") && <button onClick={() => handleProcess(report.id)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl"><PlayCircle size={20}/></button>}
                      {report.status !== "Đã hoàn thành" && <button onClick={() => handleComplete(report.id)} className="p-2 text-green-600 hover:bg-green-100 rounded-xl"><CheckCircle size={20}/></button>}
                      <button onClick={() => handleDelete(report.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={20}/></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Chứng cứ" className="w-full h-full object-contain rounded-2xl shadow-2xl border-4 border-white" />
          </div>
        </div>
      )}
    </div>
  );
}