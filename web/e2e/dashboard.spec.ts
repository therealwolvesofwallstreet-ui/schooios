// F2-4 DASHBOARD — Tier-0 correctness + red-team. Auth qua cookie (_fixtures). Tự skip nếu thiếu creds.
// HARD LAWS verify: (R2) /dashboard CHỈ ADMIN/AUDITOR · STAFF/STUDENT = 0 call /dashboard · đọc đúng
// _count vs count · STUDENT recent chỉ createdById=me (không nới list). (R3) role-switch không giữ
// metric · no-flash · partial-response không crash · empty RIÊNG mỗi role.
import { test, expect, authenticate, haveCreds } from "./_fixtures";
import type { Page } from "@playwright/test";

const CAT = process.env.E2E_CAT_NORMAL || "";

// Đếm MỌI request chạm /api/dashboard trong suốt phiên (kể cả refetch nền).
function trackDashboard(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/dashboard")) calls.push(r.url());
  });
  return calls;
}

// ── R2: ADMIN — /dashboard 200, đọc _count vs count, 0 undefined ──
test.describe("R2 dashboard correctness [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("dashboard 200 · số mono · ledger _count/count · 0 undefined", async ({ page }) => {
    let dashStatus = 0;
    page.on("response", (res) => {
      if (res.url().includes("/api/dashboard")) dashStatus = res.status();
    });
    await page.goto("/");
    await page.getByTestId("memorial-numbers").waitFor();
    expect(dashStatus, "ADMIN phải nhận /dashboard 200").toBe(200);

    // Số đài-kỷ-niệm là số thật (đọc đúng key tổng); ledger đọc _count → ra số (không rỗng-vô-cớ).
    const mem = await page.getByTestId("memorial-numbers").innerText();
    expect(mem, "memorial numbers phải có chữ số").toMatch(/\d/);
    await expect(page.getByText("Theo trạng thái")).toBeVisible();
    await expect(page.getByText("Theo mức ưu tiên")).toBeVisible();

    // 0 undefined/NaN lọt DOM nhìn thấy (đọc nhầm _count↔count sẽ ra undefined).
    const body = await page.locator("body").innerText();
    expect(body, "không undefined/NaN trong DOM").not.toMatch(/undefined|NaN/);
  });
});

// ── R2: AUDITOR — /dashboard 200, read-only (chế độ chỉ xem) ──
test.describe("R2 dashboard correctness [AUDITOR]", () => {
  test.skip(!haveCreds("AUDITOR"), "Thiếu E2E creds AUDITOR");
  test.beforeEach(({ context }) => authenticate(context, "AUDITOR"));

  test("AUDITOR thấy metric + nhãn chỉ-xem · 0 undefined", async ({ page }) => {
    let dashStatus = 0;
    page.on("response", (res) => {
      if (res.url().includes("/api/dashboard")) dashStatus = res.status();
    });
    await page.goto("/");
    await page.getByTestId("memorial-numbers").waitFor();
    expect(dashStatus).toBe(200);
    await expect(page.getByText("Chế độ chỉ xem", { exact: false })).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/undefined|NaN/);
  });
});

// ── R2: STAFF — 0 call /dashboard + đúng 2 bucket ──
test.describe("R2 staff buckets [STAFF]", () => {
  test.skip(!haveCreds("STAFF"), "Thiếu E2E creds STAFF");
  test.beforeEach(({ context }) => authenticate(context, "STAFF"));

  test("0 call /dashboard · bucket 'Vụ của tôi' + 'Đang chờ nhận'", async ({ page }) => {
    const calls = trackDashboard(page);
    await page.goto("/");
    await page.getByRole("heading", { name: "Bàn điều phối của bạn" }).waitFor();
    await expect(page.getByTestId("bucket-mine")).toBeVisible();
    await expect(page.getByTestId("bucket-waiting")).toBeVisible();
    await expect(page.getByTestId("memorial-numbers")).toHaveCount(0);
    await page.waitForTimeout(600); // bắt cả refetch nền nếu có
    expect(calls, "STAFF TUYỆT ĐỐI không gọi /dashboard").toHaveLength(0);
  });
});

// ── R2: STUDENT — 0 call /dashboard + recent CHỈ createdById=me (không render công khai như "của tôi") ──
test.describe("R2 student semantics [STUDENT]", () => {
  test.skip(!(haveCreds("STUDENT") && haveCreds("ADMIN") && CAT), "Thiếu creds/CAT");

  test("recent KHÔNG chứa case công khai do người khác tạo · 0 call /dashboard", async ({
    page,
    browser,
  }) => {
    // ADMIN tạo 1 case CÔNG KHAI (createdById=admin) → vào union /cases của STUDENT nhưng KHÔNG phải "của tôi".
    const admin = await browser.newContext();
    await authenticate(admin, "ADMIN");
    const ts = `${page.url()}-${process.pid}`;
    const res = await admin.request.post("/api/cases", {
      data: {
        title: `[F24] công khai không-của-tôi ${ts}`,
        description: "Case công khai do admin tạo — KHÔNG được xuất hiện trong 'của tôi' của HS.",
        categoryId: CAT,
      },
    });
    expect(res.ok(), `tạo case HTTP ${res.status()}`).toBeTruthy();
    const adminCode = ((await res.json()) as { case: { caseCode: string } }).case.caseCode;
    await admin.close();

    const calls = trackDashboard(page);
    const ctx = page.context();
    await authenticate(ctx, "STUDENT");
    await page.goto("/");
    await page.getByText("Hoạt động gần đây của bạn").waitFor();
    await page.waitForTimeout(400);

    // 0 call /dashboard cho STUDENT.
    expect(calls, "STUDENT TUYỆT ĐỐI không gọi /dashboard").toHaveLength(0);

    // Case công khai của admin KHÔNG nằm trong section recent (đã lọc createdById=me).
    const recent = await page.getByTestId("student-recent").innerText();
    expect(recent.includes(adminCode), `case người khác (${adminCode}) rò vào 'của tôi'`).toBeFalsy();
  });
});

// ── R3a ROLE-SWITCH: ADMIN(thấy số) → logout → STUDENT: không giữ metric + 0 call /dashboard ──
test.describe("R3a role-switch dashboard surface", () => {
  test.skip(!(haveCreds("ADMIN") && haveCreds("STUDENT")), "Thiếu creds ADMIN/STUDENT");

  test("ADMIN→STUDENT: metric biến mất + 0 call /dashboard khi là STUDENT", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await authenticate(ctx, "ADMIN");
    await page.goto("/");
    await page.getByTestId("memorial-numbers").waitFor(); // ADMIN thấy số

    // Mô phỏng logout→login khác role: xoá cookie cũ + nạp cookie STUDENT (full reload qua goto).
    await ctx.clearCookies();
    await authenticate(ctx, "STUDENT");
    const calls = trackDashboard(page);
    await page.goto("/");
    await page.getByText("Hoạt động gần đây của bạn").waitFor();
    await page.waitForTimeout(500);

    await expect(page.getByTestId("memorial-numbers"), "metric role cũ còn sót").toHaveCount(0);
    expect(calls, "STUDENT không được gọi /dashboard").toHaveLength(0);
    await ctx.close();
  });
});

// ── R3b NO-FLASH: metric testid vắng trước khi /me resolve (gate skeleton) ──
test.describe("R3b no-flash [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("đang loading: home-skeleton hiện · memorial-numbers chưa · không lộ số", async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.continue();
    });
    await page.goto("/", { waitUntil: "commit" });
    await page.getByTestId("home-skeleton").waitFor();
    await expect(page.getByTestId("memorial-numbers")).toHaveCount(0);
    const txt = await page.locator("body").innerText();
    expect(txt, "không số nào lộ khi đang loading").not.toMatch(/undefined|NaN/);
    // sau khi resolve → metric mới xuất hiện.
    await page.getByTestId("memorial-numbers").waitFor();
  });
});

// ── R3c PARTIAL RESPONSE: thiếu byStatus + bỏ field count → EmptyState ô đó, 0 undefined, không crash ──
test.describe("R3c partial response [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("byStatus thiếu + byCategory bỏ count → ledger EmptyState, 0 undefined", async ({ page }) => {
    await page.route("**/api/dashboard", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalCases: 3,
          newToday: 1,
          emergencyOpen: 0,
          unassigned: 2,
          stale: 0,
          // byStatus CỐ TÌNH THIẾU
          byPriority: [{ priority: "HIGH", _count: 2 }],
          byCategory: [{ categoryId: "x", name: "Cơ sở vật chất" /* count THIẾU */ }],
          byLocation: [],
          unlocated: 1,
        }),
      }),
    );
    await page.goto("/");
    await page.getByTestId("memorial-numbers").waitFor();
    // byStatus thiếu → ledger "Theo trạng thái" ra EmptyState (calm), không sập.
    await expect(page.getByText("Theo trạng thái")).toBeVisible();
    await expect(page.getByText("Chưa có dữ liệu.").first()).toBeVisible();
    // không crash: heading còn nguyên + 0 undefined (byCategory thiếu count → 0).
    await expect(page.getByRole("heading", { name: "Đài quan sát" })).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/undefined|NaN/);
  });
});

// ── R3d EMPTY KHÁC NHAU: STUDENT no-recent vs STAFF no-assigned vs STAFF no-waiting (route-mock /cases) ──
const EMPTY_LIST = JSON.stringify({ cases: [], total: 0, page: 1, totalPages: 1 });

test.describe("R3d empty student [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));
  test("cases=[] → 'Chưa có hoạt động gần đây.'", async ({ page }) => {
    await page.route(/\/api\/cases\?/, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: EMPTY_LIST }),
    );
    await page.goto("/");
    await expect(page.getByText("Chưa có hoạt động gần đây.")).toBeVisible();
  });
});

test.describe("R3d empty staff [STAFF]", () => {
  test.skip(!haveCreds("STAFF"), "Thiếu creds STAFF");
  test.beforeEach(({ context }) => authenticate(context, "STAFF"));
  test("cases=[] → 2 thông điệp PHÂN BIỆT", async ({ page }) => {
    await page.route(/\/api\/cases\?/, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: EMPTY_LIST }),
    );
    await page.goto("/");
    await expect(page.getByText("Bạn chưa nhận vụ nào.")).toBeVisible();
    await expect(page.getByText("Không có vụ nào đang chờ.")).toBeVisible();
  });
});
