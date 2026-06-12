// F4b POLISH shot — /emergency (mock bộ dữ liệu khẩn đẹp: vài vụ isEmergency, status khác nhau) để tự
// chấm CHROME KHẨN warm (bề mặt Depth + nhịp oxblood + Spiced Wine toggle) + spine oxblood + mono caseCode.
// ADMIN xem được. 1280 (desktop) + 390 (mobile) qua 2 project. KHÔNG assert — chỉ chụp để tự chấm.
import { test, authenticate, haveCreds } from "./_fixtures";
import type { CaseListItem, CaseStatus, CasePriority } from "../src/lib/api-types";

function mk(
  caseCode: string,
  title: string,
  status: CaseStatus,
  priority: CasePriority,
): CaseListItem {
  return {
    id: `case-${caseCode}`,
    caseCode,
    title,
    description: "—",
    location: null,
    locationId: null,
    categoryId: "cat1",
    priority,
    status,
    isSensitive: false,
    isEmergency: true,
    studentFlaggedEmergency: true,
    createdById: "u1",
    assignedToId: status === "NEW" ? null : "staff1",
    resolvedAt: null,
    closedAt: null,
    createdAt: "2026-06-12T00:30:00.000Z",
    updatedAt: "2026-06-12T00:45:00.000Z",
    category: { id: "cat1", name: "An toàn" },
    locationRef: null,
    createdBy: { id: "u1", name: "HS Nguyễn", role: "STUDENT" },
    assignedTo: status === "NEW" ? null : { id: "staff1", name: "Cô Lan" },
  };
}

test.describe("F4b shot [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("emergency shot", async ({ page }, info) => {
    await page.route("**/api/cases/emergency**", async (route) => {
      const cases = [
        mk("CASE-2026-01256", "Học sinh ngất tại sân trường khu B", "NEW", "CRITICAL"),
        mk("CASE-2026-01241", "Rò rỉ khí phòng thí nghiệm hóa", "IN_PROGRESS", "HIGH"),
        mk("CASE-2026-01199", "Ẩu đả cần can thiệp ngay", "TRIAGED", "HIGH"),
      ];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ cases, total: cases.length }),
      });
    });
    await page.goto("/emergency");
    await page.getByRole("heading", { name: "Tuyến khẩn cấp" }).waitFor();
    await page.getByTestId("emergency-list").waitFor({ timeout: 15_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `.verify/f4b-emergency-${info.project.name}.png`, fullPage: true });
  });
});
