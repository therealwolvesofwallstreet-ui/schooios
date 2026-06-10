// Helper auth dùng chung cho route handlers + đọc cookie. Set/clear cookie qua NextResponse
// (tránh rớt Set-Cookie khi trả response). KHÔNG dùng cho proxy (proxy tự đọc request.cookies).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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

// Đọc cookie token từ request + verify. Trả payload JWT (stateless, KHÔNG phản ánh isActive).
export async function getAuthPayload(req: NextRequest): Promise<AuthPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

// PRIMITIVE chuẩn cho route: user TƯƠI từ DB + còn hoạt động (isActive). Trả null nếu thiếu/sai
// token HOẶC user không còn/đã bị vô hiệu (phản ánh thu hồi quyền dù JWT chưa hết hạn).
// passwordHash KHÔNG bao giờ kèm (omit toàn cục). P4+ dùng hàm này thay vì tự lặp getAuthPayload+findUnique.
export async function requireUser(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) return null;
  return user;
}

// IP/UA cho audit. x-forwarded-for (Vercel) có thể là danh sách → lấy phần tử đầu.
export function clientMeta(req: NextRequest): { ipAddress?: string; userAgent?: string } {
  const xff = req.headers.get("x-forwarded-for");
  const ipAddress = xff ? xff.split(",")[0]!.trim() : req.headers.get("x-real-ip") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  return { ipAddress: ipAddress || undefined, userAgent };
}
