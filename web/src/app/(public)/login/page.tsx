"use client";

// LOGIN — split biên tập (AuthSurface): trái = một dòng serif + 1 dấu signal thở; phải = form
// gạch-chân. Tâm điểm = nút đỏ "Bước vào" DUY NHẤT. Lỗi = dòng mono ink-dim, KHÔNG đỏ
// (đỏ chỉ dành cho hành động). Auth bằng cookie httpOnly (api credentials:include) — KHÔNG đọc JWT.
// Hydration gate: nút disabled tới khi mounted → chặn submit GET-tự-nhiên trước hydrate (rò mật khẩu
// lên URL). 429: tự mở lại sau Retry-After. Lỗi cũ tự xoá khi user gõ lại (trừ 429 — giữ cooldown).
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SignalDot } from "@/components/ui/SignalDot";
import { useLogin } from "@/hooks/useLogin";
import { useHydrated } from "@/hooks/useHydrated";
import type { ApiError } from "@/lib/api";

const MSG_ID = "login-msg";

// Mirror hợp đồng login (lib/validation.loginSchema) — inline để giữ bundle (public) nhẹ,
// KHÔNG kéo @/generated/prisma vào client như khi import @/lib/validation.
const schema = z.object({
  identifier: z.string().min(1, "Nhập số báo danh hoặc email."),
  password: z.string().min(1, "Nhập mật khẩu."),
});
type FormValues = z.infer<typeof schema>;

// Map lỗi auth → câu DỊU (ink-dim), không lộ chi tiết, không đỏ.
function authMessage(err: ApiError | null): string | null {
  if (!err) return null;
  if (err.status === 429)
    return err.retryAfter ? `Thử lại sau ${err.retryAfter}s.` : "Thử lại sau giây lát.";
  if (err.status === 403) return "Tài khoản đã bị vô hiệu hóa.";
  if (err.status === 401 || err.status === 400) return "Không khớp. Thử lại.";
  return "Không thể đăng nhập lúc này. Thử lại.";
}

export default function LoginPage() {
  const { login, isPending, error, clearError } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Hydration gate: SSR render nút disabled → trước khi JS gắn onSubmit, click/Enter KHÔNG thể
  // submit GET-tự-nhiên (vốn đẩy identifier+password lên URL). Sau hydrate → mở nút.
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
  // Một dòng thông báo dịu: ưu tiên lỗi server, rồi tới lỗi field (đều mono, ink-dim).
  const message = authMessage(error) ?? errors.identifier?.message ?? errors.password?.message ?? null;
  const describedBy = message ? MSG_ID : undefined;
  const invalid = message ? true : undefined;

  return (
    <AuthSurface
      aside={
        <>
          <div className="flex items-center gap-3">
            <SignalDot tone="signal" size="lg" pulse />
            <span className="text-ink-3 font-mono text-[11px] tracking-[0.18em] uppercase">
              Đài Lặng
            </span>
          </div>
          <h1 className="text-ink font-serif text-3xl leading-snug md:text-[2.5rem] md:leading-[1.15]">
            Mỗi tiếng nói đều được lắng nghe, phân loại và theo dấu đến khi khép lại.
          </h1>
        </>
      }
    >
      <form
        onSubmit={handleSubmit((v) => login(v))}
        // Gõ lại → xoá thông báo lỗi cũ (giữ 429 để không huỷ cooldown).
        onInput={() => {
          if (error && error.status !== 429) clearError();
        }}
        aria-busy={isPending}
        className="flex flex-col gap-7"
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
          <Button type="submit" disabled={!hydrated || isPending || rateLimited} className="w-full">
            {isPending ? "Đang vào…" : "Bước vào"}
          </Button>
          {message && (
            <p id={MSG_ID} role="alert" className="text-ink-3 font-mono text-xs">
              {message}
            </p>
          )}
        </div>
      </form>
    </AuthSurface>
  );
}
