// TanStack Query client cho FE. Hợp đồng lỗi (docs/API.md):
//  - 429/503 → retry, TÔN TRỌNG Retry-After (ApiError.retryAfter, giây).
//  - 4xx khác (400/401/403/404/409) → KHÔNG retry (vô nghĩa/đã xử lý nơi khác).
//  - 401 → ApiError tự logout+redirect /login (lib/api.ts); ở đây CHỈ dọn cache để không
//    rò state của phiên cũ. 409/optimistic-lock do useOptimisticMutation lo (reload+retry).
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

const MAX_RETRY = 3;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRY) return false;
  if (error instanceof ApiError) return error.status === 429 || error.status === 503;
  return false;
}

function retryDelay(attempt: number, error: unknown): number {
  // Retry-After là nguồn sự thật khi có (đổi giây→ms); fallback backoff mũ có trần.
  if (error instanceof ApiError && error.retryAfter != null) {
    return Math.max(0, error.retryAfter * 1000);
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

function clearOn401(error: unknown, queryClient: QueryClient) {
  if (error instanceof ApiError && error.status === 401) {
    // lib/api.ts đã điều hướng /login; xoá cache để tránh hiển thị dữ liệu phiên cũ.
    queryClient.clear();
  }
}

export function makeQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => clearOn401(error, queryClient),
    }),
    mutationCache: new MutationCache({
      onError: (error) => clearOn401(error, queryClient),
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay,
        // role/session KHÔNG cache lâu (hợp đồng: tin /me); dedupe trong-bay là đủ.
        staleTime: 0,
        refetchOnWindowFocus: false,
        gcTime: 5 * 60 * 1000,
      },
      mutations: {
        retry: shouldRetry,
        retryDelay,
      },
    },
  });
  return queryClient;
}
