"use client";

// LOGIN — split biên tập (AuthSurface): trái = một dòng serif + 1 dấu signal thở; phải = form
// gạch-chân. Tâm điểm = nút đỏ "Bước vào" DUY NHẤT. Lỗi = dòng mono ink-dim, KHÔNG đỏ
// (đỏ chỉ dành cho hành động). Auth bằng cookie httpOnly (api credentials:include) — KHÔNG đọc JWT.
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SignalDot } from "@/components/ui/SignalDot";
import { useLogin } from "@/hooks/useLogin";
import type { ApiError } from "@/lib/api";

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
  const { login, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const rateLimited = error?.status === 429;
  // Một dòng thông báo dịu: ưu tiên lỗi server, rồi tới lỗi field (đều mono, ink-dim).
  const message = authMessage(error) ?? errors.identifier?.message ?? errors.password?.message ?? null;

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
        aria-busy={isPending}
        className="flex flex-col gap-7"
        noValidate
      >
        <Input
          label="Số báo danh / Email"
          autoComplete="username"
          autoFocus
          {...register("identifier")}
        />
        <Input
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />

        <div className="mt-1 flex flex-col gap-3">
          <Button type="submit" disabled={isPending || rateLimited} className="w-full">
            {isPending ? "Đang vào…" : "Bước vào"}
          </Button>
          {message && (
            <p role="alert" className="text-ink-3 font-mono text-xs">
              {message}
            </p>
          )}
        </div>
      </form>
    </AuthSurface>
  );
}
