"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Lôi thêm quyền (role) ra để kiểm tra
  const { role } = useAuthStore();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // 1. Quét xem có đang cắm chìa khóa phiên làm việc không?
    // 🛠️ SỬA LỖI ĐA TÁP: Đổi thành sessionStorage để nhận diện đúng chìa khóa riêng của táp Admin
    const sessionActive = sessionStorage.getItem("schoolos_session_active") === "true";

    // 2. KỊCH BẢN A: Chưa đăng nhập mà dám đi lung tung -> Đá về Cổng chính ("/")
    if (!sessionActive && pathname !== "/") {
      router.replace("/");
      return;
    }

    // 3. KỊCH BẢN B: Đã đăng nhập là HỌC SINH nhưng gõ URL chui vào phòng ADMIN -> Đá về ("/")
    const adminOnlyRoutes = ["/mailbox", "/audit"];
    // Kiểm tra xem đường dẫn hiện tại có nằm trong khu cấm không
    const isTryingToEnterAdminArea = adminOnlyRoutes.some(route => pathname.startsWith(route));
    
    if (sessionActive && role !== "admin" && isTryingToEnterAdminArea) {
      router.replace("/");
      return;
    }

    // 🛠️ VÁ LỖI BIÊN DỊCH: Vượt qua hết lưới laser an ninh -> Cho phép hiển thị giao diện qua setTimeout
    const timer = setTimeout(() => {
      setIsVerified(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, router, role]);

  // Che mắt bằng màn hình loading trong lúc hệ thống đang quét thẻ (Tránh lóe giao diện)
  if (!isVerified && pathname !== "/") {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center z-50 fixed inset-0">
        <span className="font-mono text-xs text-signal uppercase tracking-widest animate-pulse">
          Lưới an ninh đang xác thực danh tính...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}