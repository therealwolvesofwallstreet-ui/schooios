"use client";

// Đổi mật khẩu (lần đầu hoặc tự nguyện). State thuần (xem useLogin). Cookie mới do server set;
// nếu là lần-đầu thì cờ mustChangePassword được xoá → router.replace("/") qua proxy là hợp lệ.
// KHÔNG skipAuthRedirect: 401 ở đây = phiên thật sự mất → để api.ts đẩy /login là đúng.
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const change = useCallback(
    async (input: ChangePasswordInput) => {
      setIsPending(true);
      setError(null);
      try {
        await api.post("/api/auth/change-password", input);
        router.replace("/");
        // GIỮ isPending qua điều hướng (xem useLogin).
      } catch (e) {
        setError(e instanceof ApiError ? e : new ApiError(0, { error: "network" }));
        setIsPending(false);
      }
    },
    [router],
  );

  return { change, isPending, error };
}
