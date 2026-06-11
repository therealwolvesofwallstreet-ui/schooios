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

/** Đăng nhập role → trả cookies (httpOnly) để addCookies vào browser context. */
async function loginCookies(role: RoleKey) {
  const identifier = CREDENTIALS[role];
  const req = await request.newContext({ baseURL });
  const res = await req.post("/api/auth/login", {
    data: { identifier, password: PASSWORD },
  });
  expect(res.ok(), `login ${role} (${identifier}) thất bại: ${res.status()}`).toBeTruthy();
  const { cookies } = await req.storageState();
  await req.dispose();
  return cookies;
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
