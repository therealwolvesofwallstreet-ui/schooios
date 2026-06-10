// POST /api/auth/login — đăng nhập bằng email (STAFF/ADMIN) hoặc sbd (STUDENT).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/generated/prisma/client";
import { loginSchema } from "@/lib/validation";
import { signJWT } from "@/lib/jwt";
import { setAuthCookie, clientMeta } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

// Thông điệp 401 ĐỒNG NHẤT cho mọi nhánh sai (không lộ định danh tồn tại hay không).
// Factory (KHÔNG dùng chung 1 instance): body của Response là stream, chỉ tiêu thụ được 1 lần.
const invalid = () => NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

// Khi định danh không tồn tại, vẫn chạy 1 bcrypt.compare giả để cân bằng thời gian phản hồi
// (chống user-enumeration qua timing — đồng bộ với chủ trương "401 đồng nhất"). Cache 1 lần.
let dummyHash: string | null = null;
async function timingSafeMiss(password: string): Promise<void> {
  if (!dummyHash) dummyHash = await bcrypt.hash("user-not-found-placeholder", 10);
  await bcrypt.compare(password, dummyHash);
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const identifier = parsed.data.identifier.trim();
    const isEmail = identifier.includes("@");
    const where = isEmail ? { email: identifier.toLowerCase() } : { sbd: identifier };

    // opt-in passwordHash CHỈ để so khớp (prisma.ts omit toàn cục).
    const user = await prisma.user.findUnique({ where, omit: { passwordHash: false } });
    if (!user) {
      await timingSafeMiss(parsed.data.password);
      return invalid();
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return invalid();

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const token = await signJWT(
      { role: user.role, mustChangePassword: user.mustChangePassword },
      user.id,
    );

    // Loại passwordHash khỏi response (không bao giờ trả ra). Xóa field thay vì destructure-bỏ
    // (tránh biến unused — eslint --max-warnings 0 không ignore tiền tố `_`).
    const safeUser = { ...user };
    delete (safeUser as { passwordHash?: string }).passwordHash;
    const res = NextResponse.json({ user: safeUser });
    setAuthCookie(res, token);

    // Audit fail-closed: ghi LOGIN trước khi trả success; lỗi audit → 500.
    const { ipAddress, userAgent } = clientMeta(request);
    await recordAudit({
      action: AuditAction.LOGIN,
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      ipAddress,
      userAgent,
    });

    return res;
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
