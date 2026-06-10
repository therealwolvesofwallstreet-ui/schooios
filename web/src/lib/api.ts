// Client-side fetch wrapper cho toàn bộ FE (Zustand stores + pages).
// - credentials:"include" để gửi cookie JWT httpOnly (auth state KHÔNG đọc token ở FE).
// - Body object → JSON tự động. Parse JSON response (kể cả body lỗi {error,...}).
// - Lỗi → ném ApiError{status, body} (KHÔNG nuốt lỗi); 401 → đẩy về /login (client),
//   trừ khi đang ở /login hoặc gọi với skipAuthRedirect (vd hydrate /me lúc mở app).
// Same-origin (no CORS): path luôn dạng "/api/...".

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    const msg =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `API error ${status}`;
    super(msg);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Lấy header Retry-After (giây) nếu có — dùng cho 429/503. */
export function retryAfterSeconds(body: unknown): number | null {
  if (body && typeof body === "object" && "retryAfter" in body) {
    const n = Number((body as { retryAfter: unknown }).retryAfter);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type FetchOpts = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Bỏ qua auto-redirect /login khi gặp 401 (vd: hydrate /me). */
  skipAuthRedirect?: boolean;
};

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
    if (
      res.status === 401 &&
      !skipAuthRedirect &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    throw new ApiError(res.status, data);
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
