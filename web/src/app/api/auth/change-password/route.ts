// POST /api/auth/change-password — đổi mật khẩu (dùng cho cả luồng ép đổi lần đầu).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/generated/prisma/client";
import { changePasswordSchema } from "@/lib/validation";
import { signJWT } from "@/lib/jwt";
import { getAuthPayload, setAuthCookie, clientMeta } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthPayload(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Rate-limit theo user TRƯỚC bcrypt: chặn brute-force `currentPassword` qua một phiên hợp lệ
    // (kiosk / tài khoản mật khẩu mặc định). Mỗi user 1 bucket → không khoá chéo người khác. P9 audit.
    const rl = rateLimit(`pwchange:${payload.sub}`);
    if (!rl.ok) {
      const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
      res.headers.set("Retry-After", String(rl.retryAfter));
      return res;
    }

    // opt-in passwordHash để so khớp mật khẩu hiện tại.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      omit: { passwordHash: false },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Mật khẩu mới phải KHÁC mật khẩu cũ — nếu không, luồng ép-đổi-lần-đầu trở nên vô nghĩa.
    const sameAsOld = await bcrypt.compare(parsed.data.newPassword, user.passwordHash);
    if (sameAsOld) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 },
      );
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    // KHÔNG ghi mật khẩu vào metadata.
    const { ipAddress, userAgent } = clientMeta(request);
    await recordAudit({
      action: AuditAction.UPDATE,
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      metadata: { field: "passwordHash" },
      ipAddress,
      userAgent,
    });

    // Cấp lại cookie JWT mới (mustChangePassword=false) để hết bị proxy chặn.
    const token = await signJWT({ role: user.role, mustChangePassword: false }, user.id);
    const res = NextResponse.json({ success: true });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    console.error("change-password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
