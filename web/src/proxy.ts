// Proxy (Next.js 16 — TÊN MỚI của Middleware; KHÔNG dùng middleware.ts).
// API-ONLY: chỉ gác /api/* (trả 401 JSON cho fetch). Page-guard (redirect /login | /change-password)
// ĐÃ GỠ cùng UI cũ — sẽ dựng lại ở F2 cho khớp routing UI mới. Verify JWT bằng jose
// (stateless, KHÔNG Prisma — proxy chạy Node nhưng giữ nhẹ).
// Authz thật vẫn lặp ở từng route/service (defense-in-depth) — proxy chỉ chặn sớm.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyJWT } from "@/lib/jwt";

// API auth công khai (không cần token).
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API.has(pathname)) return NextResponse.next(); // login/logout luôn cho qua

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyJWT(token) : null;

  if (!payload) return jsonUnauthorized(); // thiếu/sai token → 401 JSON
  if (payload.mustChangePassword && !MUST_CHANGE_ALLOWED_API.has(pathname))
    return jsonMustChange();
  return NextResponse.next();
}

// API-ONLY: chỉ gác /api/* (page-guard sẽ thêm lại ở F2 khi UI mới định nghĩa route).
export const config = {
  matcher: ["/api/:path*"],
};
