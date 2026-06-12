// Probe helpers (opt-in qua test:e2e:full) — KHÔNG auto-collect (không có .spec).
//  permissionMatrix: nav hiển thị đúng theo role (luật: không được phép = KHÔNG render).
//  responsive: 0 cuộn ngang. state: empty/skeleton hiện. a11y: axe 0 vi phạm serious/critical.
import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const NAV_EXPECT: Record<string, { present: string[]; absent: string[] }> = {
  STUDENT: {
    present: ["Trang chủ", "Bảng tin", "Báo cáo của tôi", "Thông báo"],
    absent: ["Hàng chờ", "Khẩn cấp", "Nhật ký"],
  },
  STAFF: {
    present: ["Tổng quan", "Hàng chờ", "Khẩn cấp", "Thông báo"],
    absent: ["Nhật ký", "Cất tiếng nói", "Báo cáo của tôi"],
  },
  ADMIN: {
    present: ["Tổng quan", "Hàng chờ", "Khẩn cấp", "Nhật ký", "Thông báo"],
    absent: ["Cất tiếng nói", "Báo cáo của tôi"],
  },
  AUDITOR: {
    present: ["Tổng quan", "Nhật ký"],
    absent: ["Hàng chờ", "Khẩn cấp", "Cất tiếng nói", "Thông báo", "Báo cáo của tôi"],
  },
};

/** Mobile: nav nằm trong drawer — mở hamburger nếu có. Desktop: nav đã hiện. */
async function ensureNavVisible(page: Page) {
  const hamburger = page.getByRole("button", { name: "Mở điều hướng" });
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click();
  }
}

export async function permissionMatrixProbe(page: Page, role: keyof typeof NAV_EXPECT) {
  await page.goto("/");
  await ensureNavVisible(page);
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(nav).toBeVisible();
  for (const label of NAV_EXPECT[role].present) {
    await expect(nav.getByRole("link", { name: label, exact: false })).toBeVisible();
  }
  for (const label of NAV_EXPECT[role].absent) {
    await expect(nav.getByRole("link", { name: label, exact: false })).toHaveCount(0);
  }
}

export async function responsiveProbe(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "không được cuộn ngang").toBeLessThanOrEqual(1);
}

export async function stateProbe(page: Page) {
  await page.goto("/styleguide");
  await expect(page.getByText("Chưa có tiếng nói nào ở đây", { exact: false })).toBeVisible();
  await expect(page.getByText("Display · Cormorant Garamond", { exact: false })).toBeVisible();
}

export async function a11yProbe(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.getByRole("heading").first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    serious,
    `axe serious/critical: ${JSON.stringify(serious.map((v) => v.id))}`,
  ).toEqual([]);
}
