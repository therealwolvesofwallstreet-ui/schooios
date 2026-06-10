import { create } from "zustand";
import { api } from "@/lib/api";
import type { Role } from "@/lib/api-types";

// Auth state lấy TỪ server (GET /api/auth/me) — JWT nằm trong cookie httpOnly, FE KHÔNG đọc token.
// KHÔNG persist phía client (nguồn sự thật = cookie + /me). Proxy.ts lo việc gác trang/redirect.
export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  sbd: string | null;
  role: Role;
  mustChangePassword: boolean;
}

type AuthStatus = "idle" | "loading" | "authed" | "anon";

interface AuthState {
  user: AuthUser | null;
  role: Role | null;
  /** Nhãn hiển thị (email ?? sbd ?? name) — tiện cho UI. */
  userEmail: string | null;
  mustChangePassword: boolean;
  status: AuthStatus;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const label = (u: AuthUser | null): string | null =>
  u ? u.email ?? u.sbd ?? u.name : null;

const applyUser = (u: AuthUser) => ({
  user: u,
  role: u.role,
  userEmail: label(u),
  mustChangePassword: u.mustChangePassword,
  status: "authed" as const,
  hydrated: true,
});

const clearedState = {
  user: null,
  role: null,
  userEmail: null,
  mustChangePassword: false,
  status: "anon" as const,
  hydrated: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  userEmail: null,
  mustChangePassword: false,
  status: "idle",
  hydrated: false,

  // Mở app → đọc trạng thái từ /me. 401 = chưa đăng nhập (KHÔNG redirect ở đây; proxy gác trang).
  hydrate: async () => {
    set({ status: "loading" });
    try {
      const { user } = await api.get<{ user: AuthUser }>("/api/auth/me", {
        skipAuthRedirect: true,
      });
      set(applyUser(user));
    } catch {
      set(clearedState);
    }
  },

  // skipAuthRedirect: lỗi 401 (sai mật khẩu) phải hiện trên form, KHÔNG bị wrapper đá về /login.
  login: async (identifier, password) => {
    const { user } = await api.post<{ user: AuthUser }>(
      "/api/auth/login",
      { identifier, password },
      { skipAuthRedirect: true },
    );
    set(applyUser(user));
    return user;
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout", undefined, { skipAuthRedirect: true });
    } catch {
      // dù API lỗi vẫn xoá state phía client.
    }
    set(clearedState);
  },
}));
