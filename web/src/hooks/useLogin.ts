"use client";

// Đăng nhập. Dùng state thuần (KHÔNG React Query — nhóm (public) không mount QueryClientProvider;
// điều hướng sang (app) sẽ tự fetch /me tươi). credentials qua api (cookie httpOnly).
// skipAuthRedirect: 401 ở ĐÂY là "sai mật khẩu" → hiện thông báo dịu tại trang, KHÔNG để api.ts
// tự logout+đẩy /login. Đích sau 200: mustChangePassword → /change-password, còn lại → theo role.
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { landingForRole } from "@/lib/auth-landing";
import type { Role } from "@/lib/api-types";

export interface LoginInput {
  identifier: string;
  password: string;
}

interface LoginResponse {
  user: { role: Role; mustChangePassword: boolean };
}

export function useLogin() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const login = useCallback(
    async (input: LoginInput) => {
      setIsPending(true);
      setError(null);
      try {
        const { user } = await api.post<LoginResponse>("/api/auth/login", input, {
          skipAuthRedirect: true,
        });
        const dest = user.mustChangePassword ? "/change-password" : landingForRole(user.role);
        router.replace(dest);
        // GIỮ isPending=true qua điều hướng để nút không "nháy" bật lại trước khi rời trang.
      } catch (e) {
        setError(e instanceof ApiError ? e : new ApiError(0, { error: "network" }));
        setIsPending(false);
      }
    },
    [router],
  );

  return { login, isPending, error };
}
