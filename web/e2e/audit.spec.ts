// F4a AUDIT — PERMISSION gate (rủi ro cốt lõi). Auth qua cookie (_fixtures). KHÔNG mock — đánh thẳng
// backend thật để CHỨNG MINH hợp đồng: STUDENT/STAFF → /api/audit 403 + màn "ngoài quyền" (KHÔNG render
// log); ADMIN/AUDITOR → 200 + ledger. Filter SERVER-DRIVEN: "Áp dụng" → request mang entityType.
import { test, expect, authenticate, haveCreds } from "./_fixtures";
import type { RoleKey } from "./_fixtures";

// ── 403: STUDENT & STAFF không được xem nhật ký ──
for (const role of ["STUDENT", "STAFF"] as RoleKey[]) {
  test.describe(`F4a audit forbidden [${role}]`, () => {
    test.skip(!haveCreds(role), `Thiếu E2E creds ${role}`);
    test.beforeEach(({ context }) => authenticate(context, role));

    test("/audit → 403 + 'ngoài quyền' · KHÔNG render log", async ({ page }) => {
      const respP = page.waitForResponse((r) => r.url().includes("/api/audit"));
      await page.goto("/audit");
      const resp = await respP;
      expect(resp.status(), `${role} phải nhận /api/audit 403`).toBe(403);

      await expect(page.getByText("ngoài quyền", { exact: false })).toBeVisible();
      await expect(page.getByTestId("audit-list"), "KHÔNG render log cho role không phép").toHaveCount(
        0,
      );
    });
  });
}

// ── 200: ADMIN — ledger + filter server-driven ──
test.describe("F4a audit correctness [ADMIN]", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds ADMIN");
  test.beforeEach(({ context }) => authenticate(context, "ADMIN"));

  test("/audit 200 · heading · filter entityType server-driven", async ({ page }) => {
    const respP = page.waitForResponse((r) => r.url().includes("/api/audit"));
    await page.goto("/audit");
    const resp = await respP;
    expect(resp.status(), "ADMIN phải nhận /api/audit 200").toBe(200);

    await expect(page.getByRole("heading", { name: "Nhật ký" })).toBeVisible();
    await expect(page.getByText("ngoài quyền", { exact: false })).toHaveCount(0);

    // Filter SERVER-DRIVEN: gõ entityType → "Áp dụng" → request mang entityType=Case.
    const filteredP = page.waitForRequest(
      (r) => r.url().includes("/api/audit") && r.url().includes("entityType=Case"),
    );
    await page.getByTestId("filter-entity-type").fill("Case");
    await page.getByRole("button", { name: "Áp dụng" }).click();
    await filteredP;
  });
});

// ── 200: AUDITOR — chỉ-xem, vẫn thấy ledger (không 403) ──
test.describe("F4a audit correctness [AUDITOR]", () => {
  test.skip(!haveCreds("AUDITOR"), "Thiếu E2E creds AUDITOR");
  test.beforeEach(({ context }) => authenticate(context, "AUDITOR"));

  test("/audit 200 · heading · KHÔNG 'ngoài quyền'", async ({ page }) => {
    const respP = page.waitForResponse((r) => r.url().includes("/api/audit"));
    await page.goto("/audit");
    const resp = await respP;
    expect(resp.status(), "AUDITOR phải nhận /api/audit 200").toBe(200);
    await expect(page.getByRole("heading", { name: "Nhật ký" })).toBeVisible();
    await expect(page.getByText("ngoài quyền", { exact: false })).toHaveCount(0);
  });
});
