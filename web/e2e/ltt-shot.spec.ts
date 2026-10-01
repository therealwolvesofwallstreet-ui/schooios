// Visual sweep rig LTT Clean (KHÔNG vào gate — chỉ sinh PNG vào .verify/). /login không cần DB.
import { test, expect } from "@playwright/test";

test("login shot", async ({ page }, info) => {
  await page.goto("/login");
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `.verify/ltt-login-${info.project.name}.png` });
  // Không cuộn trang ở mọi viewport.
  const scroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  expect(scroll).toBeLessThanOrEqual(0);
});
