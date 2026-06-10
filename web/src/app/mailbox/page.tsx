"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CheckCircle, XCircle, Trash2, Clock, Eye, Paperclip } from "lucide-react";
import toast from "react-hot-toast";

// Hút kiểu dữ liệu gốc từ Store Zustand để đồng bộ lúc lưu trạng thái
type StoreCommunityItem = ReturnType<typeof useCommunityStore.getState>["items"][number];

interface ReportItem {
  id: number;
  type: string;
  title: string;
  content: string;
  author: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  imageUrl: string | null;
  comments?: string[];
  upvotes: string[];
  downvotes: string[];
  severity?: "normal" | "priority" | "urgent"; // 🛠️ Tích hợp thuộc tính phân loại chuẩn hóa
}

type TabType = "pending" | "approved" | "rejected";

export default function MailboxPage() {
  const router = useRouter();
  const { role } = useAuthStore();
  
  const store = useCommunityStore();
  
  // Ép kiểu mảng một lần qua unknown rồi sang ReportItem[] để xóa sạch chữ 'any'
  const items = (store.items || []) as unknown as ReportItem[];

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const savedMap = localStorage.getItem("schoolos_feed_status_map");
    
    const timer = setTimeout(() => {
      if (savedMap) {
        try { 
          setStatusMap(JSON.parse(savedMap) || {}); 
        } catch {}
      }
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  // Lọc lấy các đơn thư thuộc loại mailbox
  const allReports = items.filter((i) => i.type === "mailbox");

  // Hàm cập nhật trạng thái đơn thư trực tiếp ngầm
  const handleUpdateStatus = (id: number, newStatus: "approved" | "rejected") => {
    // 1. Cập nhật cục bộ vào localStorage để Navbar ăn theo bộ lọc tính thông báo
    const savedMap = localStorage.getItem("schoolos_feed_status_map");
    let currentMap: Record<number, string> = {};
    if (savedMap) { try { currentMap = JSON.parse(savedMap) || {}; } catch {} }
    currentMap[id] = newStatus;
    localStorage.setItem("schoolos_feed_status_map", JSON.stringify(currentMap));
    setStatusMap(currentMap);

    // 2. Cập nhật trực tiếp vào trạng thái phần tử trong Zustand Store tổng
    const updatedItems = items.map((item) => 
      item.id === id ? { ...item, status: newStatus } : item
    );
    
    // Ép kiểu ngược lại sang cấu trúc gốc của Store khi lưu dữ liệu
    useCommunityStore.setState({ items: updatedItems as unknown as StoreCommunityItem[] });
    
    toast.success(newStatus === "approved" ? "Đã giải quyết sự vụ!" : "Đã lưu trữ hồ sơ.");
  };

  const handleDeleteReport = (id: number) => {
    if (window.confirm("Hệ thống cảnh báo: Bạn có chắc chắn muốn xóa vĩnh viễn sự vụ này không?")) {
      const updatedItems = items.filter((item) => item.id !== id);
      useCommunityStore.setState({ items: updatedItems as unknown as StoreCommunityItem[] });
      toast.success("Sự vụ đã bốc hơi khỏi hệ thống.");
    }
  };

  // Gom nhóm dữ liệu theo Tab động dựa trên trạng thái đồng bộ
  const filteredReports = activeReportsByTab(allReports, activeTab, statusMap);

  const countByTab = (tab: TabType) => {
    return allReports.filter((r) => {
      const currentStatus = statusMap[r.id] || r.status || "pending";
      return currentStatus === tab;
    }).length;
  };

  return (
    <div className="min-h-screen bg-navy text-paper pt-24 pb-32 px-6 lg:px-12 font-body">
      <div className="max-w-360 mx-auto space-y-12">
        
        {/* TIÊU ĐỀ THƯỢNG TẦNG */}
        <div className="border-b border-white/15 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-signal block">
              ✦ TRUNG TÂM ĐIỀU PHỐI TỐI CAO
            </span>
            <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
              Hòm Thư Thẩm Định Sự Vụ
            </h1>
          </div>
          
          {/* THANH CHUYỂN TAB CHUẨN UX */}
          <div className="flex gap-6 font-mono text-xs uppercase tracking-wider">
            {(["pending", "approved", "rejected"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 transition-all relative ${
                  activeTab === tab ? "text-white font-bold border-b-2 border-white" : "text-paper/40 hover:text-white"
                }`}
              >
                {tab === "pending" && `Chưa xử lý (${countByTab("pending")})`}
                {tab === "approved" && `Đã giải quyết (${countByTab("approved")})`}
                {tab === "rejected" && `Đã lưu trữ (${countByTab("rejected")})`}
              </button>
            ))}
          </div>
        </div>

        {/* DANH SÁCH SỰ VỤ */}
        <div className="flex flex-col gap-6">
          {filteredReports.length === 0 ? (
            <div className="py-24 text-center text-paper/40 font-display text-xl italic border border-dashed border-white/10 rounded-sm">
              Không có hồ sơ sự vụ nào nằm trong danh mục này.
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => router.push(`/report/${report.id}`)} 
                className="bg-white/5 border border-white/10 hover:border-white/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer transition-all group relative rounded-sm"
              >
                <div className="flex-1 min-w-0 flex gap-6 items-start">
                  
                  {/* THÊM THUMBNAIL ẢNH BẰNG CHỨNG */}
                  {report.imageUrl && (
                    <div className="hidden sm:block shrink-0 relative w-20 h-20 border border-white/20 rounded-sm overflow-hidden bg-black/40">
                      <Image 
                        src={report.imageUrl} 
                        alt="Thumbnail bằng chứng" 
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute bottom-1 right-1 bg-black/70 p-0.5 rounded-sm">
                        <Paperclip size={10} className="text-signal" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-paper/50 flex-wrap">
                      <span className="bg-white/10 px-2 py-0.5 text-white">#{report.id}</span>
                      <span>Người gửi: <span className="text-paper/80 font-medium">{report.author?.split('@')[0] || "Ẩn danh"}</span></span>
                      <span><Clock size={10} className="inline mr-1" />{report.date}</span>
                      
                      {/* 🛠️ CHUẨN HÓA BADGE PHÂN LOẠI TỪ ADMIN: Hiện đúng cấp độ nghiêm trọng thực tế do BGH gán, sạch bóng chữ 'any' */}
                      {report.severity === "urgent" && (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 uppercase text-[9px] font-bold tracking-widest animate-pulse rounded-sm">
                          Khẩn cấp
                        </span>
                      )}
                      {report.severity === "priority" && (
                        <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 uppercase text-[9px] font-bold tracking-widest rounded-sm">
                          Ưu tiên
                        </span>
                      )}
                      {(report.severity === "normal" || !report.severity) && (
                        <span className="bg-white/10 text-white/60 border border-white/10 px-2 py-0.5 uppercase text-[9px] font-medium tracking-wider rounded-sm">
                          Bình thường
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-medium text-white group-hover:text-signal transition-colors truncate flex items-center gap-2">
                      {report.title}
                      {report.imageUrl && <Paperclip size={14} className="text-signal sm:hidden" />}
                    </h3>
                    <p className="text-sm text-paper/70 font-light line-clamp-2 leading-relaxed">
                      &ldquo;{report.content}&rdquo;
                    </p>
                  </div>
                </div>

                {/* KHU VỰC CÁC NÚT ĐIỀU KHIỂN DUYỆT NHANH */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                  {(statusMap[report.id] || report.status || "pending") === "pending" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(report.id, "approved"); }}
                        className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 rounded-sm font-bold transition-colors shadow-lg animate-in fade-in duration-fast"
                      >
                        <CheckCircle size={14} /> Giải quyết
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(report.id, "rejected"); }}
                        className="h-10 px-4 border border-white/20 hover:bg-white/10 text-paper/80 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 rounded-sm transition-colors"
                      >
                        <XCircle size={14} /> Lưu trữ
                      </button>
                    </>
                  )}
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); router.push(`/report/${report.id}`); }}
                    className="w-11 h-11 border border-white/10 hover:border-white/30 rounded-sm flex items-center justify-center text-paper/40 hover:text-signal transition-colors md:hidden"
                    title="Xem chi tiết"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                    className="w-11 h-11 flex items-center justify-center text-paper/40 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                    title="Xóa vĩnh viễn"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

function activeReportsByTab(reports: ReportItem[], tab: TabType, localMap: Record<number, string>) {
  return reports.filter((r) => {
    const currentStatus = localMap[r.id] || r.status || "pending";
    return currentStatus === tab;
  }).reverse();
}