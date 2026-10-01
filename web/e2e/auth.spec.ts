// E2E F2-1: lái TRỰC TIẾP trang /login + /change-password (KHÁC foundation.spec dùng request-context).
// Best-effort: thiếu ENV → skip GỌN (không fail giả). Tài khoản cơ bản = fixture (mustChangePassword=false).
// Luồng lần-đầu cần tài khoản RIÊNG còn cờ mustChangePassword=true → E2E_FIRSTLOGIN_* (tuỳ chọn).
import { test, expect, type Page } from "@playwright/test";

const PASSWORD = process.env.E2E_PASSWORD || "";
const STAFF = process.env.E2E_STAFF_EMAIL || "";
const FL_ID = process.env.E2E_FIRSTLOGIN_ID || "";
const FL_PW = process.env.E2E_FIRSTLOGIN_PASSWORD || "";

const ID_FIELD = /Số báo danh/i; // label "Số báo danh / Email"
const PW_FIELD = /^Mật khẩu$/; // label "Mật khẩu" (login)

// /login = thẻ trắng tĩnh (form hiện ngay). Nút submit chỉ có icon → tìm theo type=submit.
const submit = (page: Page) => page.locator('button[type="submit"]');

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel(ID_FIELD)).toBeVisible({ timeout: 20000 });
  await expect(submit(page)).toBeEnabled(); // chờ hydrate (nút disabled tới khi mounted)
});

// KHÔNG cần creds/DB — chỉ cần server chạy. Kiểm tra render + Zod mirror client + không crash.
test.describe("Login page render + client validation [F2-1]", () => {
  test("render: form gạch-chân + đúng 1 nút submit", async ({ page }) => {
    await expect(page.getByLabel(ID_FIELD)).toBeVisible();
    await expect(page.getByLabel(PW_FIELD)).toBeVisible();
    await expect(submit(page)).toHaveCount(1); // CTA duy nhất
    await expect(submit(page)).toHaveAttribute("aria-label", /.+/); // icon-only → có tên truy cập
  });

  test("field rỗng → câu dịu, chặn client (không điều hướng)", async ({ page }) => {
    await submit(page).click();
    // Lỗi field hiện dưới dạng dòng dịu (ink-dim mono), KHÔNG đỏ; vẫn ở /login (chưa gọi mạng).
    await expect(page.getByText("Nhập số báo danh hoặc email", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("Login flow [F2-1]", () => {
  test.skip(!(PASSWORD && STAFF), "Thiếu E2E_PASSWORD + E2E_STAFF_EMAIL");

  test("đúng mật khẩu → điều hướng về /", async ({ page }) => {
    await page.getByLabel(ID_FIELD).fill(STAFF);
    await page.getByLabel(PW_FIELD).fill(PASSWORD);
    await submit(page).click();
    await expect(page).toHaveURL(/\/$/); // rời /login, đáp "/"
  });

  test("sai mật khẩu → câu dịu (KHÔNG đỏ), ở lại /login", async ({ page }) => {
    await page.getByLabel(ID_FIELD).fill(STAFF);
    await page.getByLabel(PW_FIELD).fill("sai-mat-khau-xyz-000");
    await submit(page).click();
    await expect(page.getByText(/Không khớp/)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("First-login forced change-password [F2-1]", () => {
  test.skip(!(FL_ID && FL_PW), "Thiếu E2E_FIRSTLOGIN_* (tài khoản mustChangePassword=true)");

  test("login mustChangePassword → /change-password", async ({ page }) => {
    await page.getByLabel(ID_FIELD).fill(FL_ID);
    await page.getByLabel(PW_FIELD).fill(FL_PW);
    await submit(page).click();
    await expect(page).toHaveURL(/\/change-password$/);
  });
});
