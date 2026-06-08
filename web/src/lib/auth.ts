// Helper auth dùng chung cho route handlers + đọc cookie. Set/clear cookie qua NextResponse
// (tránh rớt Set-Cookie khi trả response). KHÔNG dùng cho proxy (proxy tự đọc request.cookies).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, MAX_AGE, verifyJWT } from "@/lib/jwt";
import type { AuthPayload } from "@/lib/jwt";

const isProd = process.env.NODE_ENV === "production";

// Cờ cookie nhất quán một nguồn: httpOnly, secure (chỉ prod), sameSite lax, path /.
export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// Đọc cookie token từ request + verify. Dùng bởi /me, /change-password.
export async function getAuthPayload(req: NextRequest): Promise<AuthPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

// IP/UA cho audit. x-forwarded-for (Vercel) có thể là danh sách → lấy phần tử đầu.
export function clientMeta(req: NextRequest): { ipAddress?: string; userAgent?: string } {
  const xff = req.headers.get("x-forwarded-for");
  const ipAddress = xff ? xff.split(",")[0]!.trim() : req.headers.get("x-real-ip") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  return { ipAddress: ipAddress || undefined, userAgent };
}
