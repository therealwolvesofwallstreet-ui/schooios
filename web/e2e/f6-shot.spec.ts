// QA screenshot rig F6 (KHÔNG vào gate — chỉ sinh PNG để tự chấm + check 0-diff). Lưu .verify/qa-shot-*.png.
// SETTLE = chờ framer width-grow (0.6s + delay ≤0.3s) xong → shot tĩnh. cases dùng để check 2-shot 0-diff
// (KHÔNG canvas; dashboard CÓ PulseField WebGL động nên KHÔNG dùng cho 0-diff).
import { test, authenticate, haveCreds } from "./_fixtures";
import type { Page } from "@playwright/test";

const SETTLE = 1300;
async function shoot(page: Page, name: string) {
  await page.waitForTimeout(SETTLE);
  await page.screenshot({ path: `.verify/qa-shot-${name}.png`, fullPage: true });
}

test.describe("F6 shots [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("cases 1280 (×2 cho 0-diff) + dashboard 1280", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/cases");
    await page.getByRole("heading", { name: "Tất cả vụ việc" }).waitFor();
    await shoot(page, "cases-1280-a");
    await shoot(page, "cases-1280-b"); // 2-shot 0-diff (no canvas)

    await page.goto("/");
    await page.getByTestId("memorial-numbers").waitFor();
    await page.getByTestId("chart-status").waitFor();
    await shoot(page, "dashboard-1280");
  });

  test("cases 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cases");
    await page.getByRole("heading", { name: "Tất cả vụ việc" }).waitFor();
    await shoot(page, "cases-390");
  });
});

test.describe("F6 shots [STAFF]", () => {
  test.skip(!haveCreds("STAFF"), "Thiếu creds STAFF");
  test.beforeEach(({ context }) => authenticate(context, "STAFF"));

  test("desk 1280 + 390", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/desk");
    await page.getByRole("heading", { name: "Bàn làm việc" }).waitFor();
    await shoot(page, "desk-1280");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/desk");
    await page.getByRole("heading", { name: "Bàn làm việc" }).waitFor();
    await shoot(page, "desk-390");
  });
});

test.describe("F6 shots [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("feed 1280 + 390", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/feed");
    await page.getByRole("heading", { name: "Bảng tin" }).waitFor();
    await shoot(page, "feed-1280");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/feed");
    await page.getByRole("heading", { name: "Bảng tin" }).waitFor();
    await shoot(page, "feed-390");
  });
});
