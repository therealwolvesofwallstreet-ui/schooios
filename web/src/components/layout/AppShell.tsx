"use client";

import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, Bell, User, ShieldAlert, LogOut, HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";

// Cấu hình Toast dùng chung (react-hot-toast, React 19)
const premiumToastConfig = {
  duration: 4000,
  style: {
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: "600" as const,
    fontSize: "14px",
    borderRadius: "16px",
    padding: "16px 24px",
    border: "1px solid #e2e8f0",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
  },
  success: { iconTheme: { primary: "#10b981", secondary: "#ffffff" } },
  error: {
    style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
    iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
  },
};

const menuItems = [
  { name: "Tổng quan", icon: LayoutDashboard, path: "/" },
  { name: "Báo cáo", icon: FileText, path: "/report" },
  { name: "Thông báo", icon: Bell, path: "/notifications" },
  { name: "Tài khoản", icon: User, path: "/profile" },
];

// Trang tự render layout riêng (không vỏ app): proxy đảm bảo chỉ user phù hợp tới được.
const BARE_PAGES = new Set(["/login", "/change-password"]);

/**
 * AppShell — vỏ giao diện ứng dụng (sidebar PC + header/bottom-nav mobile + modal đăng xuất + Toaster).
 * Root layout (Server Component) giữ fonts/metadata/html/body; AppShell là client boundary.
 * Hydrate auth từ /api/auth/me khi mở app; gác trang thật do proxy.ts.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { userEmail, role, logout, hydrate } = useAuthStore();
  const { notifications } = useNotificationStore();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Mở app → đọc trạng thái đăng nhập 1 lần (root layout không remount khi điều hướng).
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const confirmLogoutAction = async () => {
    await logout();
    setShowLogoutConfirm(false);
    router.push("/login");
  };

  // /login + /change-password: render trần (full-screen của chính trang) + Toaster.
  if (BARE_PAGES.has(pathname)) {
    return (
      <>
        {children}
        <Toaster position="top-right" toastOptions={premiumToastConfig} />
      </>
    );
  }

  return (
    <div className="bg-slate-50 text-slate-800 font-sans flex h-screen w-screen overflow-hidden flex-col md:flex-row">
      {/* SIDEBAR PC */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">SchooIOS</h1>
              <span className="text-xs font-semibold text-blue-600 mt-1 block">
                {role && role !== "STUDENT" ? "Admin/Staff Portal" : "Student Portal"}
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-[14px] transition-all relative ${
                    isActive
                      ? "bg-blue-50 text-blue-600 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <item.icon size={18} />
                  <span className="flex-1">{item.name}</span>
                  {item.name === "Thông báo" && unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-sm shadow-red-200 animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          onClick={() => setShowLogoutConfirm(true)}
          className="p-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50 hover:bg-red-50/60 cursor-pointer m-4 rounded-xl transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
            {(userEmail || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-[13px] text-slate-800 group-hover:text-red-700 truncate">
              {userEmail || "Người dùng"}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium group-hover:text-red-400">Bấm để đăng xuất</p>
          </div>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-blue-600" size={24} />
          <span className="font-bold text-slate-900">SchooIOS</span>
        </div>
        <div
          onClick={() => setShowLogoutConfirm(true)}
          className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-xs cursor-pointer hover:bg-red-100 transition-colors"
        >
          {(userEmail || "?").charAt(0).toUpperCase()}
        </div>
      </header>

      {/* RUỘT TRANG */}
      <main className="flex-1 overflow-y-auto bg-slate-50 pb-24 md:pb-0">
        <div className="max-w-[1200px] w-full mx-auto p-4 md:p-8">{children}</div>
      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-50 shadow-lg">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-1 w-16 py-1 rounded-xl transition-all ${
                isActive ? "text-blue-600 font-bold" : "text-slate-400 font-medium"
              }`}
            >
              <div className="relative">
                <item.icon size={20} />
                {item.name === "Thông báo" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[999] p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="bg-orange-50 p-3 rounded-full text-orange-500 inline-block">
              <HelpCircle size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Xác nhận đăng xuất</h3>
              <p className="text-slate-500 text-sm">
                Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại không?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Không, ở lại
              </button>
              <button
                type="button"
                onClick={confirmLogoutAction}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <LogOut size={14} /> Có, Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÁY PHÓNG THÔNG BÁO */}
      <Toaster position="top-right" toastOptions={premiumToastConfig} />
    </div>
  );
}
