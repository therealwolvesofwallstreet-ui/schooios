// Nhóm (app): mọi trang sau-đăng-nhập. Providers (React Query + Toast) bọc AppShell.
// Đây là client boundary (qua Providers) — KHÔNG đặt provider ở root để (public) giữ nhẹ.
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell/AppShell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
