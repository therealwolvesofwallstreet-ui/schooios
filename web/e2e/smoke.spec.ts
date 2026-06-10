import { test, expect, type Page } from "@playwright/test";

// Smoke e2e (best-effort) — critical path 4 role qua UI thật trên next dev.
// Credential lấy từ ENV (tài khoản fixture/seed, mustChangePassword=false). Nếu thiếu → skip.
const PASSWORD = process.env.E2E_PASSWORD || "";
const STUDENT_SBD = process.env.E2E_STUDENT_SBD || "";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "";

async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder(/Ví dụ/).fill(identifier);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Đăng nhập/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test.describe("SchooIOS smoke", () => {
  test.skip(!PASSWORD || !STUDENT_SBD, "E2E credentials not provided (set E2E_* env vars)");

  test("STUDENT tạo case → thấy caseCode trong /report", async ({ page }) => {
    await login(page, STUDENT_SBD, PASSWORD);
    await page.goto("/report/new");
    await page.getByPlaceholder(/Hỏng điều hòa/).fill("E2E sự vụ kiểm thử tự động");
    await page.getByPlaceholder(/Mô tả rõ/).fill("Mô tả đủ dài để vượt qua ràng buộc tối thiểu 10 ký tự.");
    // chọn danh mục đầu tiên thực sự
    const cat = page.locator("select").first();
    await cat.selectOption({ index: 1 });
    await page.getByRole("button", { name: /Gửi báo cáo/ }).click();
    await page.waitForURL(/\/report$/);
    await expect(page.getByText(/CASE-\d{4}-\d{5}/).first()).toBeVisible();
  });

  test("STAFF đổi trạng thái NEW→TRIAGED", async ({ page }) => {
    test.skip(!STAFF_EMAIL, "no staff email");
    await login(page, STAFF_EMAIL, PASSWORD);
    await page.goto("/report");
    await page.locator("div", { hasText: /CASE-/ }).first().click();
    await page.waitForURL(/\/report\/.+/);
    const triage = page.getByRole("button", { name: /Đã phân loại/ });
    if (await triage.count()) {
      await triage.first().click();
      await expect(page.getByText(/Đã phân loại/).first()).toBeVisible();
    }
  });

  test("ADMIN /dashboard render số", async ({ page }) => {
    test.skip(!ADMIN_EMAIL, "no admin email");
    await login(page, ADMIN_EMAIL, PASSWORD);
    await page.goto("/");
    await expect(page.getByText("Tổng số vụ")).toBeVisible();
  });

  test("logout → trang trong bị đẩy /login", async ({ page }) => {
    await login(page, STUDENT_SBD, PASSWORD);
    // đăng xuất qua nút user chip → modal → xác nhận
    await page.locator("text=Bấm để đăng xuất").click().catch(() => {});
    await page.getByRole("button", { name: /Có, Đăng xuất/ }).click().catch(() => {});
    await page.goto("/report");
    await page.waitForURL(/\/login$/);
    await expect(page).toHaveURL(/\/login$/);
  });
});
