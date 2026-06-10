"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, PlusCircle, Megaphone, User, 
  ArrowRight, Mail, Shield, MapPin, ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";
import Reveal from "@/components/motion/Reveal";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useAuthStore } from "@/store/useAuthStore";

interface FeedItem {
  id: number;
  type: string;
  author: string;
  date: string;
  content: string;
  status?: "pending" | "approved" | "rejected";
}

interface CommunityStoreMethods {
  items: FeedItem[];
  addFeedPost: (content: string, imageUrl: string | null, author: string) => void;
}

export default function DashboardPage() {
  const router = useRouter();
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items, addFeedPost } = store;
  const { userEmail, role } = useAuthStore();
  
  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");
  const isDark = role === "admin";

  const ui = {
    bg: isDark ? "bg-navy text-paper" : "bg-paper text-ink",
    text: isDark ? "text-paper" : "text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
    card: isDark ? "bg-white/5" : "bg-stone/5",
  };

  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [statusMap, setStatusMap] = useState<Record<number, "pending" | "approved" | "rejected">>({});

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

  // Lọc dữ liệu thực tế từ Store
  const allPosts = (items || []).filter(i => i.type === "feed");
  
  // MỤC 1: Báo cáo của tôi (Học sinh xem bài của mình, Admin xem toàn bộ bài chờ duyệt)
  const myReports = allPosts.map(item => {
    const localStatus = statusMap[item.id];
    return { ...item, status: localStatus || item.status || "pending" };
  }).filter(item => {
    if (role === "admin") return item.status === "pending";
    return item.author === currentUserName;
  }).reverse();

  // MỤC 3: Trích xuất 2 bài viết mới nhất trên bảng tin chung
  const latestPublicFeed = allPosts.filter(item => {
    const localStatus = statusMap[item.id];
    return (localStatus || item.status || "approved") === "approved";
  }).reverse().slice(0, 2);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return toast.error("Vui lòng nhập nội dung báo cáo.");

    const existingIds = new Set((items || []).map(i => i.id));
    addFeedPost(content + (location ? ` [Vị trí: ${location}]` : ""), null, currentUserName);

    setTimeout(() => {
      const currentItems = (useCommunityStore.getState() as unknown as CommunityStoreMethods).items || [];
      const newPost = currentItems.find(i => !existingIds.has(i.id));
      const targetId = newPost ? newPost.id : Date.now();

      const initialStatus = role === "admin" ? "approved" : "pending";
      setStatusMap(prev => {
        const updated = { ...prev, [targetId]: initialStatus as "pending" | "approved" | "rejected" };
        localStorage.setItem("schoolos_feed_status_map", JSON.stringify(updated));
        return updated;
      });

      setContent(""); setLocation("");
      toast.success("Tín hiệu đã được đồng bộ lên hệ thống!");
    }, 50);
  };

  return (
    <div className={`min-h-screen pt-24 pb-32 px-6 lg:px-12 transition-colors duration-slow ${ui.bg}`}>
      <div className="max-w-360 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        {/* CỘT TRÁI (COL 8): KHU VỰC QUẢN LÝ SỰ VỤ & BẢNG TIN */}
        <div className="lg:col-span-8 space-y-20">
          
          {/* KHU VỰC 01: BÁO CÁO CỦA TÔI & TRẠNG THÁI */}
          <section className="space-y-6">
            <div className="border-b border-stone/30 pb-4 flex justify-between items-end">
              <h2 className="font-display text-2xl tracking-tight flex items-center gap-3">
                <span className="font-mono text-xs text-signal border border-signal px-1.5 py-0.5 rounded-sm">01</span>
                {role === "admin" ? "Hộp thư thẩm định sự vụ khẩn cấp" : "Giám sát & Trạng thái báo cáo của tôi"}
              </h2>
            </div>

            <div className="flex flex-col border border-stone/20 bg-stone/5">
              {myReports.length === 0 ? (
                <div className={`p-12 text-center italic text-sm ${ui.muted}`}>
                  Không có sự vụ nào trong danh sách hiển thị.
                </div>
              ) : (
                myReports.map((report) => (
                  <div 
                    key={report.id}
                    onClick={() => router.push(`/report/${report.id}`)}
                    className={`p-6 border-b ${ui.border} hover:bg-stone/10 transition-colors flex items-center justify-between gap-4 cursor-pointer`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] bg-stone/20 px-1.5 py-0.2">#{report.id}</span>
                        <h4 className="text-sm font-medium truncate">{report.author}</h4>
                        <span className={`font-mono text-[0.6rem] ${ui.muted}`}>{report.date}</span>
                      </div>
                      <p className={`text-sm ${ui.text} font-light truncate`}>{report.content}</p>
                    </div>

                    <div className="shrink-0">
                      {report.status === "pending" && (
                        <span className="border border-gold text-gold text-[0.6rem] uppercase tracking-widest px-2 py-0.5 flex items-center gap-1"><Clock size={10}/> Chờ duyệt</span>
                      )}
                      {report.status === "approved" && (
                        <span className="border border-cyan text-cyan text-[0.6rem] uppercase tracking-widest px-2 py-0.5">Đã công khai</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* KHU VỰC 02: TẠO BÁO CÁO (FORM TẠI CHỖ) */}
          <section className="space-y-6">
            <div className="border-b border-stone/30 pb-4 flex justify-between items-center">
              <h2 className="font-display text-2xl tracking-tight flex items-center gap-3">
                <span className="font-mono text-xs text-signal border border-signal px-1.5 py-0.5 rounded-sm">02</span>
                Tạo lập báo cáo sự cố khẩn cấp
              </h2>
              <button onClick={() => router.push("/report/new")} className={`text-xs font-mono uppercase tracking-wider text-signal flex items-center gap-1 hover:underline`}>
                <PlusCircle size={14}/> Mở chế độ Focus
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className={`border ${ui.border} p-6 space-y-4 ${ui.card}`}>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung sự việc cần báo cáo hoặc thông báo..."
                rows={2}
                className="w-full bg-transparent border-b border-stone/30 py-2 focus:outline-none focus:border-current transition-colors text-sm font-light placeholder:text-stone-400 resize-none"
                required
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <input 
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Nhập vị trí (VD: Phòng tin học, Sân bóng)..."
                  className="w-full sm:w-2/3 bg-transparent border-b border-stone/30 pb-1 focus:outline-none focus:border-current text-xs font-light"
                />
                <button type="submit" className="bg-ink text-paper dark:bg-paper dark:text-navy px-4 py-2 font-mono text-[0.65rem] uppercase tracking-widest ml-auto shrink-0">
                  Gửi tín hiệu
                </button>
              </div>
            </form>
          </section>

          {/* KHU VỰC 03: TRÍCH XUẤT BẢNG TIN CỘNG ĐỒNG */}
          <section className="space-y-6">
            <div className="border-b border-stone/30 pb-4 flex justify-between items-end">
              <h2 className="font-display text-2xl tracking-tight flex items-center gap-3">
                <span className="font-mono text-xs text-signal border border-signal px-1.5 py-0.5 rounded-sm">03</span>
                Bảng tin công khai (Tin mới nhận)
              </h2>
              <button onClick={() => router.push("/feed")} className={`text-xs font-mono uppercase tracking-wider ${ui.muted} hover:text-current flex items-center gap-1`}>
                Xem toàn bộ <ArrowRight size={12}/>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestPublicFeed.map(post => (
                <div 
                  key={post.id}
                  onClick={() => router.push(`/report/${post.id}`)}
                  className={`border ${ui.border} p-5 ${ui.card} hover:border-current transition-all cursor-pointer flex flex-col justify-between h-40 group`}
                >
                  <p className="text-sm font-light leading-relaxed line-clamp-3">&ldquo;{post.content}&rdquo;</p>
                  <div className="flex items-center justify-between border-t border-stone/20 pt-3 mt-4">
                    <span className="text-[10px] font-mono text-stone-500">Tác giả: Ẩn danh</span>
                    <ArrowRight size={14} className="text-stone-400 group-hover:translate-x-1 group-hover:text-signal transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* CỘT PHẢI (COL 4): KHU VỰC 04 - HỒ SƠ TÓM TẮT */}
        <div className="lg:col-span-4">
          <section className="space-y-6 lg:sticky top-24">
            <div className="border-b border-stone/30 pb-4">
              <h2 className="font-display text-lg tracking-tight flex items-center gap-3">
                <span className="font-mono text-[10px] text-signal border border-signal px-1 py-0.2 rounded-sm">04</span>
                Thông tin tài khoản cá nhân
              </h2>
            </div>

            <div className={`border ${ui.border} p-6 space-y-6 bg-stone/5`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full border ${ui.border} flex items-center justify-center font-display text-lg`}>
                  {currentUserName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display text-base leading-tight truncate max-w-[160px]">{currentUserName}</h3>
                  <p className="font-mono text-[0.6rem] text-gold uppercase tracking-widest mt-0.5">Role: {role}</p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-[0.65rem] border-t border-stone/20 pt-4 text-stone-500">
                <div className="flex items-center gap-3"><Mail size={12}/> <span>{userEmail}</span></div>
                <div className="flex items-center gap-3"><Shield size={12}/> <span className="capitalize">Hệ thống: Quy chuẩn an ninh</span></div>
                <div className="flex items-center gap-3"><MapPin size={12}/> <span>THPT Chuyên SchoolOS</span></div>
              </div>

              <button 
                onClick={() => router.push("/profile")}
                className="w-full text-center py-2.5 border border-stone font-mono text-[0.65rem] uppercase tracking-widest hover:bg-current hover:text-navy dark:hover:text-navy transition-all"
              >
                Chi tiết hồ sơ
              </button>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}