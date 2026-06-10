"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Tag, ShieldAlert, CheckCircle2, User, Image as ImageIcon, Briefcase, MessageSquare, Lock, Send } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;

  const { reports, updateStatus } = useReportStore();
  const { role } = useAuthStore(); 
  
  const report = reports.find((r) => r.id === reportId);

  // MOCK DATA BÌNH LUẬN (Ghi dữ liệu tạm thời để test luồng UI)
  const [comments, setComments] = useState([
    { id: 1, author: "Hệ thống", text: "Sự vụ đã được ghi nhận thành công vào hệ thống.", time: "11:31", isInternal: false },
    { id: 2, author: "Admin (Thầy Quản lý)", text: "Cần kiểm tra camera khu vực hành lang dãy A để xác minh thêm.", time: "11:45", isInternal: true },
  ]);
  const [newComment, setNewComment] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  if (!report) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Không tìm thấy sự vụ</h2>
        <p className="text-slate-500">Báo cáo này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <button onClick={() => router.push("/report")} className="text-blue-600 font-bold hover:underline">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      author: role !== "STUDENT" ? "Admin (Bạn)" : "Học sinh (Bạn)",
      text: newComment,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      isInternal: role !== "STUDENT" ? isInternalNote : false, 
    };

    setComments([...comments, comment]);
    setNewComment("");
  };

  const visibleComments = comments.filter(c => !c.isInternal || role !== "STUDENT");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/report")} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <span className="font-mono text-sm font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-lg">{report.id}</span>
      </div>

      <div className={`grid grid-cols-1 ${role !== "STUDENT" ? "lg:grid-cols-3" : ""} gap-6 items-start`}>
        
        {/* CỘT TRÁI: NỘI DUNG VÀ BÌNH LUẬN */}
        <div className={`${role !== "STUDENT" ? "lg:col-span-2" : "lg:col-span-3"} space-y-6`}>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`p-6 md:p-8 border-b ${report.isEmergency ? "bg-red-50/50 border-red-100" : "border-slate-100"}`}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  report.status === "Chờ tiếp nhận" ? "bg-amber-100 text-amber-700" :
                  report.status === "Đang xử lý" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {report.status === "Chờ tiếp nhận" && <Clock size={14} />}
                  {report.status === "Đang xử lý" && <ShieldAlert size={14} />}
                  {report.status === "Đã giải quyết" && <CheckCircle2 size={14} />}
                  {report.status}
                </span>
                {report.isEmergency && <span className="bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full animate-pulse">KHẨN CẤP</span>}
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-snug">{report.title}</h1>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
                <div className="flex items-center gap-2"><Clock size={16} className="text-slate-400"/> {report.createdAt}</div>
                <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400"/> {report.location}</div>
                <div className="flex items-center gap-2"><Tag size={16} className="text-slate-400"/> {report.category}</div>
                <div className="flex items-center gap-2"><User size={16} className="text-slate-400"/> {report.isConfidential ? "Người báo cáo ẩn danh" : "Học sinh (Đã xác thực)"}</div>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Mô tả sự vụ</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">{report.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Ảnh minh chứng</h3>
                <div className="w-full md:w-3/4 aspect-video bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon size={32} className="mb-2 opacity-50" />
                  <span className="text-sm font-medium">Không có ảnh đính kèm</span>
                </div>
              </div>
            </div>
          </div>

          {/* KHU VỰC BÌNH LUẬN & GHI CHÚ NỘI BỘ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
              <MessageSquare size={18} className="text-blue-600" /> Trao đổi trong vụ việc
            </h3>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {visibleComments.map((c) => (
                <div key={c.id} className={`p-4 rounded-xl text-sm ${c.isInternal ? "bg-purple-50 border border-purple-100" : "bg-slate-50 border border-slate-100"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{c.author}</span>
                      {c.isInternal && (
                        <span className="bg-purple-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Lock size={10} /> Nội bộ
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{c.time}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="space-y-3 pt-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder={isInternalNote && role !== "STUDENT" ? "Nhập ghi chú nội bộ (chỉ Admin thấy)..." : "Nhập phản hồi công khai..."}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className={`w-full pl-4 pr-12 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 transition-all ${isInternalNote && role !== "STUDENT" ? "border-purple-300 focus:border-purple-500 focus:ring-purple-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"}`}
                />
                <button type="submit" className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white transition-all active:scale-95 ${isInternalNote && role !== "STUDENT" ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                  <Send size={14} />
                </button>
              </div>

              {role !== "STUDENT" && (
                <label className="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="w-3.5 h-3.5 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                  />
                  🔒 Bật chế độ Ghi chú nội bộ Staff / Admin
                </label>
              )}
            </form>
          </div>

        </div>

        {/* CỘT PHẢI: BAN ĐIỀU KHIỂN TRẠNG THÁI (CHỈ ADMIN THẤY) */}
        {role !== "STUDENT" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
              <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
                <Briefcase size={18} className="text-blue-600"/> Cập nhật quy trình
              </h3>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đổi trạng thái sự vụ</p>
                <button onClick={() => updateStatus(report.id, "Chờ tiếp nhận")} className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold text-left transition-all ${report.status === "Chờ tiếp nhận" ? "bg-amber-100 text-amber-800 border-2 border-amber-500" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-transparent"}`}>1. Chờ tiếp nhận</button>
                <button onClick={() => updateStatus(report.id, "Đang xử lý")} className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold text-left transition-all ${report.status === "Đang xử lý" ? "bg-blue-100 text-blue-800 border-2 border-blue-500" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-transparent"}`}>2. Đang xử lý</button>
                <button onClick={() => updateStatus(report.id, "Đã giải quyết")} className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold text-left transition-all ${report.status === "Đã giải quyết" ? "bg-green-100 text-green-800 border-2 border-green-500" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-transparent"}`}>3. Đã giải quyết</button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}