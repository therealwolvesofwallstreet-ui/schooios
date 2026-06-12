"use client";

// Client boundary cho NHÓM (app): cung cấp TanStack Query + mount Toast cho mọi trang app.
// Đặt ở (app) (KHÔNG ở root) để nhóm (public) — login/change-password — giữ nhẹ, server-only.
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/queryClient";
import { Toast } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  // 1 client/đời tab (useState init lười) — KHÔNG tạo lại mỗi render.
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toast />
    </QueryClientProvider>
  );
}
