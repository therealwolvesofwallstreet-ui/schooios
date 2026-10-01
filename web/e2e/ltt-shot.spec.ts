// Visual sweep rig LTT Clean (KHÔNG vào gate — chỉ sinh PNG vào .verify/ltt-*). 2 project = 1280 + 390.
// Bề mặt cần đăng nhập dùng creds fixture; case detail cần E2E_CASE_ID (vd P4FX_B_ID).
import { test, expect, authenticate, haveCreds, type RoleKey } from "./_fixtures";
import type { Page, TestInfo } from "@playwright/test";

async function shoot(page: Page, info: TestInfo, name: string) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `.verify/ltt-${name}-${info.project.name}.png`, fullPage: true });
}

test("login", async ({ page }, info) => {
  await page.goto("/login");
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  await shoot(page, info, "login");
  // Không cuộn trang ở mọi viewport.
  const scroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  expect(scroll).toBeLessThanOrEqual(0);
});

const SURFACES: { role: RoleKey; name: string; path: string }[] = [
  { role: "STUDENT", name: "home-student", path: "/" },
  { role: "STUDENT", name: "feed", path: "/feed" },
  { role: "STUDENT", name: "report-new", path: "/report/new" },
  { role: "STAFF", name: "home-staff", path: "/" },
  { role: "STAFF", name: "desk", path: "/desk" },
  { role: "ADMIN", name: "home-admin", path: "/" },
  { role: "ADMIN", name: "cases", path: "/cases" },
  { role: "ADMIN", name: "emergency", path: "/emergency" },
  { role: "STUDENT", name: "notifications", path: "/notifications" },
  { role: "ADMIN", name: "audit", path: "/audit" },
];
if (process.env.E2E_CASE_ID)
  SURFACES.push({ role: "ADMIN", name: "case-detail", path: `/cases/${process.env.E2E_CASE_ID}` });

for (const s of SURFACES) {
  test(`${s.name} [${s.role}]`, async ({ page, context }, info) => {
    test.skip(!haveCreds(s.role), `Thiếu creds ${s.role}`);
    await authenticate(context, s.role);
    await page.goto(s.path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20000 });
    await shoot(page, info, s.name);
  });
}
