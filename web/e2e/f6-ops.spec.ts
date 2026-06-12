// F6 ĐỢT 1 — LỚP VẬN HÀNH. Auth qua cookie (_fixtures). Đánh backend thật cho lọc/drill-down; mock
// có CHỦ ĐÍCH (/dashboard, /cases) ở vài test để TẤT ĐỊNH (chart segment, feed read-only) — KHÔNG
// phụ thuộc dữ liệu seed biến động. CHỨNG MINH: (A) /cases lọc + drill-down SERVER-DRIVEN + facet loại;
// (B) chart dashboard → /cases?status / ?category (URL đúng); (C) /desk 6 bucket + 1 fetch limit=100;
// (D) /feed read-only (KHÔNG mine, 0 nút hành động); (E) /report ?mine=true.
import { test, expect, authenticate, haveCreds } from "./_fixtures";
import type { Page } from "@playwright/test";

const CAT = process.env.E2E_CAT_NORMAL || "";

const isCaseList = (url: string) => url.includes("/api/cases?");
const statusParam = (url: string) => new URL(url).searchParams.get("status");

// Case list item tối thiểu (đủ field CaseRow/FeedRow dùng) để mock GET /api/cases tất định.
function mockCase(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "c-mock-1",
    caseCode: "CASE-2026-09001",
    title: "Vụ việc giả lập cho e2e",
    description: "mock",
    location: null,
    locationId: null,
    categoryId: "cat-x",
    priority: "MEDIUM",
    status: "NEW",
    isSensitive: false,
    isEmergency: false,
    studentFlaggedEmergency: false,
    createdById: "u-1",
    assignedToId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    category: { id: "cat-x", name: "Cơ sở vật chất" },
    locationRef: null,
    createdBy: { id: "u-1", name: "Người giả", role: "STUDENT" },
    assignedTo: null,
    ...over,
  };
}

// ─────────── A. /cases DUYỆT TẤT CẢ [ADMIN] — lọc + drill-down SERVER-DRIVEN ───────────
test.describe("A /cases duyệt tất cả [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("/cases 200 · chip trạng thái → ?status server-driven + page=1", async ({ page }) => {
    const initial = page.waitForResponse((r) => isCaseList(r.url()));
    await page.goto("/cases");
    expect((await initial).status(), "ADMIN nhận /api/cases 200").toBe(200);
    await expect(page.getByRole("heading", { name: "Tất cả vụ việc" })).toBeVisible();

    const reqP = page.waitForRequest(
      (r) => isCaseList(r.url()) && statusParam(r.url()) === "NEW" && r.url().includes("page=1"),
    );
    await page.getByTestId("filter-new").click();
    await reqP;
  });

  test("drill-down ?status=TRIAGED → mở sẵn filter + request mang status=TRIAGED", async ({ page }) => {
    const reqP = page.waitForRequest((r) => isCaseList(r.url()) && statusParam(r.url()) === "TRIAGED");
    await page.goto("/cases?status=TRIAGED");
    await reqP;
    await expect(page.getByTestId("filter-triaged")).toHaveAttribute("aria-pressed", "true");
  });

  test("drill-down ?emergency=true → chip khẩn active + request isEmergency=true", async ({ page }) => {
    const reqP = page.waitForRequest((r) => isCaseList(r.url()) && r.url().includes("isEmergency=true"));
    await page.goto("/cases?emergency=true");
    await reqP;
    await expect(page.getByTestId("filter-emergency")).toHaveAttribute("aria-pressed", "true");
  });

  test("facet ?category → fetch limit=100 + chip 'Loại:' + note lát hiện tại", async ({ page }) => {
    test.skip(!CAT, "Thiếu E2E_CAT_NORMAL");
    const reqP = page.waitForRequest((r) => isCaseList(r.url()) && r.url().includes("limit=100"));
    await page.goto(`/cases?category=${encodeURIComponent(CAT)}&cat=${encodeURIComponent("Cơ sở vật chất")}`);
    await reqP;
    await expect(page.getByTestId("facet-category")).toBeVisible();
    await expect(page.getByText("Lọc theo loại trên trang hiện tại")).toBeVisible();
  });
});

// ─────────── B. DASHBOARD CHART → DRILL-DOWN [ADMIN] (mock /dashboard cho tất định) ───────────
test.describe("B dashboard chart drill-down [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  async function mockDashboard(page: Page) {
    await page.route("**/api/dashboard", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalCases: 8,
          newToday: 2,
          emergencyOpen: 0,
          unassigned: 3,
          stale: 1,
          byStatus: [
            { status: "NEW", _count: 5 },
            { status: "RESOLVED", _count: 3 },
          ],
          byPriority: [{ priority: "HIGH", _count: 8 }],
          byCategory: [{ categoryId: "cat-x", name: "Cơ sở vật chất", count: 6 }],
          byLocation: [],
          unlocated: 8,
        }),
      }),
    );
  }

  test("chart-status: đoạn NEW → /cases?status=NEW", async ({ page }) => {
    await mockDashboard(page);
    await page.goto("/");
    await page.getByTestId("memorial-numbers").waitFor();
    const seg = page.getByTestId("chart-status").locator('a[href="/cases?status=NEW"]');
    await expect(seg).toBeVisible();
    await seg.click();
    await expect(page).toHaveURL(/\/cases\?status=NEW/);
  });

  test("chart-category: hàng → /cases?category=…&cat=…", async ({ page }) => {
    await mockDashboard(page);
    await page.goto("/");
    await page.getByTestId("chart-category").waitFor();
    const row = page.getByTestId("chart-category").locator('a[href*="category=cat-x"]');
    await expect(row).toBeVisible();
    await row.click();
    await expect(page).toHaveURL(/\/cases\?category=cat-x&cat=/);
  });
});

// ─────────── C. /desk MY DESK [STAFF] — 6 bucket + 1 fetch limit=100 ───────────
test.describe("C /desk my desk [STAFF]", () => {
  test.skip(!haveCreds("STAFF"), "Thiếu E2E creds STAFF");
  test.beforeEach(({ context }) => authenticate(context, "STAFF"));

  test("/desk 200 · fetch limit=100 · 6 bucket render", async ({ page }) => {
    const reqP = page.waitForRequest((r) => isCaseList(r.url()) && r.url().includes("limit=100"));
    await page.goto("/desk");
    await reqP;
    await expect(page.getByRole("heading", { name: "Bàn làm việc" })).toBeVisible();
    for (const k of ["assigned", "waiting", "priority", "emergency", "stale", "unclaimed"]) {
      await expect(page.getByTestId(`desk-bucket-${k}`)).toBeVisible();
    }
  });
});

// ─────────── D. /feed STUDENT READ-ONLY (mock /cases cho tất định) ───────────
test.describe("D /feed read-only [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu E2E creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("/feed KHÔNG gửi mine · hàng là LINK · 0 nút hành động", async ({ page }) => {
    // KHÔNG mine: feed = công khai ∪ của-mình (khác /report mine:true).
    const reqP = page.waitForRequest(
      (r) => isCaseList(r.url()) && !r.url().includes("mine=true"),
    );
    await page.route(/\/api\/cases\?/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cases: [mockCase({ id: "f1", caseCode: "CASE-2026-09100" }), mockCase({ id: "f2", caseCode: "CASE-2026-09101", status: "RESOLVED" })],
          total: 2,
          page: 1,
          totalPages: 1,
        }),
      }),
    );
    await page.goto("/feed");
    await reqP;
    await expect(page.getByRole("heading", { name: "Bảng tin" })).toBeVisible();

    const list = page.getByTestId("feed-list");
    await expect(list).toBeVisible();
    await expect(list.getByRole("link").first()).toHaveAttribute("href", /^\/cases\/.+/);
    // READ-ONLY: KHÔNG nút hành động trong dòng tin.
    await expect(list.getByRole("button")).toHaveCount(0);
  });
});

// ─────────── E. /report ?mine=true [STUDENT] ───────────
test.describe("E /report mine [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu E2E creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("/report → request mang mine=true (chỉ của mình)", async ({ page }) => {
    const reqP = page.waitForRequest((r) => isCaseList(r.url()) && r.url().includes("mine=true"));
    await page.goto("/report");
    await reqP;
    await expect(page.getByRole("heading", { name: "Báo cáo của tôi" })).toBeVisible();
  });
});
