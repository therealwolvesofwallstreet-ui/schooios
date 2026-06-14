// Điều hướng theo ROLE (luật §4.4: mục không được phép = KHÔNG render).
// Route /report, /queue, /emergency, /audit, /notifications là trang F2+ (chưa dựng ở F1) —
// link đã đặt sẵn để khoá CẤU TRÚC điều hướng; nội dung trang thuộc phase sau.
import {
  House,
  Files,
  Megaphone,
  Bell,
  ListChecks,
  Siren,
  ClipboardText,
  ChartBar,
  Stack,
  Briefcase,
  Newspaper,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type { Role } from "@/lib/api-types";

// Tách khỏi kiểu nội bộ của phosphor (bền với version): chỉ cần các prop ta dùng.
export type IconComponent = ComponentType<{
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  STUDENT: [
    { label: "Trang chủ", href: "/", icon: House },
    { label: "Bảng tin", href: "/feed", icon: Newspaper },
    { label: "Báo cáo của tôi", href: "/report", icon: Files },
    { label: "Báo cáo", href: "/report/new", icon: Megaphone },
    { label: "Thông báo", href: "/notifications", icon: Bell },
  ],
  STAFF: [
    { label: "Tổng quan", href: "/", icon: ChartBar },
    { label: "Bảng tin", href: "/feed", icon: Newspaper },
    { label: "Công việc", href: "/desk", icon: Briefcase },
    { label: "Hàng chờ", href: "/queue", icon: ListChecks },
    { label: "Khẩn cấp", href: "/emergency", icon: Siren },
    { label: "Thông báo", href: "/notifications", icon: Bell },
  ],
  ADMIN: [
    { label: "Tổng quan", href: "/", icon: ChartBar },
    { label: "Bảng tin", href: "/feed", icon: Newspaper },
    { label: "Tất cả vụ việc", href: "/cases", icon: Stack },
    { label: "Hàng chờ", href: "/queue", icon: ListChecks },
    { label: "Khẩn cấp", href: "/emergency", icon: Siren },
    { label: "Nhật ký", href: "/audit", icon: ClipboardText },
    { label: "Thông báo", href: "/notifications", icon: Bell },
  ],
  AUDITOR: [
    { label: "Tổng quan", href: "/", icon: ChartBar },
    { label: "Bảng tin", href: "/feed", icon: Newspaper },
    { label: "Tất cả vụ việc", href: "/cases", icon: Stack },
    { label: "Nhật ký", href: "/audit", icon: ClipboardText },
  ],
};
