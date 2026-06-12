// F4b EMERGENCY LANE — PERMISSION + SENSITIVITY gate (rủi ro cốt lõi). Auth qua cookie (_fixtures).
// KHÔNG mock — đánh thẳng backend thật để CHỨNG MINH hợp đồng:
//   • STUDENT → /api/cases/emergency 403 + màn "ngoài quyền" (KHÔNG render lane).
//   • ADMIN/STAFF/AUDITOR → 200 + chrome "Tuyến khẩn cấp".
//   • ?activeOnly SERVER-DRIVEN: tải mặc định mang activeOnly=true; chọn "Tất cả" → request KHÔNG mang.
// Sensitivity ĐÃ gate ở server (P7: OR[isSensitive=false, assignedToId=me]) — FE chỉ render server trả.
import { test, expect, authenticate, haveCreds } from "./_fixtures";
import type { RoleKey } from "./_fixtures";

// ── 403: STUDENT không được vào tuyến khẩn ──
test.describe("F4b emergency forbidden [STUDENT]", () => {
  test.skip(!haveCreds("STUDENT"), "Thiếu E2E creds STUDENT");
  test.beforeEach(({ context }) => authenticate(context, "STUDENT"));

  test("/emergency → 403 + 'ngoài quyền' · KHÔNG render lane", async ({ page }) => {
    const respP = page.waitForResponse((r) => r.url().includes("/api/cases/emergency"));
    await page.goto("/emergency");
    const resp = await respP;
    expect(resp.status(), "STUDENT phải nhận /api/cases/emergency 403").toBe(403);

    await expect(page.getByText("ngoài quyền", { exact: false })).toBeVisible();
    await expect(
      page.getByTestId("emergency-list"),
      "KHÔNG render lane cho role không phép",
    ).toHaveCount(0);
  });
});

// ── 200: ADMIN/STAFF/AUDITOR — vào được tuyến khẩn (không 403) ──
for (const role of ["ADMIN", "STAFF", "AUDITOR"] as RoleKey[]) {
  test.describe(`F4b emergency allowed [${role}]`, () => {
    test.skip(!haveCreds(role), `Thiếu E2E creds ${role}`);
    test.beforeEach(({ context }) => authenticate(context, role));

    test("/emergency 200 · chrome khẩn · mặc định activeOnly=true", async ({ page }) => {
      const respP = page.waitForResponse((r) => r.url().includes("/api/cases/emergency"));
      await page.goto("/emergency");
      const resp = await respP;
      expect(resp.status(), `${role} phải nhận /api/cases/emergency 200`).toBe(200);
      // Tải mặc định = ĐANG MỞ → query mang activeOnly=true (server-driven).
      expect(resp.url(), "mặc định phải lọc activeOnly=true").toContain("activeOnly=true");

      await expect(page.getByRole("heading", { name: "Tuyến khẩn cấp" })).toBeVisible();
      await expect(page.getByText("ngoài quyền", { exact: false })).toHaveCount(0);
    });

    test("toggle 'Tất cả' → request KHÔNG mang activeOnly (server-driven)", async ({ page }) => {
      await page.goto("/emergency");
      await expect(page.getByRole("heading", { name: "Tuyến khẩn cấp" })).toBeVisible();

      const allReqP = page.waitForRequest(
        (r) => r.url().includes("/api/cases/emergency") && !r.url().includes("activeOnly"),
      );
      await page.getByTestId("filter-all").click();
      await allReqP;
    });
  });
}
