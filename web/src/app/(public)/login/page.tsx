"use client";

// LOGIN — trang tĩnh nhẹ: nền paper + 2 khối xanh mờ trôi chậm (CSS @keyframes, chỉ transform/opacity,
// reduced-motion toàn cục gập lại) + thẻ trắng ở giữa. KHÔNG WebGL/Lenis/GSAP.
// Auth bằng cookie httpOnly (api credentials:include) — KHÔNG đọc JWT.
// Hydration gate: nút disabled tới khi mounted → chặn submit GET-tự-nhiên trước hydrate (rò mật khẩu
// lên URL). 429: tự mở lại sau Retry-After. Lỗi cũ tự xoá khi user gõ lại (trừ 429 — giữ cooldown).
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BrandEmblem, BRAND_NAME } from "@/components/ui/BrandMark";
import { useLogin } from "@/hooks/useLogin";
import { useHydrated } from "@/hooks/useHydrated";
import type { ApiError } from "@/lib/api";

const MSG_ID = "login-msg";

// Mirror hợp đồng login (lib/validation.loginSchema) — inline để giữ bundle (public) nhẹ,
// KHÔNG kéo @/generated/prisma vào client như khi import @/lib/validation.
const schema = z.object({
  identifier: z.string().min(1, "Nhập số báo danh hoặc email"),
  password: z.string().min(1, "Nhập mật khẩu"),
});
type FormValues = z.infer<typeof schema>;

// Map lỗi auth → câu dịu, không lộ chi tiết, không đỏ (đỏ chỉ cho khẩn cấp).
function authMessage(err: ApiError | null): string | null {
  if (!err) return null;
  if (err.status === 429)
    return err.retryAfter ? `Thử lại sau ${err.retryAfter}s` : "Thử lại sau giây lát";
  if (err.status === 403) return "Tài khoản đã bị vô hiệu hóa";
  if (err.status === 401 || err.status === 400) return "Không khớp. Thử lại";
  return "Không thể đăng nhập lúc này. Thử lại";
}

export default function LoginPage() {
  const { login, isPending, error, clearError } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // useSyncExternalStore (hooks/useHydrated) → KHÔNG setState-in-effect.
  const hydrated = useHydrated();

  // 429: tự mở lại nút sau Retry-After (không còn deadlock cần reload).
  useEffect(() => {
    if (error?.status !== 429) return;
    const secs = error.retryAfter && error.retryAfter > 0 ? error.retryAfter : 30;
    const t = setTimeout(() => clearError(), secs * 1000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const rateLimited = error?.status === 429;
  // Một dòng thông báo: ưu tiên lỗi server, rồi tới lỗi field.
  const message = authMessage(error) ?? errors.identifier?.message ?? errors.password?.message ?? null;
  const describedBy = message ? MSG_ID : undefined;
  const invalid = message ? true : undefined;

  return (
    <main className="bg-paper relative flex h-dvh items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="login-blob-a bg-signal-hot/25 absolute -top-32 -left-24 size-[28rem] rounded-full blur-3xl" />
        <div className="login-blob-b bg-signal/20 absolute -right-24 -bottom-40 size-[32rem] rounded-full blur-3xl" />
      </div>

      <div className="login-card-in bg-paper-raised border-line relative w-full max-w-sm rounded-lg border p-8 shadow-[0_12px_40px_-12px_rgb(15_31_46/0.18)]">
        <div className="mb-8 flex items-center gap-3">
          <BrandEmblem size={40} priority />
          <span className="font-display text-ink text-xl font-bold tracking-tight">{BRAND_NAME}</span>
        </div>

        <form
          onSubmit={handleSubmit((v) => login(v))}
          // Gõ lại → xoá thông báo lỗi cũ (giữ 429 để không huỷ cooldown).
          onInput={() => {
            if (error && error.status !== 429) clearError();
          }}
          aria-busy={isPending}
          className="flex flex-col gap-6"
          noValidate
        >
          <Input
            label="Số báo danh / Email"
            autoComplete="username"
            autoFocus
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("identifier")}
          />
          <Input
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("password")}
          />

          <div className="mt-1 flex flex-col gap-3">
            <Button
              type="submit"
              aria-label="Sign in"
              disabled={!hydrated || isPending || rateLimited}
              className="h-11 w-full"
            >
              {isPending ? (
                <CircleNotch size={20} weight="bold" className="animate-spin" aria-hidden />
              ) : (
                <ArrowRight size={20} weight="bold" aria-hidden />
              )}
            </Button>
            {message && (
              <p id={MSG_ID} role="alert" className="text-ink-2 text-xs">
                {message}
              </p>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
