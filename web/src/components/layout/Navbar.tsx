"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Menu, X, Inbox, LayoutDashboard, User, PlusCircle, Megaphone } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, userEmail } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ép đồng bộ bất đồng bộ để tránh lỗi Hydration của Next.js
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!mounted) return null;

  // 🛠️ ADAPTIVE THEME: Tự động đảo màu theo thế giới Admin (Navy) hoặc Học sinh (Paper)
  const isDark = role === "admin";
  const ui = {
    bg: isDark ? "bg-navy/80" : "bg-paper/80",
    text: isDark ? "text-paper" : "text-ink",
    muted: isDark ? "text-paper/60" : "text-muted",
    border: isDark ? "border-white/10" : "border-stone/50",
    hover: isDark ? "hover:text-cyan" : "hover:text-ink",
    active: isDark ? "text-signal border-signal" : "text-ink border-ink",
  };

  // Định nghĩa luồng di chuyển dựa trên Quyền hạn (Role-based links)
  // 🛠️ CẬP NHẬT: Thay đổi tất cả đường dẫn của Màn hình chính từ "/dashboard" thành trang gốc "/"
  const navLinks = [
    { href: "/", label: "Màn hình chính", icon: LayoutDashboard, show: true },
    { href: "/feed", label: "Bảng tin", icon: Megaphone, show: true },
    { href: "/report/new", label: "Tạo Báo Cáo", icon: PlusCircle, show: role !== "admin" },
    { href: "/mailbox", label: "Hòm Thư", icon: Inbox, show: role === "admin" },
    { href: "/audit", label: "Chỉ Huy", icon: LayoutDashboard, show: role === "admin" },
    { href: "/profile", label: "Hồ sơ", icon: User, show: true },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${ui.border} ${ui.bg} transition-colors duration-slow px-6 lg:px-12`}>
      <div className="max-w-360 mx-auto h-16 flex items-center justify-between">
        
        {/* LOGO CHỦ ĐẠO */}
        {/* 🛠️ CẬP NHẬT: Sửa đường dẫn logo về trang gốc "/" để đồng bộ */}
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

        {/* MENU TRÊN MÁY TÍNH (DESKTOP NAV) */}
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

        {/* PROFILE CHIP NHANH */}
        <div className="hidden md:flex items-center gap-4">
          <p className={`text-[0.65rem] font-mono ${ui.muted} truncate max-w-[150px]`}>
            {userEmail || (role === "admin" ? "Admin" : "Học sinh")}
          </p>
          <Link href="/profile" className={`w-8 h-8 rounded-full border ${ui.border} flex items-center justify-center font-display text-sm ${ui.text} uppercase hover:border-signal transition-colors`}>
            {(userEmail || "U").charAt(0)}
          </Link>
        </div>

        {/* NÚT BẤM TRÊN ĐIỆN THOẠI (MOBILE TOGGLE) */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 transition-colors"
        >
          {isOpen ? <X size={20} className={ui.text} /> : <Menu size={20} className={ui.text} />}
        </button>
      </div>

      {/* OVERLAY KHI BẤM TRÊN MOBILE */}
      {isOpen && (
        <div className={`md:hidden absolute top-16 left-0 right-0 border-b ${ui.border} ${ui.bg} flex flex-col p-6 gap-4 animate-in slide-in-from-top duration-fast`}>
          {navLinks.filter(l => l.show).map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-4 py-3 text-sm font-mono tracking-wider uppercase ${
                  isActive ? "text-signal font-medium" : ui.text
                }`}
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}