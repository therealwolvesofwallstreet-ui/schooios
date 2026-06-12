// F4a NOTIFICATIONS — Tier-0 correctness + badge server-truth. Auth qua cookie (_fixtures).
// Dữ liệu route-mock để TẤT ĐỊNH (badge↓, read-all, pagination, navigation). HARD LAWS verify:
//  - đúng endpoint /api/notifications + params SERVER-DRIVEN (page/limit) — không tự lọc/sort FE
//  - badge unreadCount = server-truth (TopBar đọc /api/notifications); read-all → invalidate → badge↓0
//  - phân trang server-driven (Pager đổi `page`); điều hướng dòng-có-case → /cases/<id>
import { test, expect, authenticate, haveCreds } from "./_fixtures";
import type { NotificationDTO, NotificationType } from "../src/lib/api-types";

function mk(
  id: string,
  isRead: boolean,
  caseId: string | null,
  caseCode: string | null,
  type: NotificationType = "COMMENT_ADDED",
): NotificationDTO {
  return {
    id,
    userId: "u1",
    caseId,
    type,
    message: `Thông báo ${id}`,
    isRead,
    readAt: isRead ? "2026-06-12T01:00:00.000Z" : null,
    createdAt: "2026-06-12T00:30:00.000Z",
    case: caseId && caseCode ? { id: caseId, caseCode } : null,
  };
}

test.describe("F4a notifications correctness [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu E2E creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("endpoint+params server-driven · list · badge server-truth · read-all↓ · điều hướng", async ({
    page,
  }) => {
    let readAllDone = false;
    const seen: string[] = [];

    await page.route("**/api/notifications**", async (route) => {
      const req = route.request();
      const url = req.url();
      seen.push(`${req.method()} ${url}`);

      // PATCH read-all → đánh dấu, trả updated.
      if (url.includes("/read-all")) {
        readAllDone = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, updated: 3 }),
        });
      }

      const isBadgeProbe = url.includes("limit=1"); // TopBar badge dùng limit=1
      const unreadCount = readAllDone ? 0 : 3; // server-truth
      const list = isBadgeProbe
        ? [mk("n1", readAllDone, "case-xyz", "CASE-2026-00001")]
        : [
            mk("n1", readAllDone, "case-xyz", "CASE-2026-00001"),
            mk("n2", readAllDone, null, null, "STATUS_CHANGED"),
            mk("n3", true, "case-abc", "CASE-2026-00002", "CASE_RESOLVED"),
          ];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ notifications: list, unreadCount, total: 3, page: 1, totalPages: 1 }),
      });
    });

    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Thông báo" })).toBeVisible();

    // list render đúng 3 dòng (chờ list fetch xong TRƯỚC khi soi `seen` — tránh đua lúc chạy song song).
    await expect(page.getByTestId("notification-list").getByRole("listitem")).toHaveCount(3);

    // T0: đúng endpoint + params SERVER-DRIVEN (page=1 & limit=20 cho list).
    expect(
      seen.some((r) => /GET .*\/api\/notifications\?.*\bpage=1\b.*\blimit=20\b/.test(r)),
      "list phải gọi /api/notifications với page+limit (server-driven)",
    ).toBeTruthy();

    // badge = server-truth (3) ở TopBar + summary.
    await expect(page.getByTestId("unread-badge")).toHaveText("3");
    await expect(page.getByTestId("unread-summary")).toHaveText("3 thông báo chưa đọc.");

    // read-all → badge↓ về 0 (server-truth refetch, KHÔNG decrement cục bộ).
    await page.getByTestId("read-all").click();
    await expect(page.getByTestId("unread-badge")).toHaveCount(0);
    await expect(page.getByTestId("unread-summary")).toHaveText("Bạn đã đọc hết.");

    // điều hướng: dòng có case → /cases/<id>.
    await page.getByTestId("notification-list").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/cases\/case-/);
  });

  test("phân trang SERVER-DRIVEN: Pager đổi page → request mang page=2", async ({ page }) => {
    const seen: string[] = [];
    await page.route("**/api/notifications**", async (route) => {
      const url = route.request().url();
      seen.push(url);
      if (url.includes("/read-all")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      }
      const isBadgeProbe = url.includes("limit=1");
      const page2 = url.includes("page=2");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notifications: isBadgeProbe
            ? [mk("b", false, null, null)]
            : [mk(page2 ? "p2" : "p1", false, null, null)],
          unreadCount: 1,
          total: 40,
          page: isBadgeProbe ? 1 : page2 ? 2 : 1,
          totalPages: isBadgeProbe ? 40 : 2,
        }),
      });
    });

    await page.goto("/notifications");
    await expect(page.getByTestId("pager-next")).toBeVisible();

    const reqP = page.waitForRequest(
      (r) => r.url().includes("/api/notifications") && /\bpage=2\b/.test(r.url()),
    );
    await page.getByTestId("pager-next").click();
    await reqP; // server-driven: FE chỉ đổi page, server trả lát
  });
});
