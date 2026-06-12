// F4c POLISH shot — /queue (mock case list theo status để tự chấm signal-gutter + ledger warm refined).
// Mặc định "Đang chờ" = GỘP NEW+TRIAGED → list TRỘN: dot signal (NEW "live") xen dot gold (TRIAGED
// "đã chạm"). ADMIN xem được. 1280 + 390. KHÔNG assert — chỉ chụp để tự chấm.
import { test, authenticate, haveCreds } from "./_fixtures";
import type { CaseListItem, CaseStatus, CasePriority } from "../src/lib/api-types";

function mk(caseCode: string, title: string, status: CaseStatus, priority: CasePriority): CaseListItem {
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
    isEmergency: false,
    studentFlaggedEmergency: false,
    createdById: "u1",
    assignedToId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: "2026-06-12T00:30:00.000Z",
    updatedAt: "2026-06-12T00:45:00.000Z",
    category: { id: "cat1", name: "Cơ sở vật chất" },
    locationRef: null,
    createdBy: { id: "u1", name: "HS Trần", role: "STUDENT" },
    assignedTo: null,
  };
}

const NEW_CASES = [
  mk("CASE-2026-01256", "Vòi nước nhà vệ sinh khu B rò rỉ", "NEW", "MEDIUM"),
  mk("CASE-2026-01248", "Bàn ghế lớp 11A1 hư hỏng", "NEW", "LOW"),
];
const TRIAGED_CASES = [
  mk("CASE-2026-01242", "Mất trật tự giờ ra chơi sân sau", "TRIAGED", "HIGH"),
  mk("CASE-2026-01239", "Cửa sổ phòng thí nghiệm kẹt", "TRIAGED", "LOW"),
];

test.describe("F4c shot [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("queue shot", async ({ page }, info) => {
    await page.route("**/api/cases?**", async (route) => {
      const status = new URL(route.request().url()).searchParams.get("status");
      // "Đang chờ" mặc định = NEW,TRIAGED → trộn (cả 2 tông gutter); narrow → đúng nhóm.
      const cases =
        status === "NEW" ? NEW_CASES : status === "TRIAGED" ? TRIAGED_CASES : [...NEW_CASES, ...TRIAGED_CASES];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ cases, total: cases.length, page: 1, totalPages: 1 }),
      });
    });
    await page.goto("/queue");
    await page.getByRole("heading", { name: "Hàng chờ" }).waitFor();
    await page.getByTestId("queue-list").waitFor({ timeout: 15_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `.verify/f4c-queue-${info.project.name}.png`, fullPage: true });
  });
});
