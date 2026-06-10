import { defineConfig, devices } from "@playwright/test";

// E2E smoke (best-effort). Chạy: `npx playwright install chromium && npx playwright test`.
// Cần biến môi trường credential (tài khoản fixture/seed, mustChangePassword=false):
//   E2E_STUDENT_SBD, E2E_STAFF_EMAIL, E2E_ADMIN_EMAIL, E2E_PASSWORD
// Playwright tự dựng/dừng `next dev` qua webServer.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: process.env.E2E_BASE_URL || "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
