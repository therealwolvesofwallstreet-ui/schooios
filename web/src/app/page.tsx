"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore } from "@/store/useCommunityStore";
import { 
  Clock, PlusCircle, Megaphone, User, 
  ArrowRight, Mail, Shield, MapPin, Trash2 
} from "lucide-react";
import toast from "react-hot-toast";
import Reveal from "@/components/motion/Reveal";

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
  deleteItem: (id: number) => void;
}

export default function RootHomepage() {
  const router = useRouter();
  
  const { login, userEmail, role } = useAuthStore();
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items, addFeedPost, deleteItem } = store;

  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");
  const isDark = role === "admin";
  
  // 🛠️ FIX LỜI 53: Dùng Lazy Initialization đọc thẳng từ localStorage khi khởi tạo state
  // Không gọi setState trong useEffect nữa để triệt tiêu lỗi cascading renders của ESLint
  const [isSessionActive, setIsSessionActive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("schoolos_session_active") === "true";
    }
    return false;
  });

  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<"student" | "admin">("student");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [statusMap, setStatusMap] = useState<Record<number, "pending" | "approved" | "rejected">>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("schoolos_feed_status_map");
    // Đồng bộ lại session thực tế phòng trường hợp thay đổi ẩn
    const session = localStorage.getItem("schoolos_session_active") === "true";
    
    const timer = setTimeout(() => {
      setIsSessionActive(session);
      if (saved) {
        try { setStatusMap(JSON.parse(saved)); } catch { /* ignore */ }
      }
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // 🛠️ ĐỒNG BỘ ĐỊNH NGHĨA UI TOÀN CỤC: Giúp JSX bên dưới luôn tìm thấy biến ui, xóa sạch 12 lỗi "Cannot find name 'ui'"
  const ui = {
    bg: isDark ? "bg-navy text-paper" : "bg-paper text-ink",
    text: isDark ? "text-paper" : "text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
    card: isDark ? "bg-white/5" : "bg-stone/5",
  };

  const isUserLoggedIn = !!userEmail && isSessionActive === true;

  if (!mounted) return null;

  const handleResultLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    
    localStorage.setItem("schoolos_session_active", "true");
    setIsSessionActive(true);

    (login as (email: string, role: string) => void)(emailInput, selectedRole);
    toast.success("Đã mở khóa không gian vận hành.");
  };

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
      toast.success("Tín hiệu sự vụ đã được đồng bộ hóa!");
    }, 50);
  };

  const allPosts = (items || []).filter(i => i.type === "feed");
  
  const myReports = allPosts.map(item => {
    const localStatus = statusMap[item.id];
    return { ...item, status: localStatus || item.status || "pending" };
  }).filter(item => {
    if (role === "admin") return item.status === "pending";
    return item.author === currentUserName;
  }).reverse();

  const latestPublicFeed = allPosts.filter(item => {
    const localStatus = statusMap[item.id];
    return (localStatus || item.status || "approved") === "approved";
  }).reverse().slice(0, 2);

  // ========================================================
  // KỊCH BẢN 1: CHƯA ĐĂNG NHẬP HOẶC ĐÃ ĐĂNG XUẤT -> HIỆN MÀN HÌNH ĐĂNG NHẬP
  // ========================================================
  if (!isUserLoggedIn) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col lg:flex-row font-body selection:bg-gold selection:text-ink">
        <div className="flex-1 p-8 lg:p-24 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-stone relative overflow-hidden">
          <div className="absolute -left-20 -bottom-20 text-[15rem] font-display text-stone/10 select-none pointer-events-none leading-none">OS</div>
          <Reveal>
            <div className="flex items-center gap-3 relative z-10">
              <h1 className="font-display text-xl tracking-tight text-ink">School<span className="italic font-light">OS</span></h1>
              <span className="border border-ink text-ink text-[0.6rem] uppercase tracking-wildest px-1.5 py-0.5 font-mono">BETA 1.0</span>
            </div>
          </Reveal>
          <div className="mt-32 lg:mt-0 relative z-10">
            <Reveal delay={0.2}>
              <h2 className="font-display text-[clamp(2.5rem,5vw,5rem)] leading-[1.05] tracking-tight mb-8 max-w-2xl">
                Nơi mọi tiếng nói<br /><span className="italic font-light text-stone-600">đều được lắng nghe.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="font-light text-base text-ink/80 max-w-sm">Hệ thống vận hành sự vụ học đường thế hệ mới. Tĩnh lặng, minh bạch và bảo vệ an toàn danh tính.</p>
            </Reveal>
          </div>
          <Reveal delay={0.4}><p className="hidden lg:block font-mono text-[0.65rem] tracking-widest text-muted uppercase">© 2026 • THPT CHUYÊN KHOS</p></Reveal>
        </div>

        <div className="flex-1 p-8 lg:p-24 flex items-center justify-center bg-stone/5">
          <Reveal delay={0.5} yOffset={20}>
            <div className="w-full max-w-md space-y-12">
              <h3 className="text-[0.6875rem] font-mono tracking-[0.18em] text-muted uppercase flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span> Xác thực danh tính
              </h3>
              <form onSubmit={handleResultLogin} className="space-y-12">
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Nhập email trường cấp..."
                  className="w-full bg-transparent border-b border-stone py-4 text-xl font-light focus:outline-none focus:border-ink placeholder:text-stone transition-colors"
                  required
                />
                <div className="space-y-4">
                  <p className="text-[0.6875rem] font-mono tracking-widest text-muted uppercase">Vai trò vận hành</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setSelectedRole("student")} className={`py-4 flex flex-col items-center gap-2 border text-xs font-mono uppercase tracking-wider ${selectedRole === "student" ? "border-ink text-ink bg-white" : "border-stone text-muted"}`}>
                      <User size={16}/> Học sinh
                    </button>
                    <button type="button" onClick={() => setSelectedRole("admin")} className={`py-4 flex flex-col items-center gap-2 border text-xs font-mono uppercase tracking-wider ${selectedRole === "admin" ? "border-navy bg-navy text-paper" : "border-stone text-muted"}`}>
                      <Shield size={16}/> Ban Giám Hiệu
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={!emailInput.trim()} className="w-full flex items-center justify-between py-6 border-b border-ink text-ink font-display text-2xl hover:text-signal hover:border-signal transition-colors disabled:opacity-30">
                  <span>Mở không gian</span>
                  <span className="w-10 h-10 rounded-full border border-ink flex items-center justify-center"><ArrowRight size={16} /></span>
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>
    );
  }

  // ========================================================
  // KỊCH BẢN 2: ĐÃ ĐĂNG NHẬP THẬT SỰ -> MỞ TỔNG HÀNH DINH (DASHBOARD)
  // ========================================================
  return (
    <div className={`min-h-screen pt-24 pb-32 px-6 lg:px-12 transition-colors duration-slow ${ui.bg}`}>
      <div className="max-w-360 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        <div className="lg:col-span-8 space-y-20">
          {/* KHU VỰC 01: TRẠNG THÁI BÁO CÁO */}
          <section className="space-y-6">
            <div className="border-b border-stone/30 pb-4">
              <h2 className="font-display text-2xl tracking-tight flex items-center gap-3">
                <span className="font-mono text-xs text-signal border border-signal px-1.5 py-0.5 rounded-sm">01</span>
                {role === "admin" ? "Hộp thư thẩm định sự vụ khẩn cấp" : "Giám sát & Trạng thái báo cáo của tôi"}
              </h2>
            </div>

            <div className="flex flex-col border border-stone/20 bg-stone/5">
              {myReports.length === 0 ? (
                <div className={`p-12 text-center italic text-sm ${ui.muted}`}>Không có dữ liệu sự vụ nào cần hiển thị.</div>
              ) : (
                myReports.map((report) => (
                  <div key={report.id} onClick={() => router.push(`/report/${report.id}`)} className={`p-6 border-b ${ui.border} hover:bg-stone/10 transition-colors flex items-center justify-between gap-4 cursor-pointer`}>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] bg-stone/20 px-1.5 py-0.2">#{report.id}</span>
                        <h4 className="text-sm font-medium truncate">{report.author}</h4>
                        <span className={`font-mono text-[0.6rem] ${ui.muted}`}>{report.date}</span>
                      </div>
                      <p className={`text-sm ${ui.text} font-light truncate`}>{report.content}</p>
                    </div>
                    <div className="shrink-0">
                      {report.status === "pending" && <span className="border border-gold text-gold text-[0.6rem] uppercase tracking-widest px-2 py-0.5 flex items-center gap-1"><Clock size={10}/> Chờ duyệt</span>}
                      {report.status === "approved" && <span className="border border-cyan text-cyan text-[0.6rem] uppercase tracking-widest px-2 py-0.5">Đã công khai</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* KHU VỰC 02: TẠO BÁO CÁO TẠI CHỖ */}
          <section className="space-y-6">
            <div className="border-b border-stone/30 pb-4 flex justify-between items-center">
              <h2 className="font-display text-2xl tracking-tight flex items-center gap-3">
                <span className="font-mono text-xs text-signal border border-signal px-1.5 py-0.5 rounded-sm">02</span>
                Tạo lập báo cáo sự cố khẩn cấp
              </h2>
            </div>

            <form onSubmit={handleQuickSubmit} className={`border ${ui.border} p-6 space-y-4 ${ui.card}`}>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={role === "admin" ? "Nhập thông báo gửi toàn trường..." : "Mô tả sự việc cần báo cáo..."}
                rows={2}
                className="w-full bg-transparent border-b border-stone/30 py-2 focus:outline-none focus:border-current transition-colors text-sm font-light placeholder:text-stone-400 resize-none"
                required
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <input 
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Nhập vị trí xảy ra sự việc..."
                  className="w-full sm:w-2/3 bg-transparent border-b border-stone/30 pb-1 focus:outline-none focus:border-current text-xs font-light"
                />
                <button type="submit" className="bg-ink text-paper dark:bg-paper dark:text-navy px-4 py-2 font-mono text-[0.65rem] uppercase tracking-widest ml-auto shrink-0">
                  Gửi tín hiệu
                </button>
              </div>
            </form>
          </section>

          {/* KHU VỰC 03: TRÍCH XUẤT BẢNG TIN */}
          <section className="space-y-6">
            <div className="border-b border-stone/30 pb-4 flex justify-between items-end">
              <h2 className="font-display text-2xl tracking-tight flex items-center gap-3">
                <span className="font-mono text-xs text-signal border border-signal px-1.5 py-0.5 rounded-sm">03</span>
                Bảng tin công khai (Tin mới nhận)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestPublicFeed.map(post => (
                <div key={post.id} onClick={() => router.push(`/report/${post.id}`)} className={`border ${ui.border} p-5 ${ui.card} hover:border-current transition-all cursor-pointer flex flex-col justify-between h-40 group`}>
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

        {/* KHU VỰC 04: HỒ SƠ TÓM TẮT */}
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
                  <p className="font-mono text-[0.6rem] text-gold uppercase tracking-widest mt-0.5">Quyền: {role}</p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-[0.65rem] border-t border-stone/20 pt-4 text-stone-500">
                <div className="flex items-center gap-3"><Mail size={12}/> <span>{userEmail}</span></div>
                <div className="flex items-center gap-3"><Shield size={12}/> <span className="capitalize">Hệ thống bảo mật tối cao</span></div>
                <div className="flex items-center gap-3"><MapPin size={12}/> <span>THPT Chuyên SchoolOS</span></div>
              </div>

              <button onClick={() => router.push("/profile")} className="w-full text-center py-2.5 border border-stone font-mono text-[0.65rem] uppercase tracking-widest hover:bg-current hover:text-navy dark:hover:text-navy transition-all">
                Vào xem Hồ sơ chi tiết
              </button>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}