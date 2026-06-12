// F4c STAFF QUEUE — CORRECTNESS: lọc + phân trang SERVER-DRIVEN (rủi ro = tin server, KHÔNG tự lọc/sort
// FE). Auth qua cookie (_fixtures). KHÔNG mock — đánh backend thật. CHỨNG MINH hợp đồng (API.md GET
// /api/cases ?status&isEmergency&page&limit; status nhận danh sách phẩy):
//   • mặc định "Đang chờ" → ?status=NEW,TRIAGED (GỘP multi-status, 1 request — KHÔNG client-merge) + page/limit.
//   • tab "Chờ tiếp nhận" → status=NEW; "Đã phân loại" → status=TRIAGED (narrow SERVER-side).
//   • chip "Chỉ khẩn" → isEmergency=true. Điều hướng hàng → /cases/[id].
import { test, expect, authenticate, haveCreds } from "./_fixtures";

// Đọc CHÍNH XÁC param status (decode) — "NEW,TRIAGED" string-contains "NEW" nên phải so khớp tuyệt đối.
const statusParam = (url: string) => new URL(url).searchParams.get("status");
const isCaseList = (url: string) => url.includes("/api/cases?");

test.describe("F4c queue correctness [STAFF]", () => {
  test.skip(!haveCreds("STAFF"), "Thiếu E2E creds STAFF");
  test.beforeEach(({ context }) => authenticate(context, "STAFF"));

  test("/queue 200 · mặc định GỘP status=NEW,TRIAGED + page/limit server-driven", async ({ page }) => {
    const respP = page.waitForResponse(
      (r) => isCaseList(r.url()) && statusParam(r.url()) === "NEW,TRIAGED",
    );
    await page.goto("/queue");
    const resp = await respP;
    expect(resp.status(), "STAFF phải nhận /api/cases 200").toBe(200);
    // Phân trang SERVER-DRIVEN: request mang page & limit (FE KHÔNG tự cắt trang).
    expect(resp.url(), "request phải mang page").toContain("page=1");
    expect(resp.url(), "request phải mang limit").toContain("limit=");

    await expect(page.getByRole("heading", { name: "Hàng chờ" })).toBeVisible();
  });

  test("tab 'Chờ tiếp nhận' → status=NEW (narrow server-driven)", async ({ page }) => {
    await page.goto("/queue");
    await expect(page.getByRole("heading", { name: "Hàng chờ" })).toBeVisible();

    const reqP = page.waitForRequest((r) => isCaseList(r.url()) && statusParam(r.url()) === "NEW");
    await page.getByTestId("filter-new").click();
    await reqP;
  });

  test("tab 'Đã phân loại' → status=TRIAGED (narrow server-driven)", async ({ page }) => {
    await page.goto("/queue");
    await expect(page.getByRole("heading", { name: "Hàng chờ" })).toBeVisible();

    const reqP = page.waitForRequest(
      (r) => isCaseList(r.url()) && statusParam(r.url()) === "TRIAGED",
    );
    await page.getByTestId("filter-triaged").click();
    await reqP;
  });

  test("chip 'Chỉ khẩn' → request mang isEmergency=true (lọc server-driven)", async ({ page }) => {
    await page.goto("/queue");
    await expect(page.getByRole("heading", { name: "Hàng chờ" })).toBeVisible();

    const emgP = page.waitForRequest(
      (r) => isCaseList(r.url()) && r.url().includes("isEmergency=true"),
    );
    await page.getByTestId("filter-emergency").click();
    await emgP;
  });

  test("hàng chờ có case NEW (fixture công khai) → click điều hướng hồ sơ", async ({ page }) => {
    await page.goto("/queue");
    await expect(page.getByRole("heading", { name: "Hàng chờ" })).toBeVisible();

    // Mặc định GỘP NEW+TRIAGED. Fixture (b) = case NEW công khai → STAFF thấy. Ledger phải có ≥1 hàng.
    const list = page.getByTestId("queue-list");
    await expect(list).toBeVisible();
    const first = list.getByRole("link").first();
    await expect(first).toHaveAttribute("href", /^\/cases\/.+/);

    await first.click();
    await expect(page, "click hàng → mở hồ sơ case").toHaveURL(/\/cases\/.+/);
  });
});
