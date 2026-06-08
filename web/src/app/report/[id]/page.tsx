"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation"; 
// 🛠️ FIX CÀNH BÁO: Xóa CheckCircle không sử dụng để giải phóng tài nguyên
import { ArrowLeft, Clock, ShieldCheck, AlertTriangle, Eye } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useAuthStore } from "@/store/useAuthStore";

interface FeedItem {
  id: number;
  type: string;
  author: string;
  date: string;
  content: string;
  imageUrl?: string | null;
  status?: "pending" | "approved" | "rejected";
}

interface CommunityStoreMethods {
  items: FeedItem[];
}

export default function ReportDetailPage() {
  const router = useRouter();
  const { id } = useParams(); 
  const { role } = useAuthStore();
  
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items } = store;

  const [statusMap, setStatusMap] = useState<Record<number, "pending" | "approved" | "rejected">>({});
  const [mounted, setMounted] = useState(false);

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

  const rawItem = (items || []).find(i => i.id === Number(id));
  const currentItem = rawItem || (items || []).find(i => String(i.id) === String(id));

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center p-6">
        <AlertTriangle size={40} className="text-signal mb-4" />
        <h2 className="font-display text-2xl mb-2">Không tìm thấy mã sự vụ</h2>
        <p className="text-muted text-sm mb-6 font-light">Hồ sơ này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <button onClick={() => router.push("/feed")} className="font-mono text-xs uppercase tracking-widest border border-ink px-4 py-2">
          Quay lại bảng tin
        </button>
      </div>
    );
  }

  const currentStatus = statusMap[currentItem.id] || currentItem.status || "pending";

  const isDark = role === "admin";
  const ui = {
    bg: isDark ? "bg-navy text-paper" : "bg-paper text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
  };

  return (
    <div className={`min-h-screen pt-24 pb-32 px-6 lg:px-12 transition-colors duration-slow ${ui.bg}`}>
      {/* 🛠️ FIX TAILWIND: Đổi max-w-[1000px] sang class chuẩn max-w-250 */}
      <div className="max-w-250 mx-auto">
        
        {/* NÚT QUAY LẠI */}
        <Reveal>
          <button 
            onClick={() => router.back()} 
            className={`group flex items-center gap-2 text-[0.6875rem] font-mono tracking-[0.18em] uppercase ${ui.muted} hover:text-current transition-colors mb-16`}
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            Quay lại kho lưu trữ
          </button>
        </Reveal>

        {/* TIÊU ĐỀ HỒ SƠ CHÍNH CHỦ */}
        <header className={`border-b ${ui.border} pb-8 mb-16`}>
          <Reveal>
            <p className="text-[0.6875rem] font-mono tracking-[0.18em] text-signal uppercase mb-3">
              Hồ sơ giám sát sự vụ
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-none">
              Mã hồ sơ: #{currentItem.id}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <div className={`flex items-center gap-6 mt-6 font-mono text-xs ${ui.muted}`}>
              <span>Người phát tín hiệu: {role === "admin" ? currentItem.author : "Ẩn danh bảo mật"}</span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span>Thời gian: {currentItem.date}</span>
            </div>
          </Reveal>
        </header>

        {/* THÂN BÀI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* CỘT NỘI DUNG GỐC */}
          <div className="lg:col-span-7 space-y-8">
            <Reveal delay={0.3}>
              <div className="space-y-4">
                <h3 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase`}>Nội dung tường trình</h3>
                {/* 🛠️ FIX LỖI ĐỎ: Thay thế dấu ngoặc kép bằng thực thể HTML &ldquo; và &rdquo; */}
                <p className="text-xl font-light leading-relaxed tracking-wide italic">
                  &ldquo;{currentItem.content}&rdquo;
                </p>
              </div>
            </Reveal>

            {currentItem.imageUrl && (
              <Reveal delay={0.4}>
                <div className={`border ${ui.border} p-1 w-fit mt-6`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentItem.imageUrl} alt="Bằng chứng sự vụ" className="max-h-150 object-cover" />
                </div>
              </Reveal>
            )}
          </div>

          {/* CỘT SỢI CHỈ ĐỎ TIMELINE */}
          <div className="lg:col-span-5 border-l border-stone pl-8 lg:pl-12 space-y-12 relative">
            <h3 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase mb-8`}>Tuyến tiến trình xử lý</h3>
            
            {/* Vạch tiến trình */}
            {/* 🛠️ FIX TAILWIND: Đổi before:left-[11px] thành before:left-2.75 và before:w-[1px] thành before:w-px */}
            <div className="space-y-12 relative before:absolute before:left-2.75 before:top-2 before:bottom-2 before:w-px before:bg-stone">
              
              {/* BƯỚC 1: TIẾP NHẬN */}
              <Reveal delay={0.4}>
                <div className="flex gap-4 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-cyan text-navy flex items-center justify-center"><Clock size={12} /></div>
                  <div>
                    <h4 className="text-sm font-medium">Hệ thống tiếp nhận tín hiệu</h4>
                    <p className={`text-xs ${ui.muted} mt-1 font-light`}>Mã hóa danh tính và tạo lập hồ sơ thành công.</p>
                  </div>
                </div>
              </Reveal>

              {/* BƯỚC 2: PHÂN LOẠI ĐIỀU PHỐI */}
              <Reveal delay={0.5}>
                <div className="flex gap-4 relative z-10">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${currentStatus !== 'pending' ? 'bg-cyan text-navy' : 'bg-gold text-ink animate-pulse'}`}>
                    <Eye size={12} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Ban Giám Hiệu thẩm định</h4>
                    <p className={`text-xs ${ui.muted} mt-1 font-light`}>
                      {currentStatus === "pending" ? "Đang nằm trong hòm thư chờ điều phối viên phân loại." : "Điều phối viên đã hoàn thành đọc và thẩm định nội dung."}
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* BƯỚC 3: KẾT LUẬN HỒ SƠ */}
              <Reveal delay={0.6}>
                <div className="flex gap-4 relative z-10">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    currentStatus === 'approved' ? 'bg-signal text-paper' : currentStatus === 'rejected' ? 'bg-stone text-paper' : 'border border-stone bg-transparent text-stone'
                  }`}>
                    <ShieldCheck size={12} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Trạng thái cuối cùng</h4>
                    <p className={`text-xs ${ui.muted} mt-1 font-light`}>
                      {currentStatus === "approved" && "Hồ sơ hợp lệ. Đã phát tán cảnh báo công khai lên Bảng tin."}
                      {currentStatus === "rejected" && "Hồ sơ bị từ chối hoặc được chuyển sang lưu trữ nội bộ."}
                      {currentStatus === "pending" && "Đang đợi quyết định phê duyệt."}
                    </p>
                  </div>
                </div>
              </Reveal>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}