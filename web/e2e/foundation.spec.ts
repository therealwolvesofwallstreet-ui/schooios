// GATE NHANH F1: AppShell render đúng cho 4 role + /styleguide; chốt bằng screenshot.
// Mask chip người dùng (tên fixture có thể khác môi trường). Chạy 2 project (desktop 1280 / mobile 390).
import { test, expect, describeAs, authenticate, haveCreds, type RoleKey } from "./_fixtures";

const ROLES: RoleKey[] = ["STUDENT", "STAFF", "ADMIN", "AUDITOR"];

for (const role of ROLES) {
  describeAs(role, "AppShell foundation", () => {
    test("home shell render + screenshot", async ({ page }) => {
      await page.goto("/");
      // Shell sẵn sàng: nav chính (desktop) hoặc topbar (mobile) hiển thị.
      await expect(page.getByText("Lưu khố sống").first()).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page).toHaveScreenshot(`home-${role}.png`, {
        fullPage: true,
        mask: [page.getByTestId("user-chip")],
      });
    });
  });
}

// Styleguide độc lập role — chạy 1 lần với ADMIN (hoặc role bất kỳ có creds).
test.describe("Styleguide foundation", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds cho ADMIN");
  test.beforeEach(async ({ context }) => {
    await authenticate(context, "ADMIN");
  });
  test("styleguide render + screenshot", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByRole("heading", { name: "Đài Lặng" })).toBeVisible();
    await expect(page).toHaveScreenshot("styleguide.png", {
      fullPage: true,
      mask: [page.getByTestId("user-chip")],
    });
  });
});
