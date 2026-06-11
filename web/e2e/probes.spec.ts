// Suite probe nặng (a11y/permission/responsive/state) — opt-in qua `npm run test:e2e:full`.
// (Gate nhanh inner-loop chỉ chạy foundation.spec.) Chạy trên cả desktop & mobile.
import { test, describeAs, authenticate, haveCreds, type RoleKey } from "./_fixtures";
import {
  permissionMatrixProbe,
  responsiveProbe,
  stateProbe,
  a11yProbe,
} from "./_probes";

const ROLES: RoleKey[] = ["STUDENT", "STAFF", "ADMIN", "AUDITOR"];

for (const role of ROLES) {
  describeAs(role, "Probes", () => {
    test("permission matrix (nav theo role)", async ({ page }) => {
      await permissionMatrixProbe(page, role);
    });
    test("responsive — 0 cuộn ngang", async ({ page }) => {
      await responsiveProbe(page);
    });
    test("a11y — 0 vi phạm serious/critical (/)", async ({ page }) => {
      await a11yProbe(page, "/");
    });
  });
}

test.describe("State + a11y styleguide", () => {
  test.skip(!haveCreds("ADMIN"), "Thiếu E2E creds cho ADMIN");
  test.beforeEach(async ({ context }) => {
    await authenticate(context, "ADMIN");
  });
  test("empty/skeleton/type ramp hiển thị", async ({ page }) => {
    await stateProbe(page);
  });
  test("a11y — 0 vi phạm serious/critical (/styleguide)", async ({ page }) => {
    await a11yProbe(page, "/styleguide");
  });
});
