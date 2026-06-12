// RED-TEAM forensic probes — tấn công các vector mà case-detail.spec (happy/matrix) KHÔNG phủ:
// DOM-level leak (không chỉ visibility), double-submit dup, STAFF scope (IN_PROGRESS unassigned→404),
// + chụp các STATE còn thiếu (404/error/loading/empty/student) cho PASS3. Multi-session qua newContext.
import { test, expect, authenticate, haveCreds } from "./_fixtures";
import type { BrowserContext } from "@playwright/test";

const CASE_B = process.env.E2E_CASE_B_ID || "";
const CAT = process.env.E2E_CAT_NORMAL || "";
const INTERNAL_BODY = "[P4FX][Nội bộ] Ghi chú staff.";

async function freshCase(ctx: BrowserContext, title: string): Promise<string> {
  const res = await ctx.request.post("/api/cases", {
    data: { title, description: `${title} — mô tả đủ dài cho zod (>=10).`, categoryId: CAT },
  });
  expect(res.ok(), `freshCase HTTP ${res.status()}`).toBeTruthy();
  return ((await res.json()) as { case: { id: string } }).case.id;
}
async function myId(ctx: BrowserContext): Promise<string> {
  const res = await ctx.request.get("/api/auth/me");
  return ((await res.json()) as { user: { id: string } }).user.id;
}

// ── RT-1: STUDENT — internal comment KHÔNG nằm trong RAW DOM (không chỉ ẩn thị giác) ──
test.describe("RT-1 DOM leak [STUDENT]", () => {
  test.skip(!(haveCreds("STUDENT") && CASE_B), "creds");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));
  test("internal body tuyệt đối vắng mặt trong page.content()", async ({ page }) => {
    await page.goto(`/cases/${CASE_B}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    // RAW DOM: internal body tuyệt đối không có (mạnh hơn "ẩn thị giác").
    const html = await page.content();
    expect(html.includes(INTERNAL_BODY), "internal body leaked into raw DOM").toBeFalsy();
    // VISIBLE text: không rò chữ phân biệt quyền (403 trong hash asset/script là false-positive → dùng innerText).
    const visible = (await page.locator("body").innerText()).toLowerCase();
    expect(
      visible.includes("forbidden") || visible.includes("403") || visible.includes("không có quyền"),
      "permission wording leaked in visible text",
    ).toBeFalsy();
  });
});

// ── RT-2: double-submit comment → KHÔNG tạo bản trùng (vector click, khác retry:false) ──
test.describe("RT-2 double-submit [ADMIN]", () => {
  test.skip(!(haveCreds("ADMIN") && CAT), "creds");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));
  test("2 click đồng bộ vào 'Gửi' → đúng 1 comment", async ({ page, context }) => {
    const id = await freshCase(context, "[RT] dbl");
    await page.goto(`/cases/${id}`);
    const body = `RT-dbl-${Date.now()}`;
    await page.getByLabel("Thêm trao đổi").fill(body);
    // Bắn 2 click ĐỒNG BỘ trước khi React kịp set disabled (mô phỏng double-click thật).
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find(
        (x) => x.textContent?.trim() === "Gửi",
      ) as HTMLButtonElement | undefined;
      b?.click();
      b?.click();
    });
    await page.waitForTimeout(1800);
    const res = await context.request.get(`/api/cases/${id}`);
    const c = (await res.json()).case as { comments: { body: string }[] };
    const n = c.comments.filter((x) => x.body === body).length;
    expect(n, `số comment trùng body (mong đợi 1)`).toBe(1);
  });
});

// ── RT-3: STAFF scope — KHÔNG thấy case IN_PROGRESS không-được-giao (404 đồng nhất) ──
test.describe("RT-3 STAFF scope", () => {
  test.skip(!(haveCreds("ADMIN") && haveCreds("STAFF") && CAT), "creds");
  test("STAFF xem case IN_PROGRESS không-giao-mình → 404", async ({ browser }) => {
    const admin = await browser.newContext();
    await authenticate(admin, "ADMIN");
    const id = await freshCase(admin, "[RT] staff-scope");
    const adminId = await myId(admin);
    let r = await admin.request.patch(`/api/cases/${id}/assign`, { data: { assignedToId: adminId } });
    expect(r.ok(), `assign ${r.status()}`).toBeTruthy();
    r = await admin.request.patch(`/api/cases/${id}/status`, { data: { status: "IN_PROGRESS" } });
    expect(r.ok(), `status ${r.status()}`).toBeTruthy();
    await admin.close();

    const staff = await browser.newContext();
    await authenticate(staff, "STAFF");
    const page = await staff.newPage();
    await page.goto(`/cases/${id}`);
    await expect(page.getByText("Không tìm thấy hồ sơ này.")).toBeVisible();
    await staff.close();
  });
});

// ── RT-4: chụp STATE còn thiếu cho PASS3 — TÁCH từng test (1 capture/test, tránh timeout 60s) ──
test.describe("RT-4 capture states [ADMIN]", () => {
  test.skip(!(haveCreds("ADMIN") && CAT), "creds");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("404", async ({ page }) => {
    const w = page.viewportSize()?.width ?? 0;
    await page.goto(`/cases/zzz-nonexistent-id`);
    await page.getByText("Không tìm thấy hồ sơ này.").waitFor();
    await page.screenshot({ path: `.verify/shots/state-404-${w}.png` });
  });

  test("error 500", async ({ page, context }) => {
    const w = page.viewportSize()?.width ?? 0;
    const id = await freshCase(context, "[RT] err");
    await page.route(`**/api/cases/${id}`, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"boom"}' }),
    );
    await page.goto(`/cases/${id}`);
    await page.getByText("Không tải được hồ sơ.").waitFor();
    await page.screenshot({ path: `.verify/shots/state-error-${w}.png` });
  });

  test("loading skeleton", async ({ page, context }) => {
    const w = page.viewportSize()?.width ?? 0;
    const id = await freshCase(context, "[RT] load");
    await page.route(`**/api/cases/${id}`, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto(`/cases/${id}`, { waitUntil: "commit" });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `.verify/shots/state-loading-${w}.png` });
  });

  test("empty thread (case tươi)", async ({ page, context }) => {
    const w = page.viewportSize()?.width ?? 0;
    const id = await freshCase(context, "[RT] empty");
    await page.goto(`/cases/${id}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.screenshot({ path: `.verify/shots/state-empty-${w}.png`, fullPage: true });
  });
});

test.describe("RT-4 student-view [STUDENT]", () => {
  test.skip(!(haveCreds("STUDENT") && CASE_B), "creds");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));
  test("permission-limited view", async ({ page }) => {
    const w = page.viewportSize()?.width ?? 0;
    await page.goto(`/cases/${CASE_B}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.screenshot({ path: `.verify/shots/state-student-${w}.png`, fullPage: true });
  });
});
