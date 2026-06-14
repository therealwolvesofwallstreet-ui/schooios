"use client";

// CHANGE-PASSWORD — khoảnh khắc serif, cột hẹp canh giữa (AuthSurface không `aside`).
// Lần đầu đăng nhập bị ép tới đây (proxy). Thành công → cookie mới (xoá cờ) → "/".
// Nút đỏ DUY NHẤT; lỗi = dòng mono ink-dim, KHÔNG đỏ. Hydration gate + 429 auto-recover + clear-on-edit
// (xem login/page.tsx — cùng quy ước).
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useChangePassword } from "@/hooks/useChangePassword";
import { useHydrated } from "@/hooks/useHydrated";
import type { ApiError } from "@/lib/api";

const MSG_ID = "change-password-msg";

// Mirror hợp đồng change-password (newPassword ≥ 6) — inline, không kéo @/generated/prisma.
const schema = z.object({
  currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});
type FormValues = z.infer<typeof schema>;

function cpMessage(err: ApiError | null): string | null {
  if (!err) return null;
  if (err.status === 429)
    return err.retryAfter ? `Thử lại sau ${err.retryAfter}s` : "Thử lại sau giây lát";
  if (err.status === 401) return "Mật khẩu hiện tại chưa đúng. Thử lại";
  if (err.status === 400) return "Mật khẩu mới cần khác mật khẩu hiện tại";
  return "Không thể đổi mật khẩu lúc này. Thử lại";
}

export default function ChangePasswordPage() {
  const { change, isPending, error, clearError } = useChangePassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Hydration gate (hooks/useHydrated — useSyncExternalStore, KHÔNG setState-in-effect).
  const hydrated = useHydrated();

  useEffect(() => {
    if (error?.status !== 429) return;
    const secs = error.retryAfter && error.retryAfter > 0 ? error.retryAfter : 30;
    const t = setTimeout(() => clearError(), secs * 1000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const rateLimited = error?.status === 429;
  const message =
    cpMessage(error) ?? errors.currentPassword?.message ?? errors.newPassword?.message ?? null;
  const describedBy = message ? MSG_ID : undefined;
  const invalid = message ? true : undefined;

  return (
    <AuthSurface>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-ink font-serif text-3xl leading-snug">
            Đây là lần đầu. Đặt mật khẩu của riêng bạn
          </h1>
          <p className="text-ink-2 text-sm leading-relaxed">
            Mật khẩu tạm thời chỉ là tấm vé. Chọn một mật khẩu mới để bước vào
          </p>
        </header>

        <form
          onSubmit={handleSubmit((v) => change(v))}
          onInput={() => {
            if (error && error.status !== 429) clearError();
          }}
          aria-busy={isPending}
          className="flex flex-col gap-7"
          noValidate
        >
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            autoComplete="current-password"
            autoFocus
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("currentPassword")}
          />
          <Input
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("newPassword")}
          />

          <div className="mt-1 flex flex-col gap-3">
            <Button type="submit" disabled={!hydrated || isPending || rateLimited} className="w-full">
              {isPending ? "Đang lưu…" : "Đặt mật khẩu"}
            </Button>
            {message && (
              <p id={MSG_ID} role="alert" className="text-ink-3 font-mono text-xs">
                {message}
              </p>
            )}
          </div>
        </form>
      </div>
    </AuthSurface>
  );
}
