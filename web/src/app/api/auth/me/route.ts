// GET /api/auth/me — trả user TƯƠI từ DB (phản ánh isActive/mustChangePassword hiện tại).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, clearAuthCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireUser(request); // user tươi + isActive; passwordHash đã omit
  if (!user) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    clearAuthCookie(res); // token thiếu/sai/trỏ user không còn hợp lệ → dọn cookie
    return res;
  }
  return NextResponse.json({ user });
}
