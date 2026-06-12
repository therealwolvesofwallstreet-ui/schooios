// F4a POLISH shots — /notifications (mock bộ dữ liệu đẹp: dấu chưa-đọc + đã-đọc) + /audit (data thật,
// ledger khắc). ADMIN xem được cả hai. 1280 (desktop) + 390 (mobile) qua 2 project. KHÔNG assert —
// chỉ chụp để tự chấm (dot tiếng-nói chưa-đọc, Audit mono khắc, tông ấm).
import { test, authenticate, haveCreds } from "./_fixtures";
import type { NotificationDTO, NotificationType } from "../src/lib/api-types";

function mk(
  id: string,
  isRead: boolean,
  caseCode: string | null,
  type: NotificationType,
  message: string,
): NotificationDTO {
  return {
    id,
    userId: "u1",
    caseId: caseCode ? `case-${id}` : null,
    type,
    message,
    isRead,
    readAt: isRead ? "2026-06-12T01:00:00.000Z" : null,
    createdAt: "2026-06-12T00:30:00.000Z",
    case: caseCode ? { id: `case-${id}`, caseCode } : null,
  };
}

test.describe("F4a shots [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("notifications shot", async ({ page }, info) => {
    await page.route("**/api/notifications**", async (route) => {
      const url = route.request().url();
      if (url.includes("/read-all"))
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      const isBadge = url.includes("limit=1");
      const list = isBadge
        ? [mk("b", false, "CASE-2026-00100", "COMMENT_ADDED", "x")]
        : [
            mk("n1", false, "CASE-2026-01253", "EMERGENCY_CONFIRMED", "Vụ khẩn vừa được xác nhận chính thức."),
            mk("n2", false, "CASE-2026-01188", "COMMENT_ADDED", "Có bình luận mới trong hồ sơ bạn theo dõi."),
            mk("n3", true, "CASE-2026-01177", "STATUS_CHANGED", "Trạng thái hồ sơ đổi sang Đang xử lý."),
            mk("n4", true, "CASE-2026-01040", "CASE_RESOLVED", "Một hồ sơ đã được giải quyết."),
          ];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ notifications: list, unreadCount: 2, total: 4, page: 1, totalPages: 1 }),
      });
    });
    await page.goto("/notifications");
    await page.getByRole("heading", { name: "Thông báo" }).waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `.verify/f4a-notifications-${info.project.name}.png`, fullPage: true });
  });

  test("audit shot", async ({ page }, info) => {
    await page.goto("/audit");
    await page.getByRole("heading", { name: "Nhật ký" }).waitFor();
    // Chờ ledger thật hiện (data thật) — không chụp skeleton.
    await page.getByTestId("audit-list").waitFor({ timeout: 15_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `.verify/f4a-audit-${info.project.name}.png`, fullPage: true });
  });
});
