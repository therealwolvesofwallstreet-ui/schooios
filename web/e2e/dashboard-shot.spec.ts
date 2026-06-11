// F2-4 R4 POLISH capture — full-page screenshot trang chủ theo role (reducedMotion=reduce ở config →
// animation tắt → ảnh tất định, đồng thời CHỨNG reduced-motion render tĩnh). KHÔNG pass/fail — xuất ảnh
// soi FRONTEND.md (số mono, 0 chart-junk, stagger, PulseField placeholder). Tag @role để chạy lean.
import { test, authenticate, haveCreds, type RoleKey } from "./_fixtures";

function shot(role: RoleKey, tag: string) {
  test.describe(`R4 capture [${role}]`, () => {
    test.skip(!haveCreds(role), `Thiếu creds ${role}`);
    test.beforeEach(({ context }) => authenticate(context, role));
    test(`home ${tag}`, async ({ page }) => {
      const w = page.viewportSize()?.width ?? 0;
      await page.goto("/");
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.waitForTimeout(2500); // đợi /cases|/dashboard resolve + ổn định layout/stagger (anim đã tắt)
      await page.screenshot({ path: `.verify/shots/home-${role.toLowerCase()}-${w}.png`, fullPage: true });
    });
  });
}

shot("ADMIN", "@admin");
shot("AUDITOR", "@auditor");
shot("STAFF", "@staff");
shot("STUDENT", "@student");
