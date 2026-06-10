"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, Settings, LogOut, Shield, 
  ArrowRight, Mail, MapPin, Bell
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore } from "@/store/useCommunityStore";
import Reveal from "../../components/motion/Reveal";
import toast from "react-hot-toast";

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
}

export default function ProfilePage() {
  const router = useRouter();
  const { userEmail, role, logout } = useAuthStore();
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

  // ADAPTIVE THEME: Tự động đảo màu theo role
  const isDark = role !== "student";
  const ui = {
    text: isDark ? "text-paper" : "text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
    card: isDark ? "bg-white/5" : "bg-stone/5",
    hover: isDark ? "hover:bg-white/10" : "hover:bg-stone/10",
  };

  // 🛠 *XỬ LÝ LUỒNG HOẠT ĐỘNG THẬT 100%*
  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");
  const allPosts = (items || []).filter(i => i.type === "feed");
  
  // Lọc hoạt động: Nếu là admin thì xem các tin vừa xử lý, nếu là học sinh thì xem tin mình đã gửi
  const myActivities = allPosts.filter(item => {
    if (role === "admin") {
      const currentStatus = statusMap[item.id] || item.status || "pending";
      return currentStatus !== "pending"; // Đã duyệt hoặc đã từ chối
    }
    return item.author === currentUserName;
  }).reverse().slice(0, 2); // Lấy 2 hoạt động mới nhất

  // 🛠️ VÁ LỖI ĐĂNG XUẤT TỐI THƯỢNG: Dọn rác có chọn lọc để giữ lại kho bài viết
  const handleLogout = () => {
    localStorage.removeItem("schoolos_session_active");
    localStorage.removeItem("auth-storage");
    localStorage.removeItem("schoolos-auth");
    localStorage.removeItem("schoolos_auth_store");
    
    sessionStorage.clear();

    try {
      logout();
    } catch (e) {
      /* ignore */
    }

    window.location.href = "/";
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen pb-32 transition-colors duration-slow ${isDark ? 'bg-navy' : 'bg-paper'}`}>
      
      {/* HEADER: PHÂN CẤP TYPOGRAPHY MẠNH */}
      <header className={`border-b ${ui.border} pt-24 pb-20 px-6 lg:px-12`}>
        <div className="max-w-360 mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-12">
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <Reveal>
              <div className={`w-32 h-32 rounded-full border ${ui.border} flex items-center justify-center font-display text-5xl ${ui.text} uppercase`}>
                {currentUserName.charAt(0)}
              </div>
            </Reveal>
            
            <div className="space-y-2">
              <Reveal delay={0.1}>
                <p className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase`}>
                  {role === "admin" ? "Hồ sơ Chỉ huy" : "Hồ sơ Học sinh"}
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <h1 className={`font-display text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-tight ${ui.text}`}>
                  {currentUserName.split('@')[0]}
                </h1>
              </Reveal>
            </div>
          </div>

          <Reveal delay={0.3}>
            <button 
              onClick={handleLogout}
              className={`flex items-center gap-3 px-6 py-3 border ${ui.border} ${ui.muted} hover:text-signal hover:border-signal transition-all duration-fast font-mono text-[0.6875rem] tracking-[0.18em] uppercase`}
            >
              <LogOut size={16} /> Đăng xuất hệ thống
            </button>
          </Reveal>
        </div>
      </header>

      {/* MAIN CONTENT: GRID 12 CỘT BẤT ĐỐI XỨNG */}
      <main className="max-w-360 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 px-6 lg:px-12 pt-20">
        
        {/* CỘT TRÁI (COL 4): THÔNG TIN VÀ THỐNG KÊ NHANH */}
        <div className="lg:col-span-4 space-y-16">
          
          <Reveal delay={0.4}>
            <section className="space-y-8">
              <h2 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase border-b ${ui.border} pb-4`}>
                Thông tin định danh
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Mail size={18} className="text-stone" />
                  <span className={`${ui.text}`}>{userEmail || "N/A"}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Shield size={18} className="text-stone" />
                  <span className={`${ui.text}`}>{role === "admin" ? "Quyền Quản trị viên" : "Quyền Thành viên"}</span>
                </div>
                <div className="flex items-center gap-4">
                  <MapPin size={18} className="text-stone" />
                  <span className={`${ui.text}`}>Trường THPT Chuyên SchoolOS</span>
                </div>
              </div>
            </section>
          </Reveal>

          <Reveal delay={0.5}>
            <section className="space-y-8">
              <h2 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase border-b ${ui.border} pb-4`}>
                Chỉ số tác động
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className={`${ui.card} p-6 border ${ui.border}`}>
                  <p className={`text-2xl font-display ${ui.text} mb-1`}>{role === "admin" ? "124" : "12"}</p>
                  <p className={`text-[0.6rem] font-mono uppercase tracking-widest ${ui.muted}`}>
                    {role === "admin" ? "Sự vụ đã xử lý" : "Tín hiệu đã gửi"}
                  </p>
                </div>
                <div className={`${ui.card} p-6 border ${ui.border}`}>
                  <p className={`text-2xl font-display ${ui.text} mb-1`}>{role === "admin" ? "15m" : "850"}</p>
                  <p className={`text-[0.6rem] font-mono uppercase tracking-widest ${ui.muted}`}>
                    {role === "admin" ? "Phản hồi TB" : "Điểm cộng đồng"}
                  </p>
                </div>
              </div>
            </section>
          </Reveal>
        </div>

        {/* CỘT PHẢI (COL 7): CÀI ĐẶT & HOẠT ĐỘNG GẦN ĐÂY */}
        <div className="lg:col-span-7 lg:col-start-6 space-y-20">
          
          <Reveal delay={0.6}>
            <section className="space-y-8">
              <h2 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase border-b ${ui.border} pb-4`}>
                Cài đặt không gian
              </h2>
              <div className="flex flex-col">
                {[
                  { label: "Thông báo & Tín hiệu", icon: Bell, desc: "Quản lý cách hệ thống gửi thông báo cho bạn" },
                  { label: "Bảo mật & Quyền riêng tư", icon: Shield, desc: "Cập nhật mật khẩu và quản lý danh tính ẩn danh" },
                  { label: "Tùy chỉnh giao diện", icon: Settings, desc: "Thay đổi phông chữ và độ tương phản" }
                ].map((item, i) => (
                  <button 
                    key={i} 
                    className={`flex items-center justify-between py-8 border-b ${ui.border} group transition-all`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-full border ${ui.border} flex items-center justify-center ${ui.muted} group-hover:text-ink group-hover:bg-paper transition-all`}>
                        <item.icon size={20} strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                        <h4 className={`font-medium ${ui.text} mb-1`}>{item.label}</h4>
                        <p className={`text-sm font-light ${ui.muted}`}>{item.desc}</p>
                      </div>
                    </div>
                    <ArrowRight size={20} className={`${ui.muted} group-hover:translate-x-2 transition-transform`} />
                  </button>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal delay={0.7}>
            <section className="space-y-8">
              <h2 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase border-b ${ui.border} pb-4`}>
                Hoạt động mới nhất
              </h2>
              <div className="space-y-6">
                {myActivities.length === 0 ? (
                  <div className={`font-mono text-xs italic ${ui.muted} py-4 px-2`}>
                    Chưa ghi nhận hoạt động nào gần đây.
                  </div>
                ) : (
                  myActivities.map((log) => {
                    const currentStatus = statusMap[log.id] || log.status || "pending";
                    return (
                      <div key={log.id} className="flex gap-6">
                        <div className="w-1 bg-stone shrink-0"></div>
                        <div>
                          <p className={`text-sm ${ui.text} font-light leading-relaxed`}>
                            {role === "admin" 
                              ? `Bạn đã quyết định xử lý hồ sơ CASE-${log.id} thành [${currentStatus.toUpperCase()}].`
                              : `Tín hiệu sự vụ [${log.content.substring(0, 20)}...] của bạn hiện đang ở trạng thái [${currentStatus.toUpperCase()}].`}
                          </p>
                          <p className={`font-mono text-[0.6rem] uppercase tracking-widest ${ui.muted} mt-2`}>
                            {log.date}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </Reveal>

        </div>

      </main>
    </div>
  );
}