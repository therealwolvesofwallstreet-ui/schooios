"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image"; 
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore, CommentItem } from "@/store/useCommunityStore";
import { 
  ArrowLeft, Clock, MessageSquare, Lock, Send, EyeOff, 
  Eye, AlertTriangle, Maximize2, X, AlertCircle, ShieldAlert, Info,
  User, CheckCircle2, XCircle, MapPin, Shield
} from "lucide-react"; // 🛠️ FIX 2: Bổ sung toàn bộ Icon còn thiếu để dập lỗi Cannot find name
import toast from "react-hot-toast";
import Reveal from "@/components/motion/Reveal";

// 🛠️ FIX 1: Hút kiểu dữ liệu gốc từ Store và mở rộng thêm severity để chấm dứt hoàn toàn việc xài 'any'
type StoreCommunityItem = ReturnType<typeof useCommunityStore.getState>["items"][number];
type ExtendedReportItem = StoreCommunityItem & { severity?: "normal" | "priority" | "urgent" };

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params?.id ? parseInt(params.id as string) : 0;

  const { userEmail, role } = useAuthStore();
  const store = useCommunityStore();
  
  // Ép kiểu toàn bộ danh sách một lần duy nhất sang ExtendedReportItem
  const items = (store.items || []) as unknown as ExtendedReportItem[];

  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("schoolos_feed_status_map");
    const timer = setTimeout(() => {
      if (saved) {
        try { setStatusMap(JSON.parse(saved)); } catch { /* ignore */ }
      }
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const report = items.find((i) => i.id === reportId);

  if (!report) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle size={48} className="text-signal mb-4" />
        <h2 className="font-display text-2xl text-ink">HỒ SƠ KHÔNG TỒN TẠI</h2>
        <p className="text-muted text-sm mt-2 max-w-xs font-light">Tín hiệu sự vụ này đã bị mã hóa hoặc xóa bỏ khỏi hệ thống vận hành.</p>
        <button onClick={() => router.push("/")} className="mt-8 px-6 py-2 border border-ink font-mono text-xs uppercase tracking-widest hover:bg-ink hover:text-paper transition-all">Quay lại Tổng hành dinh</button>
      </div>
    );
  }

  const isAdmin = role === "admin";
  const isOwner = report.author === userEmail;

  if (!isAdmin && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-mono text-xs uppercase tracking-widest">
        [TỪ CHỐI TRUY CẬP]: BẠN KHÔNG CÓ QUYỀN THẨM ĐỊNH TÍN HIỆU NÀY.
      </div>
    );
  }

  const isDark = isAdmin;
  const ui = {
    bg: isDark ? "bg-navy text-paper" : "bg-paper text-ink",
    text: isDark ? "text-white" : "text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
    card: isDark ? "bg-white/5" : "bg-stone/5",
    input: isDark ? "bg-white/5 border-white/10 text-white" : "bg-stone/5 border-stone text-ink",
  };

  const currentStatus = statusMap[report.id] || report.status || "pending";
  const visibleComments = (report.comments || []).filter((c: CommentItem) => isAdmin ? true : !c.isInternal);
  
  // 🛠️ FIX 1 (Tiếp tục): Đọc severity từ biến report đã được ép kiểu an toàn
  const currentSeverity = report.severity || "normal";

  const handleSelectSeverity = (severityLevel: "normal" | "priority" | "urgent") => {
    if (!isAdmin) return;

    const updatedItems = items.map((item) => 
      item.id === report.id ? { ...item, severity: severityLevel } : item
    ) as unknown as StoreCommunityItem[];

    useCommunityStore.setState({ items: updatedItems });
    
    const label = severityLevel === "urgent" ? "KHẨN CẤP" : severityLevel === "priority" ? "ƯU TIÊN" : "BÌNH THƯỜNG";
    toast.success(`Đã phân loại sự vụ thành cấp độ: ${label}`);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const senderName = userEmail || (isAdmin ? "Ban Giám Hiệu" : "Học sinh");
    store.addComment(reportId, commentText.trim(), senderName, isAdmin ? isInternal : false);
    setCommentText("");
    toast.success(isInternal ? "Đã lưu ghi chú nội bộ bí mật." : "Đã gửi phản hồi hội thoại thành công!");
  };

  return (
    <div className={`min-h-screen pt-24 pb-32 px-6 lg:px-12 transition-colors duration-slow ${ui.bg}`}>
      <div className="max-w-300 mx-auto space-y-16">
        
        {/* NÚT QUAY LẠI */}
        <Reveal>
          <button onClick={() => router.back()} className={`group flex items-center gap-2 text-[0.6875rem] font-mono tracking-[0.18em] uppercase ${ui.muted} hover:text-current transition-colors`}>
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Quay lại kho lưu trữ
          </button>
        </Reveal>

        {/* HEADER CHI TIẾT */}
        <header className={`border-b ${ui.bg === 'bg-navy text-paper' ? 'border-white/15' : 'border-stone'} pb-8`}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[0.6875rem] font-mono tracking-[0.18em] text-signal uppercase">Hồ sơ thẩm định sự vụ</p>
              <h1 className="font-display text-4xl md:text-5xl tracking-tight">Mã hồ sơ: #{report.id}</h1>
            </div>
            <div className={`font-mono text-xs ${ui.muted} text-right`}>
              <p>Người phát: {isAdmin ? report.author : "Ẩn danh bảo mật"}</p>
              <p className="mt-1">Thời gian: {report.date}</p>
            </div>
          </div>
        </header>

        {/* THÂN BÀI CHIA 2 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* CỘT TRÁI: NỘI DUNG GỐC */}
          <div className="lg:col-span-7 space-y-10">
            <Reveal delay={0.1}>
              <div className="space-y-4">
                <h3 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase`}>Nội dung tường trình</h3>
                <p className={`text-2xl font-light leading-relaxed italic ${ui.text}`}>&ldquo;{report.content}&rdquo;</p>
              </div>
            </Reveal>

            {report.imageUrl && (
              <Reveal delay={0.2}>
                <div className="space-y-2">
                  <h3 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase`}>Tệp tin bằng chứng (Bấm để phóng to)</h3>
                  
                  <div 
                    onClick={() => setIsLightboxOpen(true)}
                    className={`border ${ui.border} p-1 w-fit bg-current/5 shadow-2xl relative group cursor-zoom-in overflow-hidden rounded-sm`}
                  >
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                      <Maximize2 size={20} className="text-white animate-pulse" />
                    </div>
                    <Image 
                      src={report.imageUrl} 
                      alt="Bằng chứng sự vụ" 
                      width={500}
                      height={350}
                      className="max-h-120 object-cover rounded-sm transition-transform duration-medium group-hover:scale-[1.02] w-auto h-auto" 
                      unoptimized
                    />
                  </div>
                </div>
              </Reveal>
            )}
          </div>

          {/* CỘT PHẢI: TIMELINE TIẾN TRÌNH & BẢNG ĐIỀU KHIỂN PHÂN LOẠI */}
          <div className="lg:col-span-5 space-y-8 sticky top-24">
            
            {/* THÔNG TIN CHI TIẾT VÀ PHÂN LOẠI TÀI KHOẢN */}
            <div className={`border ${ui.border} p-6 space-y-6 ${ui.card} rounded-sm shadow-xl`}>
              <h3 className="font-mono text-xs uppercase tracking-widest border-b border-current/10 pb-3">Thẩm định hồ sơ</h3>
              
              <div className="space-y-3 font-mono text-[11px] uppercase tracking-wider">
                <div className="flex items-center gap-3"><User size={14} className="text-gold" /> <span className="truncate">Người nộp: {isAdmin ? report.author.split('@')[0] : "Giấu danh tính"}</span></div>
                <div className="flex items-center gap-3"><MapPin size={14} /> <span>Phòng ban: Bảo mật 1-1</span></div>
                <div className="flex items-center gap-3"><Shield size={14} /> <span>Mã hóa: Đầu cuối AES</span></div>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-current/10 space-y-3">
                  <span className={`text-[10px] font-mono uppercase tracking-widest block ${ui.muted}`}>
                    ⚙️ Phân loại mức độ nghiêm trọng (BGH):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button"
                      onClick={() => handleSelectSeverity("normal")}
                      className={`h-9 flex items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-wider border rounded-sm transition-all ${
                        currentSeverity === "normal" 
                          ? "bg-white text-navy font-bold border-white" 
                          : "border-white/10 text-white/40 hover:border-white/40"
                      }`}
                    >
                      <Info size={10} /> Bình thường
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSelectSeverity("priority")}
                      className={`h-9 flex items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-wider border rounded-sm transition-all ${
                        currentSeverity === "priority" 
                          ? "bg-amber-500/20 border-amber-500 text-amber-500 font-bold" 
                          : "border-white/10 text-white/40 hover:border-amber-500/40"
                      }`}
                    >
                      <AlertCircle size={10} /> Ưu tiên
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSelectSeverity("urgent")}
                      className={`h-9 flex items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-wider border rounded-sm transition-all ${
                        currentSeverity === "urgent" 
                          ? "bg-red-500/20 border-red-500 text-red-500 font-bold animate-pulse" 
                          : "border-white/10 text-white/40 hover:border-red-500/40"
                      }`}
                    >
                      <ShieldAlert size={10} /> Khẩn cấp
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-current/10">
                <span className={`text-[10px] font-mono uppercase tracking-widest block mb-2 ${ui.muted}`}>Tiến độ giải quyết:</span>
                {currentStatus === "pending" && <span className="border border-amber-500 text-amber-500 px-3 py-1.5 uppercase text-[10px] bg-amber-500/5 font-bold tracking-widest flex items-center justify-center gap-2 rounded-sm"><Clock size={12} className="animate-pulse" /> Đang điều phối</span>}
                {currentStatus === "approved" && <span className="border border-green-500 text-green-500 px-3 py-1.5 uppercase text-[10px] bg-green-500/5 font-bold tracking-widest flex items-center justify-center gap-2 rounded-sm"><CheckCircle2 size={12} /> Đã giải quyết</span>}
                {currentStatus === "rejected" && <span className="border border-red-500 text-red-400 px-3 py-1.5 uppercase text-[10px] bg-red-500/5 font-bold tracking-widest flex items-center justify-center gap-2 rounded-sm"><XCircle size={12} /> Đã lưu trữ</span>}
              </div>
            </div>

            {/* TIMELINE TRỰC QUAN */}
            <div className={`border ${ui.border} p-6 ${ui.card} rounded-sm space-y-6`}>
              <h3 className="font-mono text-xs uppercase tracking-widest border-b border-current/10 pb-3">Tiến trình điều phối</h3>
              {/* 🛠️ FIX 3: Viết chuẩn quy định spacing của Tailwind (left-[11px]) thay vì để nó chửi */}
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-current/10">
                <div className="flex gap-4 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-cyan text-navy flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.5)]"><Clock size={12} /></div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">Đã tiếp nhận tín hiệu</h4>
                    <p className={`text-[10px] ${ui.muted} mt-1 font-light leading-relaxed`}>Hệ thống đã mã hóa bảo mật thành công hồ sơ.</p>
                  </div>
                </div>
                <div className="flex gap-4 relative z-10">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${currentStatus !== 'pending' ? 'bg-cyan text-navy' : 'bg-gold text-ink animate-pulse'}`}>
                    <Eye size={12} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">BGH Thẩm định & Phân loại</h4>
                    <p className={`text-[10px] ${ui.muted} mt-1 font-light leading-relaxed`}>
                      {currentStatus === "pending" ? "Đang chờ Ban Giám Hiệu rà soát gán mức độ nghiêm trọng." : "BGH đã hoàn thành rà soát nội dung và phân bổ hồ sơ."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PHẦN DƯỚI: HỘP THOẠI TRAO ĐỔI (CHAT) */}
        <section className="space-y-8 pt-16 border-t border-current/10">
          <Reveal>
            <h3 className={`text-[0.6875rem] font-mono tracking-[0.18em] uppercase ${ui.muted} flex items-center gap-2`}>
              <MessageSquare size={14} /> Nhật ký đàm thoại dữ liệu ({visibleComments.length})
            </h3>
          </Reveal>

          <div className="space-y-4 max-w-200">
            {visibleComments.length === 0 ? (
              <p className={`text-xs italic font-light ${ui.muted} py-4`}>Hệ thống chưa ghi nhận phản hồi hội thoại nào.</p>
            ) : (
              visibleComments.map((c, idx) => {
                const isMyComment = c.sender === userEmail || (isAdmin && c.sender === "Ban Giám Hiệu");
                return (
                  <Reveal key={c.id} delay={idx * 0.05}>
                    <div className={`p-5 border rounded-sm transition-all ${
                      c.isInternal ? "border-amber-500/30 bg-amber-500/5" : isMyComment ? "border-signal/30 bg-signal/5" : `border-current/10 bg-transparent`
                    }`}>
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{isMyComment ? "Tôi" : c.sender.split('@')[0]}</span>
                          {c.isInternal && <span className="border border-amber-500 text-amber-500 text-[8px] uppercase tracking-widest px-1.5 py-0.2 rounded-sm flex items-center gap-1"><Lock size={8} /> Nội bộ Admin</span>}
                        </div>
                        <span className={`font-mono text-[9px] ${ui.muted}`}>{c.date}</span>
                      </div>
                      <p className="text-sm font-light leading-relaxed">{c.text}</p>
                    </div>
                  </Reveal>
                );
              })
            )}
          </div>

          <Reveal delay={0.2}>
            <form onSubmit={handleSendComment} className="space-y-4 pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <label className="text-[0.6875rem] font-mono tracking-[0.18em] uppercase text-muted">Gửi tín hiệu phản hồi</label>
                {isAdmin && (
                  <button type="button" onClick={() => setIsInternal(!isInternal)} className={`px-3 py-1.5 border font-mono text-[9px] uppercase tracking-wider flex items-center gap-2 transition-all rounded-sm ${isInternal ? "border-amber-500 text-amber-500 bg-amber-500/5 font-bold" : "border-white/20 text-white/50 hover:border-white"}`}>
                    {isInternal ? <Lock size={10} /> : <EyeOff size={10} />} {isInternal ? "Ghi chú nội bộ BGH" : "Phản hồi học sinh"}
                  </button>
                )}
              </div>
              <div className="flex gap-4 items-end">
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={isInternal ? "Nhập ghi chú nội bộ (Học sinh sẽ không nhìn thấy)..." : "Nhập tin nhắn trao đổi 1-1..."} rows={2} className={`flex-1 p-4 border focus:outline-none focus:border-current text-sm font-light resize-none rounded-sm ${ui.input}`} required />
                <button type="submit" disabled={!commentText.trim()} className="p-4 bg-ink text-paper dark:bg-paper dark:text-navy hover:opacity-95 transition-opacity disabled:opacity-30 h-12 flex items-center justify-center rounded-sm shrink-0 shadow-lg"><Send size={16} /></button>
              </div>
            </form>
          </Reveal>
        </section>

      </div>

      {/* LIGHTBOX OVERLAY */}
      {isLightboxOpen && report.imageUrl && (
        <div 
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-fast"
        >
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors z-[110]"
          >
            <X size={24} />
          </button>
          
          <Image 
            src={report.imageUrl} 
            alt="Bằng chứng sự vụ phóng to" 
            width={1200}
            height={900}
            className="max-w-full max-h-[85vh] object-contain rounded-sm select-none shadow-2xl animate-in zoom-in-95 duration-fast w-auto h-auto"
            onClick={(e) => e.stopPropagation()} 
            unoptimized
          />
        </div>
      )}
    </div>
  );
}