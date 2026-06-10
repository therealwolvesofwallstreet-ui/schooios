// Client-side fetch wrapper cho toàn bộ FE (Zustand stores + pages).
// - credentials:"include" để gửi cookie JWT httpOnly (auth state KHÔNG đọc token ở FE).
// - Body object → JSON tự động. Parse JSON response (kể cả body lỗi {error,...}).
// - Lỗi → ném ApiError{status, body, retryAfter}; 401 → ĐĂNG XUẤT server-side rồi đẩy /login.
// Same-origin (no CORS): path luôn dạng "/api/...".

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** Giây từ header `Retry-After` (chỉ có ở 429/503) — null nếu không có. */
  readonly retryAfter: number | null;
  constructor(status: number, body: unknown, retryAfter: number | null = null) {
    const msg =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `API error ${status}`;
    super(msg);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }
}

type FetchOpts = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Bỏ qua auto-logout+redirect khi gặp 401 (vd: hydrate /me, login, logout). */
  skipAuthRedirect?: boolean;
};

// Chống nhiều navigation/logout song song khi nhiều request 401 cùng lúc (debounce module-level).
let redirectingToLogin = false;

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOpts = {},
): Promise<T> {
  const { body, headers, skipAuthRedirect, ...rest } = opts;
  const hasBody = body !== undefined;

  const res = await fetch(path, {
    credentials: "include",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
    ...rest,
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const raHeader = res.headers.get("Retry-After");
    const retryAfter =
      raHeader !== null && Number.isFinite(Number(raHeader)) ? Number(raHeader) : null;

    if (
      res.status === 401 &&
      !skipAuthRedirect &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login" &&
      !redirectingToLogin
    ) {
      redirectingToLogin = true;
      // Xoá cookie httpOnly server-side TRƯỚC khi điều hướng: với user đã bị vô hiệu hoá nhưng
      // JWT còn hạn, route trả 401 mà KHÔNG tự xoá cookie → proxy stateless lại bounce /login→/.
      // Đăng xuất trước rồi /login để PHÁ redirect-loop (đồng thời dọn session hết hạn).
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {
        // kệ — vẫn điều hướng về /login
      }
      window.location.href = "/login";
    }
    throw new ApiError(res.status, data, retryAfter);
  }
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  del: <T = unknown>(path: string, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};
