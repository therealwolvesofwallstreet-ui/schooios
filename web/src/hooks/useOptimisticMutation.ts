"use client";

// Wrapper useMutation theo hợp đồng lỗi (docs/API.md):
//  - 409 (optimistic-lock): invalidate (reload hồ sơ) + toast "đã tải lại" → user thử lại trên bản mới.
//  - 400: KHÔNG toast — trả error.body.details cho form tự hiển thị field-level (đọc mutation.error).
//  - 429/503: đã được queryClient retry theo Retry-After; chỉ toast khi cạn retry.
//  - 401: lib/api.ts tự logout+redirect. 403/404/500: toast ngắn.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { useToastQueue } from "@/store/toast";

interface OptimisticOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Query keys cần làm mới khi thành công HOẶC khi 409 (reload trước retry). */
  invalidateKeys?: readonly (readonly unknown[])[];
  onSuccess?: (data: TData, vars: TVars) => void;
  successMessage?: string;
  conflictMessage?: string;
  /**
   * Ghi đè retry mặc định của queryClient (429/503 ×3). Đặt `false` cho mutation **KHÔNG idempotent**
   * (vd POST create): retry trên 503 do commit-ambiguity có thể sinh bản ghi TRÙNG. PATCH có
   * optimistic-lock thì retry-safe (updatedAt cũ → 409) nên giữ mặc định. Mặc định: kế thừa queryClient.
   */
  retry?: boolean | ((failureCount: number, error: unknown) => boolean);
}

export function useOptimisticMutation<TData, TVars>(opts: OptimisticOptions<TData, TVars>) {
  const queryClient = useQueryClient();
  const push = useToastQueue((s) => s.push);

  const invalidate = () =>
    opts.invalidateKeys?.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key as unknown[] }),
    );

  return useMutation<TData, unknown, TVars>({
    mutationFn: opts.mutationFn,
    // Chỉ override khi caller chỉ định; nếu không → kế thừa default (shouldRetry 429/503) của queryClient.
    ...(opts.retry !== undefined ? { retry: opts.retry } : {}),
    onSuccess: (data, vars) => {
      invalidate();
      if (opts.successMessage) push(opts.successMessage, "success");
      opts.onSuccess?.(data, vars);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        switch (error.status) {
          case 409:
            invalidate(); // reload hồ sơ trước khi user thử lại (yêu cầu updatedAt mới)
            push(opts.conflictMessage ?? "Hồ sơ vừa cập nhật, đã tải lại.", "info");
            return;
          case 400:
            return; // form đọc details từ mutation.error
          case 429:
          case 503:
            push("Hệ thống đang bận, vui lòng thử lại sau giây lát.", "error");
            return;
          case 403:
            push("Bạn không có quyền thực hiện thao tác này.", "error");
            return;
          case 401:
            return; // api.ts đã điều hướng /login
          default:
            push(error.message || "Có lỗi xảy ra.", "error");
            return;
        }
      }
      push("Lỗi mạng, vui lòng thử lại.", "error");
    },
  });
}
