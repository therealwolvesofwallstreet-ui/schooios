"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore } from "@/store/useCommunityStore";
import { 
  Clock, PlusCircle, Megaphone, User, CheckCircle2, XCircle,
  ArrowRight, Mail, Shield, MapPin 
} from "lucide-react";
import toast from "react-hot-toast";
import Reveal from "@/components/motion/Reveal";

interface CommunityItem {
  id: number;
  type: "feed" | "mailbox" | "poll";
  content: string;
  title?: string;
  author: string;
  date: string;
  category?: string;
  status?: "pending" | "approved" | "rejected";
}

interface CommunityStoreMethods {
  items: CommunityItem[];
}

export default function RootHomepage() {
  const router = useRouter();
  
  const { login, userEmail, role } = useAuthStore();
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items } = store;

  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");
  const isDark = role === "admin";
  
  // 🛠️ VÁ LỖI ĐA TÁP - BƯỚC 1: Khởi tạo trạng thái phiên bằng sessionStorage
  const [isSessionActive, setIsSessionActive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("schoolos_session_active") === "true";
    }
    return false;
  });

  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<"student" | "admin">("student");
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [mounted, setMounted] = useState(false);

  // 🛠️ VÁ LỖI ĐA TÁP - BƯỚC 2: Kiểm tra đồng bộ phiên bằng sessionStorage khi mount component
  useEffect(() => {
    const saved = localStorage.getItem("schoolos_feed_status_map");
    const session = sessionStorage.getItem("schoolos_session_active") === "true";
    
    const timer = setTimeout(() => {
      setIsSessionActive(session);
      if (saved) {
        try { setStatusMap(JSON.parse(saved)); } catch { /* ignore */ }
      }
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const ui = {
    bg: isDark ? "bg-navy text-paper" : "bg-paper text-ink",
    text: isDark ? "text-paper" : "text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
    card: isDark ? "bg-white/5" : "bg-stone/5",
  };

  const isUserLoggedIn = !!userEmail && isSessionActive;

  if (!mounted) return null;

  // 🛠️ VÁ LỖI ĐA TÁP - BƯỚC 3: Ghi nhận trạng thái mở khóa không gian vào sessionStorage để tách biệt 2 táp
  const handleResultLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    
    sessionStorage.setItem("schoolos_session_active", "true");
    setIsSessionActive(true);

    (login as (email: string, role: string) => void)(emailInput, selectedRole);
    toast.success("Đã mở khóa không gian vận hành.");
  };

  const allItems = items || [];
  
  const myReports = allItems
    .filter(i => i.type === "mailbox")
    .map(item => {
      const localStatus = statusMap[item.id];
      return { ...item, status: localStatus || "pending" };
    })
    .filter(item => {
      if (role === "admin") return item.status === "pending";
      return item.author === currentUserName;
    })
    .reverse();

  const latestPublicFeed = allItems
    .filter(i => i.type === "feed" && (i.status || "approved") === "approved")
    .reverse()
    .slice(0, 2);

  // ========================================================
  // KỊCH BẢN 1: CHƯA ĐĂNG NHẬP
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
          <Reveal delay={0.4}><p className="hidden lg:block font-mono text-[0.65rem] tracking-wildest text-muted uppercase">© 2026 • THPT CHUYÊN KHOS</p></Reveal>
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
  // KỊCH BẢN 2: DASHBOARD ĐÃ ĐĂNG NHẬP
  // ========================================================
  return (
    <div className={`min-h-screen pt-24 pb-32 px-6 lg:px-12 transition-colors duration-slow ${ui.bg}`}>
      <div className="max-w-360 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        <div className="lg:col-span-8 space-y-20">
          
          {/* KHU VỰC 01: TRẠNG THÁI BÁO CÁO */}
          <section className="space-y-6">
            <div className={`border-b ${ui.border} pb-4 flex items-center justify-between gap-4`}>
              <h2 className="font-display text-lg sm:text-2xl tracking-tight flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="font-mono text-[10px] sm:text-xs text-signal border border-signal px-1.5 py-0.5 rounded-sm shrink-0">01</span>
                <span className="truncate">{role === "admin" ? "Hàng đợi điều phối sự vụ" : "Giám sát tiến độ sự vụ"}</span>
              </h2>
              
              {role !== "admin" && (
                <button 
                  onClick={() => router.push("/report/new")}
                  className="flex items-center gap-1.5 bg-ink text-paper dark:bg-paper dark:text-navy px-3 py-2 sm:px-4 sm:py-2 font-mono text-[0.6rem] sm:text-[0.65rem] uppercase tracking-widest hover:opacity-90 transition-opacity shrink-0 rounded-sm"
                >
                  <PlusCircle size={12} className="sm:size-3.5" /> 
                  <span>Gửi tín hiệu <span className="hidden xs:inline sm:inline">mật</span></span>
                </button>
              )}
            </div>

            <div className={`flex flex-col border ${ui.border} rounded-sm overflow-hidden ${ui.card}`}>
              {myReports.length === 0 ? (
                <div className={`p-12 text-center italic text-sm ${ui.muted}`}>Hệ thống chưa ghi nhận đơn hàng sự vụ riêng tư nào.</div>
              ) : (
                myReports.map((report) => (
                  <div 
                    key={report.id} 
                    onClick={() => router.push(`/report/${report.id}`)}
                    className={`p-6 border-b ${ui.border} hover:bg-stone/10 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-4 cursor-pointer group`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`font-mono text-[10px] px-1.5 py-0.2 ${isDark ? "bg-white/10" : "bg-stone/20"}`}>#{report.id}</span>
                        <h4 className="text-sm font-medium truncate">{role === "admin" ? report.author : "Tôi"}</h4>
                        <span className={`font-mono text-[0.6rem] ${ui.muted}`}><Clock size={10} className="inline mr-0.5" />{report.date}</span>
                      </div>
                      <h5 className="text-sm font-medium mt-1 truncate group-hover:text-signal transition-colors">{report.title || "Báo cáo khẩn"}</h5>
                      <p className={`text-xs ${ui.muted} font-light line-clamp-2 mt-0.5`}>&ldquo;{report.content}&rdquo;</p>
                    </div>
                    
                    <div className="shrink-0">
                      {report.status === "pending" && (
                        <span className="border border-amber-500 text-amber-500 text-[0.6rem] uppercase tracking-widest px-2 py-1 flex items-center gap-1 bg-amber-500/5">
                          <Clock size={10} className="animate-pulse" /> Đang xử lý
                        </span>
                      )}
                      {report.status === "approved" && (
                        <span className="border border-green-600 text-green-600 text-[0.6rem] uppercase tracking-widest px-2 py-1 flex items-center gap-1 bg-green-500/5">
                          <CheckCircle2 size={10} /> Đã giải quyết
                        </span>
                      )}
                      {report.status === "rejected" && (
                        <span className="border border-red-500 text-red-500 text-[0.6rem] uppercase tracking-widest px-2 py-1 flex items-center gap-1 bg-red-500/5">
                          <XCircle size={10} /> Đã lưu trữ
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* KHU VỰC 02: BẢNG TIN TRƯỜNG */}
          <section className="space-y-6">
            <div className={`border-b ${ui.border} pb-4 flex justify-between items-end`}>
              <h2 className="font-display text-lg sm:text-2xl tracking-tight flex items-center gap-3">
                <span className="font-mono text-xs text-signal border border-signal px-1.5 py-0.5 rounded-sm">02</span>
                Cập nhật chung (Bảng tin)
              </h2>
              <button onClick={() => router.push("/feed")} className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-current transition-colors">Xem tất cả →</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestPublicFeed.length === 0 ? (
                <div className={`col-span-2 py-10 text-center italic text-sm ${ui.muted}`}>Không có bài đăng công khai nào gần đây.</div>
              ) : (
                latestPublicFeed.map(post => (
                  <div key={post.id} onClick={() => router.push("/feed")} className={`border ${ui.border} p-5 ${ui.card} hover:border-current transition-all cursor-pointer flex flex-col justify-between h-40 group`}>
                    <p className="text-sm font-light leading-relaxed line-clamp-3">&ldquo;{post.content}&rdquo;</p>
                    <div className={`flex items-center justify-between border-t ${ui.border} pt-3 mt-4`}>
                      <span className={`text-[10px] font-mono ${ui.muted}`}>Tác giả: Ẩn danh</span>
                      <ArrowRight size={14} className={`${ui.muted} group-hover:translate-x-1 group-hover:text-signal transition-all`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* KHU VỰC 03: HỒ SƠ TÓM TẮT */}
        <div className="lg:col-span-4">
          <section className="space-y-6 lg:sticky top-24">
            <div className={`border-b ${ui.border} pb-4`}>
              <h2 className="font-display text-lg tracking-tight flex items-center gap-3">
                <span className="font-mono text-[10px] text-signal border border-signal px-1 py-0.2 rounded-sm">03</span>
                Hồ sơ tài khoản
              </h2>
            </div>

            <div className={`border ${ui.border} p-6 space-y-6 ${ui.card}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full border ${ui.border} flex items-center justify-center font-display text-lg uppercase`}>
                  {currentUserName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display text-base leading-tight truncate max-w-40">{currentUserName.split('@')[0]}</h3>
                  <p className="font-mono block text-gold uppercase tracking-widest mt-0.5 text-[9px]">Quyền: {role === "admin" ? "Ban Giám Hiệu" : "Thành viên"}</p>
                </div>
              </div>

              <div className={`space-y-3 font-mono text-[0.65rem] border-t ${ui.border} pt-4 ${ui.muted}`}>
                <div className="flex items-center gap-3"><Mail size={12}/> <span className="truncate max-w-50">{userEmail || "N/A"}</span></div>
                <div className="flex items-center gap-3"><Shield size={12}/> <span>Cơ chế bảo mật đầu-cuối 1-1</span></div>
                <div className="flex items-center gap-3"><MapPin size={12}/> <span>THPT Chuyên SchoolOS</span></div>
              </div>

              <button onClick={() => router.push("/profile")} className={`w-full text-center py-2.5 border ${ui.border} font-mono text-[0.65rem] uppercase tracking-widest hover:bg-current hover:text-paper dark:hover:text-navy transition-all`}>
                Vào xem Hồ sơ chi tiết
              </button>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}