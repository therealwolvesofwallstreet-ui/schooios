// Proxy (Next.js 16 — TÊN MỚI của Middleware; KHÔNG dùng middleware.ts).
// Cổng auth "optimistic" cho /api/*: verify JWT trong cookie bằng jose (stateless, KHÔNG Prisma).
// Authz thật vẫn được lặp lại ở từng route/service (defense-in-depth) — proxy chỉ là lớp chặn sớm.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyJWT } from "@/lib/jwt";

// Route công khai (không cần token).
const PUBLIC_PATHS = new Set(["/api/auth/login", "/api/auth/logout"]);

// Khi mustChangePassword=true: CHỈ các path này được phép (tránh khoá luôn endpoint đổi mật khẩu).
const MUST_CHANGE_ALLOWED = new Set([
  "/api/auth/me",
  "/api/auth/change-password",
  "/api/auth/logout",
]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return unauthorized();

  const payload = await verifyJWT(token);
  if (!payload) return unauthorized();

  // Ép đổi mật khẩu lần đầu: chặn mọi route trừ allowlist.
  if (payload.mustChangePassword && !MUST_CHANGE_ALLOWED.has(pathname)) {
    return NextResponse.json(
      { error: "Password change required", code: "MUST_CHANGE_PASSWORD" },
      { status: 403 },
    );
  }

  // RBAC theo payload.role sẽ gắn ở đây khi P4+ có route giới hạn theo vai trò.
  // P3 chưa có route role-gated nào ngoài /api/auth/* nên cho qua.
  return NextResponse.next();
}

// P3: chỉ gác /api (chưa có trang FE → tránh redirect tới /login chưa tồn tại).
export const config = {
  matcher: ["/api/:path*"],
};
