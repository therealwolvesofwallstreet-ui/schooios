// UPDATE D — LocationPicker (dropdown phân cấp + bản đồ tương tác). Auth cookie STUDENT (_fixtures).
// CHỨNG MINH: cả 2 path set ĐÚNG `locationId` THẬT vào POST /api/cases (đối chiếu /api/locations);
// map building-area → mở nhóm dropdown đúng; map decorative-area → no-op; mobile 390 usable.
// Chạy ở CẢ desktop(1280) + mobile(390) → 390 được kiểm tự nhiên qua project mobile + screenshot.
import { test, expect, haveCreds, authenticate } from "./_fixtures";
import type { Page } from "@playwright/test";

const POST_CASES = (r: { url(): string; request(): { method(): string } }) =>
  r.url().endsWith("/api/cases") && r.request().method() === "POST";

async function locationsByCode(page: Page) {
  const res = await page.request.get("/api/locations");
  expect(res.ok(), "GET /api/locations OK").toBeTruthy();
  const { locations } = (await res.json()) as {
    locations: Array<{ id: string; code: string; name: string; buildingId: string | null }>;
  };
  const m = new Map<string, { id: string; code: string; name: string; buildingId: string | null }>();
  for (const l of locations) m.set(l.code, l);
  return m;
}

// Điền bước 0 (title/desc) + bước 1 (category) → dừng ở bước 2 (LocationPicker).
async function gotoLocationStep(page: Page) {
  await page.goto("/report/new");
  await page.getByLabel("Tiêu đề ngắn").fill("[UPDATE-D] Kiểm thử chọn địa điểm");
  await page.getByLabel("Kể lại chi tiết").fill("Mô tả đủ dài cho kiểm thử e2e Update D.");
  await page.getByRole("button", { name: "Tiếp" }).click();
  await page.getByRole("radio").first().click(); // category bất kỳ
  await page.getByRole("button", { name: "Tiếp" }).click();
  await expect(page.getByRole("group", { name: "Cách chọn địa điểm" })).toBeVisible();
}

// Bước 2 đã chọn location → sang bước 3 → "Báo cáo"; trả về { status, payload } của POST /api/cases.
async function advanceAndSubmit(page: Page) {
  await page.getByRole("button", { name: "Tiếp" }).click(); // → bước 3
  const respP = page.waitForResponse(POST_CASES);
  await page.getByRole("button", { name: "Báo cáo" }).click();
  const resp = await respP;
  return { status: resp.status(), payload: resp.request().postDataJSON() as { locationId?: string } };
}

test.describe("UPDATE D · LocationPicker [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu E2E creds STUDENT (set E2E_* env)");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("dropdown: mở nhóm tòa → chọn phòng → locationId THẬT đúng", async ({ page }) => {
    const locs = await locationsByCode(page);
    const a11 = locs.get("A1.1");
    expect(a11, "fixture có location A1.1").toBeTruthy();

    await gotoLocationStep(page);
    await page.getByRole("button", { name: /^Dãy A/ }).click(); // accordion mở
    await page.getByRole("radio", { name: /Phòng A1\.1/ }).click();
    await expect(page.getByTestId("location-summary")).toContainText("Phòng A1.1");

    const { status, payload } = await advanceAndSubmit(page);
    expect(status, "POST /api/cases 201").toBe(201);
    expect(payload.locationId, "gửi đúng id A1.1").toBe(a11!.id);
  });

  test("bản đồ: khu độc lập (Sân bóng đá) → chọn luôn locationId THẬT đúng", async ({ page }) => {
    const locs = await locationsByCode(page);
    const soccer = locs.get("SOCCER-1");
    expect(soccer, "fixture có SOCCER-1").toBeTruthy();

    await gotoLocationStep(page);
    await page.getByRole("button", { name: "Bản đồ" }).click();
    await page.locator('[data-area="football"]').click();
    await expect(page.getByTestId("location-summary")).toContainText(soccer!.name);

    const { status, payload } = await advanceAndSubmit(page);
    expect(status).toBe(201);
    expect(payload.locationId, "gửi đúng id SOCCER-1").toBe(soccer!.id);
  });

  test("bản đồ: khu-tòa (Dãy A) → mở nhóm Danh sách đúng → chọn phòng", async ({ page }) => {
    const locs = await locationsByCode(page);
    const a11 = locs.get("A1.1");

    await gotoLocationStep(page);
    await page.getByRole("button", { name: "Bản đồ" }).click();
    await page.locator('[data-area="block-a"]').click();

    // Liên kết 2 path: về "Danh sách" + nhóm Dãy A mở sẵn.
    await expect(page.getByRole("button", { name: "Danh sách" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: /^Dãy A/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page.getByRole("radio", { name: /Phòng A1\.1/ }).click();
    await expect(page.getByTestId("location-summary")).toContainText("Phòng A1.1");

    const { status, payload } = await advanceAndSubmit(page);
    expect(status).toBe(201);
    expect(payload.locationId).toBe(a11!.id);
  });

  test("bản đồ: khu trang trí → KHÔNG chọn được (no-op)", async ({ page }) => {
    await gotoLocationStep(page);
    await page.getByRole("button", { name: "Bản đồ" }).click();

    const decor = page.locator('[data-area="flagpole"]');
    await expect(decor).toHaveAttribute("data-decorative", "true");
    await expect(decor).toHaveAttribute("aria-hidden", "true");
    await decor.click({ force: true }); // pointer-events:none → không chọn
    await expect(page.getByTestId("location-summary")).toHaveCount(0);
  });

  test("step 2 picker render (evidence 1280 + 390)", async ({ page }, testInfo) => {
    await gotoLocationStep(page);
    await page.getByRole("button", { name: "Bản đồ" }).click();
    await expect(page.locator('[data-area="football"]')).toBeVisible();
    await page.screenshot({ path: `.verify/D-picker-${testInfo.project.name}.png` });
  });
});
