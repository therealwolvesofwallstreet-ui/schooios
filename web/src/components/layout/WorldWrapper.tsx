"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { ReactNode } from "react";

export default function WorldWrapper({ children }: { children: ReactNode }) {
  const { role } = useAuthStore();

  /* 🛠️ ĐÃ SỬA: Thay vì so sánh với "staff" chưa tồn tại trong Type của Store, 
     chúng ta kiểm tra nếu KHÔNG PHẢI student thì bật Dark Command.
  */
  const isDarkCommand = role !== "student";
  
  const themeClasses = isDarkCommand 
    ? "bg-navy text-paper" 
    : "bg-paper text-ink";

  return (
    <div className={`min-h-screen w-full transition-colors duration-slow ease-out ${themeClasses}`}>
      {children}
    </div>
  );
}