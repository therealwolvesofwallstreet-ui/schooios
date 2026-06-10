import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // 🛠️ BƯỚC 1: Import thêm createJSONStorage

interface AuthState {
  isLoggedIn: boolean;
  userEmail: string | null;
  role: "student" | "admin";
  login: (email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userEmail: null,
      role: "student",

      // HÀM ĐĂNG NHẬP TỰ ĐỘNG PHÂN QUYỀN THEO EMAIL
      login: (email) => {
        const emailLower = email.toLowerCase();
        
        // Quy tắc: Nếu email có chữ "admin" hoặc "teacher" -> quyền admin, ngược lại -> student
        const autoRole = emailLower.includes("admin") || emailLower.includes("teacher") ? "admin" : "student";
        
        set({ 
          userEmail: email, 
          isLoggedIn: true, 
          role: autoRole // Hệ thống tự quyết định role, user không tự chọn được
        });
      },

      logout: () => set({ userEmail: null, role: "student", isLoggedIn: false }),
    }),
    { 
      name: "school-os-auth",
      // 🛠️ BƯỚC 2: CHÌA KHÓA Ở ĐÂY! Ép Zustand xài sessionStorage để mỗi tab là một thế giới riêng biệt
      storage: createJSONStorage(() => sessionStorage) 
    }
  )
);