import { create } from "zustand";

interface AuthState {
  isLoggedIn: boolean;
  userEmail: string;
  login: (email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false, // Mặc định ban đầu chưa đăng nhập
  userEmail: "",
  
  login: (email) => set({ isLoggedIn: true, userEmail: email }),
  logout: () => set({ isLoggedIn: false, userEmail: "" }),
}));