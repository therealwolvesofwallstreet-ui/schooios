// JWT thuần (jose) — KHÔNG import Prisma client (proxy chạy Node nhưng giữ nhẹ, stateless).
// `Role` chỉ import dạng TYPE nên bị erase lúc compile, không kéo runtime Prisma vào proxy.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/client";

export const AUTH_COOKIE = "token";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 ngày (giây) — đồng bộ exp của JWT

export type AuthPayload = {
  sub: string; // userId (cuid)
  role: Role;
  mustChangePassword: boolean;
};

// Key fail-closed: thiếu hoặc <32 ký tự → trả null để mọi verify thất bại an toàn.
function secretKey(): Uint8Array | null {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

export async function signJWT(
  claims: { role: Role; mustChangePassword: boolean },
  sub: string,
): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("JWT_SECRET missing or too short (need >= 32 chars)");
  return new SignJWT({ role: claims.role, mustChangePassword: claims.mustChangePassword })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

// Không throw: token sai/hết hạn HOẶC secret thiếu → null.
export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      mustChangePassword: payload.mustChangePassword === true,
    };
  } catch {
    return null;
  }
}
