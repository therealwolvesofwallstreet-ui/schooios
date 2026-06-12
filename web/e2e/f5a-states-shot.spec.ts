// F5a — STATE SYSTEM shots. Chặn network (route.fulfill) ÉP từng trạng thái logic trên surface đại
// diện, chụp ở 1280+390 (2 project). KHÔNG assert — chụp để chấm warm + xác nhận 1 GIỌNG (states.tsx
// SSOT): empty serif · loading khối-thở · error ink-dim mono "Thử lại" (KHÔNG đỏ) · permission/404 điềm
// tĩnh KHÔNG lộ role. Bao gồm 2 thay đổi F5a: /report AUDITOR → PermissionDenied(detail); ChoiceList
// lỗi → ErrorState compact nội tuyến. Paths lấy từ hooks (useAudit/useNotifications/useCaseDetail/...).
import { test, authenticate, haveCreds } from "./_fixtures";

const json = (status: number, body: unknown) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

// ── LIST surface = /notifications (STUDENT): empty · error · loading ──
test.describe("F5a list states [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu E2E creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("notifications EMPTY", async ({ page }, info) => {
    await page.route("**/api/notifications**", (r) =>
      r.fulfill(json(200, { notifications: [], unreadCount: 0, total: 0, page: 1, totalPages: 1 })),
    );
    await page.goto("/notifications");
    await page.getByText("Chưa có thông báo nào.").waitFor();
    await page.screenshot({ path: `.verify/f5a-notifications-empty-${info.project.name}.png`, fullPage: true });
  });

  test("notifications ERROR", async ({ page }, info) => {
    await page.route("**/api/notifications**", (r) => r.fulfill(json(500, { error: "boom" })));
    await page.goto("/notifications");
    await page.getByRole("button", { name: "Thử lại" }).waitFor();
    await page.screenshot({ path: `.verify/f5a-notifications-error-${info.project.name}.png`, fullPage: true });
  });

  test("notifications LOADING", async ({ page }, info) => {
    await page.route("**/api/notifications**", async (r) => {
      await new Promise((res) => setTimeout(res, 4000));
      await r.fulfill(json(200, { notifications: [], unreadCount: 0, total: 0, page: 1, totalPages: 1 }));
    });
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `.verify/f5a-notifications-loading-${info.project.name}.png`, fullPage: true });
  });
});

// ── DETAIL surface = /cases/<id> (STUDENT): 404 đồng nhất · error · loading ──
test.describe("F5a detail states [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu E2E creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("detail NOTFOUND (404 unified)", async ({ page }, info) => {
    await page.route("**/api/cases/state-probe", (r) => r.fulfill(json(404, { error: "Not found" })));
    await page.goto("/cases/state-probe");
    await page.getByRole("heading", { name: "Không tìm thấy hồ sơ này." }).waitFor();
    await page.screenshot({ path: `.verify/f5a-detail-notfound-${info.project.name}.png`, fullPage: true });
  });

  test("detail ERROR", async ({ page }, info) => {
    await page.route("**/api/cases/state-probe", (r) => r.fulfill(json(500, { error: "boom" })));
    await page.goto("/cases/state-probe");
    await page.getByRole("button", { name: "Thử lại" }).waitFor();
    await page.screenshot({ path: `.verify/f5a-detail-error-${info.project.name}.png`, fullPage: true });
  });

  test("detail LOADING", async ({ page }, info) => {
    await page.route("**/api/cases/state-probe", async (r) => {
      await new Promise((res) => setTimeout(res, 4000));
      await r.fulfill(json(200, {}));
    });
    await page.goto("/cases/state-probe", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `.verify/f5a-detail-loading-${info.project.name}.png`, fullPage: true });
  });
});

// ── PERMISSION surface = /audit 403 → PermissionDenied (ADMIN, server là chân lý) ──
test.describe("F5a permission state [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("audit PERMISSION (403)", async ({ page }, info) => {
    await page.route("**/api/audit**", (r) => r.fulfill(json(403, { error: "Forbidden" })));
    await page.goto("/audit");
    await page.getByRole("heading", { name: "Mục này nằm ngoài quyền của bạn." }).waitFor();
    await page.screenshot({ path: `.verify/f5a-audit-permission-${info.project.name}.png`, fullPage: true });
  });
});

// ── F5a change #1: /report AUDITOR → PermissionDenied(detail contextual) ──
test.describe("F5a report permission [AUDITOR]", () => {
  test.skip(!haveCreds("AUDITOR"), "Thiếu E2E creds AUDITOR");
  test.beforeEach(({ context }) => authenticate(context, "AUDITOR"));

  test("report AUDITOR PermissionDenied", async ({ page }, info) => {
    await page.goto("/report/new");
    await page.getByRole("heading", { name: "Mục này dành cho người cất tiếng nói." }).waitFor();
    await page.screenshot({ path: `.verify/f5a-report-auditor-${info.project.name}.png`, fullPage: true });
  });
});

// ── F5a change #2: ChoiceList lỗi danh mục → ErrorState compact nội tuyến (STUDENT) ──
test.describe("F5a report inline error [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu E2E creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("report ChoiceList compact ErrorState", async ({ page }, info) => {
    await page.route("**/api/categories**", (r) => r.fulfill(json(500, { error: "boom" })));
    await page.goto("/report/new");
    await page.getByLabel("Tiêu đề ngắn").fill("Sự cố trong lớp học");
    await page.getByLabel("Kể lại chi tiết").fill("Mô tả chi tiết sự việc đã xảy ra hôm nay.");
    await page.getByRole("button", { name: "Tiếp" }).click();
    await page.getByText("Không tải được danh sách.").waitFor({ timeout: 20_000 });
    await page.screenshot({ path: `.verify/f5a-report-choicelist-error-${info.project.name}.png`, fullPage: true });
  });
});
