// Proxy (Next.js 16 — TÊN MỚI của Middleware; KHÔNG dùng middleware.ts).
// Gác cả /api/* (trả 401 JSON cho fetch) LẪN trang (redirect /login | /change-password).
// Verify JWT bằng jose (stateless, KHÔNG Prisma — proxy chạy Node nhưng giữ nhẹ).
// Authz thật vẫn lặp ở từng route/service (defense-in-depth) — proxy chỉ chặn sớm + điều hướng.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyJWT } from "@/lib/jwt";

// API auth công khai (không cần token) — cũng tránh loop "/login → /login".
const PUBLIC_API = new Set(["/api/auth/login", "/api/auth/logout"]);
// Khi mustChangePassword=true: CHỈ các API này được phép (để đổi được mật khẩu).
const MUST_CHANGE_ALLOWED_API = new Set([
  "/api/auth/me",
  "/api/auth/change-password",
  "/api/auth/logout",
]);

const jsonUnauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const jsonMustChange = () =>
  NextResponse.json(
    { error: "Password change required", code: "MUST_CHANGE_PASSWORD" },
    { status: 403 },
  );
const redirectTo = (request: NextRequest, path: string) =>
  NextResponse.redirect(new URL(path, request.url));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyJWT(token) : null;

  // ── API ──────────────────────────────────────────────────────────────
  if (isApi) {
    if (PUBLIC_API.has(pathname)) return NextResponse.next(); // login/logout luôn cho qua
    if (!payload) return jsonUnauthorized(); // thiếu/sai token → 401 JSON (KHÔNG redirect)
    if (payload.mustChangePassword && !MUST_CHANGE_ALLOWED_API.has(pathname))
      return jsonMustChange();
    return NextResponse.next();
  }

  // ── TRANG ────────────────────────────────────────────────────────────
  // /login: chống loop — chưa auth thì render; đã auth thì đẩy đi đúng chỗ.
  if (pathname === "/login") {
    if (!payload) return NextResponse.next();
    return redirectTo(request, payload.mustChangePassword ? "/change-password" : "/");
  }

  // Các trang còn lại cần auth.
  if (!payload) return redirectTo(request, "/login");

  // Ép đổi mật khẩu lần đầu (cho qua đúng trang /change-password để khỏi loop).
  if (payload.mustChangePassword) {
    return pathname === "/change-password"
      ? NextResponse.next()
      : redirectTo(request, "/change-password");
  }

  // Đã auth + không cần đổi MK: chặn vào lại /change-password → đẩy vào app.
  if (pathname === "/change-password") return redirectTo(request, "/");

  return NextResponse.next();
}

// Gác cả trang lẫn /api; loại trừ Next internals + asset có đuôi file (chứa dấu chấm).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
