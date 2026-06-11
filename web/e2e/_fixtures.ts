// Đăng nhập 4 role qua POST /api/auth/login bằng REQUEST CONTEXT (set cookie httpOnly) rồi nạp
// cookie vào browser context — KHÔNG phụ thuộc trang /login (trang đó thuộc F2). Hợp đồng login:
// body { identifier, password } (lib/validation.loginSchema); identifier = email (STAFF/ADMIN) | sbd (STUDENT).
// Tài khoản: fixture P4 (prisma/cases-fixture.ts, mustChangePassword=false). Thiếu ENV → test skip.
import { test as base, request, type BrowserContext, expect } from "@playwright/test";

export type RoleKey = "STUDENT" | "STAFF" | "ADMIN" | "AUDITOR";

const PASSWORD = process.env.E2E_PASSWORD || "";

export const CREDENTIALS: Record<RoleKey, string> = {
  STUDENT: process.env.E2E_STUDENT_SBD || "",
  STAFF: process.env.E2E_STAFF_EMAIL || "",
  ADMIN: process.env.E2E_ADMIN_EMAIL || "",
  AUDITOR: process.env.E2E_AUDITOR_EMAIL || "",
};

export function haveCreds(role: RoleKey): boolean {
  return Boolean(PASSWORD && CREDENTIALS[role]);
}

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

// CACHE cookie theo role (per-worker): đăng nhập 1 lần/role rồi tái dùng — tránh đập POST /login
// nhiều lần làm dính rate-limit P9 (429). JWT trong cookie sống đủ lâu cho 1 lần chạy suite.
type CookieParam = Parameters<BrowserContext["addCookies"]>[0];
const cookieCache = new Map<RoleKey, CookieParam>();

/** Đăng nhập role → trả cookies (httpOnly) để addCookies vào browser context. Cache theo role.
 * RETRY lỗi tạm (429 rate-limit / 5xx DB-busy lúc nhiều worker login đồng thời) như client thật. */
const TRANSIENT = new Set([429, 500, 502, 503, 504]);
async function loginCookies(role: RoleKey): Promise<CookieParam> {
  const cached = cookieCache.get(role);
  if (cached) return cached;
  const identifier = CREDENTIALS[role];
  const req = await request.newContext({ baseURL });
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await req.post("/api/auth/login", { data: { identifier, password: PASSWORD } });
    if (res.ok()) {
      const { cookies } = await req.storageState();
      await req.dispose();
      cookieCache.set(role, cookies);
      return cookies;
    }
    lastStatus = res.status();
    if (!TRANSIENT.has(lastStatus)) break; // lỗi thật (vd 401) → dừng ngay
    const ra = Number(res.headers()["retry-after"]);
    const waitMs = Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1200 * attempt, 5000);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  await req.dispose();
  expect(false, `login ${role} (${identifier}) thất bại sau 4 lần: HTTP ${lastStatus}`).toBeTruthy();
  throw new Error("unreachable");
}

export async function authenticate(context: BrowserContext, role: RoleKey) {
  const cookies = await loginCookies(role);
  await context.addCookies(cookies);
}

/** test.describe với context đã đăng nhập theo role; tự skip nếu thiếu ENV. */
export function describeAs(role: RoleKey, title: string, fn: () => void) {
  base.describe(`${title} [${role}]`, () => {
    base.skip(!haveCreds(role), `Thiếu E2E creds cho ${role} (set E2E_* env)`);
    base.beforeEach(async ({ context }) => {
      await authenticate(context, role);
    });
    fn();
  });
}

export { base as test, expect };
