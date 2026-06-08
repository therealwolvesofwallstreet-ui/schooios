// GET /api/auth/me — trả user TƯƠI từ DB (phản ánh isActive/mustChangePassword hiện tại).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, clearAuthCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Mặc định KHÔNG kèm passwordHash (omit toàn cục ở prisma.ts).
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    clearAuthCookie(res); // token trỏ tới user không còn hợp lệ → dọn cookie
    return res;
  }

  return NextResponse.json({ user });
}
