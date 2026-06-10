// POST /api/auth/logout — xoá cookie token; nếu token hợp lệ thì ghi audit LOGOUT (best-effort).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuditAction } from "@/generated/prisma/client";
import { AUTH_COOKIE, verifyJWT } from "@/lib/jwt";
import { clearAuthCookie, clientMeta } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ success: true });
  clearAuthCookie(res);

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token) {
    const payload = await verifyJWT(token);
    if (payload) {
      const { ipAddress, userAgent } = clientMeta(request);
      try {
        await recordAudit({
          action: AuditAction.LOGOUT,
          entityType: "User",
          entityId: payload.sub,
          actorId: payload.sub,
          ipAddress,
          userAgent,
        });
      } catch (err) {
        console.error("logout audit error:", err); // best-effort: vẫn xoá cookie/đăng xuất
      }
    }
  }

  return res;
}
