"use client";

import { useState, useEffect, useMemo } from "react"; 
import { usePathname, useRouter } from "next/navigation"; // 🛠️ Bổ sung useRouter
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore } from "@/store/useCommunityStore";
import { 
  Inbox, LayoutDashboard, 
  Megaphone, BarChart2,
  Bell, CheckCircle2, ShieldAlert,
  Menu, X 
} from "lucide-react";

interface CommunityItem {
  id: number;
  type: string;
  title?: string;
  content: string;
  author: string;
  date: string; 
  status?: "pending" | "approved" | "rejected";
}

interface CommunityStoreMethods {
  items: CommunityItem[];
}

interface NotificationItem {
  id: number;
  title: string;
  time: string;
  unread: boolean;
  type: "alert" | "success" | "info";
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter(); // 🛠️ Khởi tạo router điều hướng
  const { role, userEmail } = useAuthStore();
  
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  
  const items = useMemo(() => store?.items || [], [store?.items]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [isSessionActive, setIsSessionActive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("schoolos_session_active") === "true";
    }
    return false;
  });

  const [mounted, setMounted] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [readIds, setReadIds] = useState<number[]>([]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel("schoolos_realtime_bridge");
    
    channel.onmessage = (event) => {
      if (event.data && event.data.type === "SYNC_COMMUNITY_ITEMS") {
        const incomingItems = event.data.items;
        const currentItems = (useCommunityStore.getState() as unknown as CommunityStoreMethods).items || [];
        if (currentItems.length !== incomingItems.length) {
          useCommunityStore.setState({ items: incomingItems });
        }
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !items.length) return;
    const channel = new BroadcastChannel("schoolos_realtime_bridge");
    channel.postMessage({ type: "SYNC_COMMUNITY_ITEMS", items });
    channel.close();
  }, [items]);

  useEffect(() => {
    const syncDataAndStates = () => {
      setIsMobileMenuOpen(false);

      const currentSession = sessionStorage.getItem("schoolos_session_active") === "true";
      if (currentSession !== isSessionActive) {
        setIsSessionActive(currentSession);
      }
      
      const savedMap = localStorage.getItem("schoolos_feed_status_map");
      if (savedMap) {
        try { setStatusMap(JSON.parse(savedMap) || {}); } catch {}
      }

      const savedRead = localStorage.getItem("schoolos_read_notifs");
      if (savedRead) {
        try { 
          const parsed = JSON.parse(savedRead);
          if (Array.isArray(parsed)) setReadIds(parsed);
        } catch {}
      }

      setMounted(true);
    };

    const timer = setTimeout(syncDataAndStates, 0);
    return () => clearTimeout(timer);
  }, [pathname, userEmail, isSessionActive, items]); 

  if (!mounted) return null;

  const isLoggedIn = !!userEmail && isSessionActive;
  if (!isLoggedIn) return null;

  const isDark = role === "admin";
  
  const ui = {
    bg: isDark ? "bg-navy" : "bg-paper",
    text: isDark ? "text-paper" : "text-ink",
    muted: isDark ? "text-paper/60" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone/50",
    hover: isDark ? "hover:text-cyan" : "hover:text-ink",
    active: isDark ? "text-signal border-signal" : "text-ink border-ink",
    panel: isDark ? "bg-navy border-white/20" : "bg-paper border-stone",
  };

  const navLinks = [
    { href: "/", label: "Màn hình chính", icon: LayoutDashboard, show: true },
    { href: "/feed", label: "Bảng tin", icon: Megaphone, show: true },
    { href: "/polls", label: "Khảo sát", icon: BarChart2, show: true },
    { href: "/report/new", label: "Gửi Tín Hiệu", icon: Inbox, show: role !== "admin" },
    { href: "/mailbox", label: "Hòm Thư", icon: Inbox, show: role === "admin" },
    { href: "/audit", label: "Chỉ Huy", icon: LayoutDashboard, show: role === "admin" },
  ];

  const dynamicNotifications: NotificationItem[] = (Array.isArray(items) ? items : [])
    .filter((i: CommunityItem) => i && i.type === "mailbox")
    .filter((i: CommunityItem) => {
      const status = statusMap[i?.id] || "pending";
      if (role === "admin") return status === "pending";
      return (i?.author || "") === userEmail && status !== "pending";
    })
    .map((i: CommunityItem, index: number): NotificationItem => {
      const status = statusMap[i?.id] || "pending";
      const isRead = Array.isArray(readIds) && readIds.includes(i?.id);
      
      let title = "";
      let type: "alert" | "success" | "info" = "info";
      
      if (role === "admin") {
        title = `Sự vụ mới: ${i?.title || "Cần xử lý"}`;
        type = "alert";
      } else {
        title = `Báo cáo của bạn đã được ${status === "approved" ? "giải quyết" : "lưu trữ"}`;
        type = status === "approved" ? "success" : "info";
      }

      const rawDate = String(i?.date || "");
      const timeString = rawDate.includes(' ') ? rawDate.split(' ')[1] : "Gần đây";

      return {
        id: i?.id || (index * 999), 
        title,
        time: timeString,
        unread: !isRead,
        type
      };
    })
    .slice(0, 5);

  const unreadCount = Array.isArray(dynamicNotifications) 
    ? dynamicNotifications.filter((n: NotificationItem) => n.unread).length 
    : 0;

  const handleMarkAllAsRead = () => {
    if (!Array.isArray(dynamicNotifications)) return;
    const allNotifIds = dynamicNotifications.map((n: NotificationItem) => n.id);
    const newReadIds = Array.from(new Set([...readIds, ...allNotifIds]));
    setReadIds(newReadIds);
    localStorage.setItem("schoolos_read_notifs", JSON.stringify(newReadIds));
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${ui.border} ${ui.bg} bg-opacity-95 transition-colors duration-slow px-6 lg:px-12`}>
      <div className="max-w-360 mx-auto h-16 flex items-center justify-between relative">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 group">
          <span className={`font-display text-xl tracking-tight ${ui.text} group-hover:text-signal transition-colors`}>
            School<span className="italic font-light">OS</span>
          </span>
          {role === "admin" && (
            <span className="border border-signal text-signal text-[0.6rem] uppercase tracking-widest px-1.5 py-0.5 font-mono animate-pulse">
              HQ CORE
            </span>
          )}
        </Link>

        {/* MENU DESKTOP */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          {navLinks.filter(l => l.show).map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href}
                className={`h-full flex items-center border-b-2 text-xs font-mono tracking-widest uppercase transition-all ${
                  isActive ? ui.active : `border-transparent ${ui.muted} ${ui.hover}`
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* KHU VỰC ĐIỀU KHIỂN PHẢI */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 transition-colors ${showNotifications ? ui.text : ui.muted} hover:text-signal`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-signal rounded-full animate-pulse border border-current shadow-sm"></span>
                )}
              </button>

              {showNotifications && (
                <div className={`absolute top-full right-0 mt-4 w-80 border ${ui.panel} shadow-2xl flex flex-col animate-in slide-in-from-top-2 duration-fast`}>
                  <div className="p-4 border-b border-current/10 flex justify-between items-center bg-current/5">
                    <span className="font-mono text-xs uppercase tracking-widest">Trung tâm tín hiệu</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-signal font-mono uppercase tracking-widest hover:underline"
                      >
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {dynamicNotifications.length === 0 ? (
                      <div className={`p-8 text-center text-xs font-mono italic ${ui.muted}`}>
                        Hệ thống không ghi nhận tín hiệu mới.
                      </div>
                    ) : (
                      dynamicNotifications.map(notif => (
                        <div 
                          key={notif.id} 
                          // 🛠️ KÍCH HOẠT CỔNG DỊCH CHUYỂN BẰNG CLICK: Bay thẳng vào trang chi tiết
                          onClick={() => {
                            router.push(`/report/${notif.id}`);
                            setShowNotifications(false);
                          }}
                          className={`p-4 border-b border-current/10 hover:bg-current/10 transition-colors cursor-pointer flex gap-4 ${notif.unread ? "bg-current/5" : ""}`}
                        >
                          <div className="shrink-0 mt-1">
                            {notif.type === "alert" ? <ShieldAlert size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-green-500" />}
                          </div>
                          <div>
                            <p className={`text-sm ${notif.unread ? "font-medium" : "font-light"} ${ui.text}`}>{notif.title}</p>
                            <p className={`text-[10px] font-mono mt-1 ${ui.muted}`}>{notif.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <p className={`text-[0.65rem] font-mono ${ui.muted} truncate max-w-[150px]`}>
                {userEmail?.split('@')[0] || "User"}
              </p>
              <Link href="/profile" className={`w-8 h-8 rounded-full border ${ui.border} flex items-center justify-center font-display text-sm ${ui.text} uppercase hover:border-signal transition-colors`}>
                {(userEmail || "U").charAt(0)}
              </Link>
            </div>
          </div>

          {/* ICON MENU MOBILE */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 transition-colors ${showNotifications ? ui.text : ui.muted}`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-signal rounded-full animate-pulse border border-current shadow-sm"></span>
              )}
            </button>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className={`p-2 transition-colors ${isMobileMenuOpen ? ui.text : ui.muted}`}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>

      </div>

      {/* DROPDOWN NOTIFICATIONS MOBILE */}
      {showNotifications && (
        <div className={`md:hidden absolute top-full left-0 right-0 border-b ${ui.border} ${ui.bg} shadow-xl flex flex-col animate-in slide-in-from-top-2 duration-fast`}>
          <div className="p-4 border-b border-current/10 flex justify-between items-center bg-current/5">
            <span className="font-mono text-xs uppercase tracking-widest">Tín hiệu mới</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-[10px] text-signal font-mono uppercase tracking-widest">Đã đọc tất cả</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {dynamicNotifications.length === 0 ? (
              <div className={`p-6 text-center text-xs font-mono italic ${ui.muted}`}>Trống.</div>
            ) : (
              dynamicNotifications.map(notif => (
                <div 
                  key={notif.id} 
                  // 🛠️ KÍCH HOẠT DỊCH CHUYỂN TRÊN MOBILE CHUẨN UX
                  onClick={() => {
                    router.push(`/report/${notif.id}`);
                    setShowNotifications(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-4 border-b border-current/10 cursor-pointer hover:bg-current/10 transition-colors flex gap-4 ${notif.unread ? "bg-current/5" : ""}`}
                >
                  <div className="shrink-0 mt-1">
                    {notif.type === "alert" ? <ShieldAlert size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-green-500" />}
                  </div>
                  <div>
                    <p className={`text-sm ${notif.unread ? "font-medium" : "font-light"} ${ui.text}`}>{notif.title}</p>
                    <p className={`text-[10px] font-mono mt-1 ${ui.muted}`}>{notif.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* OVERLAY NAVIGATION MOBILE */}
      {isMobileMenuOpen && (
        <div className={`md:hidden absolute top-full left-0 right-0 h-[calc(100vh-4rem)] border-b ${ui.border} ${ui.bg} flex flex-col p-6 animate-in slide-in-from-top-2 duration-fast overflow-y-auto`}>
          <nav className="flex flex-col gap-2 mt-4">
            {navLinks.filter(l => l.show).map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-4 p-4 text-sm font-mono tracking-widest uppercase transition-all border border-transparent ${
                    isActive ? `bg-current/5 border-current/10 ${ui.text}` : `${ui.muted} hover:bg-current/5`
                  }`}
                >
                  <link.icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="mt-auto border-t border-current/10 pt-6 mb-8 flex items-center gap-4">
            <Link href="/profile" className={`w-12 h-12 rounded-full border ${ui.border} flex items-center justify-center font-display text-xl ${ui.text} uppercase`}>
              {(userEmail || "U").charAt(0)}
            </Link>
            <div>
              <p className={`text-base font-medium ${ui.text} truncate max-w-[200px]`}>
                {userEmail?.split('@')[0] || "User"}
              </p>
              <p className={`text-[10px] font-mono mt-1 ${ui.muted} uppercase tracking-widest`}>
                {role === "admin" ? "Ban Giám Hiệu" : "Thành viên"}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}