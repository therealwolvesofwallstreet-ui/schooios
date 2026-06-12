// E2E F2-1: lái TRỰC TIẾP trang /login + /change-password (KHÁC foundation.spec dùng request-context).
// Best-effort: thiếu ENV → skip GỌN (không fail giả). Tài khoản cơ bản = fixture (mustChangePassword=false).
// Luồng lần-đầu cần tài khoản RIÊNG còn cờ mustChangePassword=true → E2E_FIRSTLOGIN_* (tuỳ chọn).
import { test, expect } from "@playwright/test";

const PASSWORD = process.env.E2E_PASSWORD || "";
const STAFF = process.env.E2E_STAFF_EMAIL || "";
const FL_ID = process.env.E2E_FIRSTLOGIN_ID || "";
const FL_PW = process.env.E2E_FIRSTLOGIN_PASSWORD || "";

const ID_FIELD = /Số báo danh/i; // label "Số báo danh / Email"
const PW_FIELD = /^Mật khẩu$/; // label "Mật khẩu" (login)
const SUBMIT = /Bước vào/;

// F2c: /login full-motion = crossfade ẩn form tới khi cuộn (UX có chủ đích). auth.spec kiểm BẬC REDUCED
// (Landing tĩnh + form HIỆN trực tiếp, không bị landing che) — đúng cái người dùng reduce-motion thấy.
// page.emulateMedia TIN CẬY (config use.reducedMotion không tới matchMedia ở runner Next 16 này — đã probe).
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

// KHÔNG cần creds/DB — chỉ cần server chạy. Kiểm tra render + Zod mirror client + không crash.
test.describe("Login page render + client validation [F2-1]", () => {
  test("render: form gạch-chân + đúng 1 nút đỏ 'Bước vào'", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(ID_FIELD)).toBeVisible();
    await expect(page.getByLabel(PW_FIELD)).toBeVisible();
    await expect(page.getByRole("button", { name: SUBMIT })).toHaveCount(1); // CTA duy nhất
  });

  test("field rỗng → câu dịu, chặn client (không điều hướng)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: SUBMIT }).click();
    // Lỗi field hiện dưới dạng dòng dịu (ink-dim mono), KHÔNG đỏ; vẫn ở /login (chưa gọi mạng).
    await expect(page.getByText("Nhập số báo danh hoặc email.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("Login flow [F2-1]", () => {
  test.skip(!(PASSWORD && STAFF), "Thiếu E2E_PASSWORD + E2E_STAFF_EMAIL");

  test("đúng mật khẩu → điều hướng về /", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(ID_FIELD).fill(STAFF);
    await page.getByLabel(PW_FIELD).fill(PASSWORD);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page).toHaveURL(/\/$/); // rời /login, đáp "/"
  });

  test("sai mật khẩu → câu dịu (KHÔNG đỏ), ở lại /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(ID_FIELD).fill(STAFF);
    await page.getByLabel(PW_FIELD).fill("sai-mat-khau-xyz-000");
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByText(/Không khớp/)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("First-login forced change-password [F2-1]", () => {
  test.skip(!(FL_ID && FL_PW), "Thiếu E2E_FIRSTLOGIN_* (tài khoản mustChangePassword=true)");

  test("login mustChangePassword → /change-password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(ID_FIELD).fill(FL_ID);
    await page.getByLabel(PW_FIELD).fill(FL_PW);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page).toHaveURL(/\/change-password$/);
  });
});
