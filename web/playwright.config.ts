import { defineConfig, devices } from "@playwright/test";

// E2E foundation (F1) — gate nhanh chạy foundation.spec; probe nặng (a11y/permission/responsive)
// chạy qua `npm run test:e2e:full`. Credential từ ENV (tài khoản fixture, mustChangePassword=false):
//   E2E_PASSWORD + E2E_STUDENT_SBD/E2E_STAFF_EMAIL/E2E_ADMIN_EMAIL/E2E_AUDITOR_EMAIL.
// reducedMotion=reduce → tắt animation (ổn định screenshot). 2 viewport: desktop 1280, mobile 390.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    // Dùng PRODUCTION server cho E2E: phục vụ build sẵn (tức thì, KHÔNG dev-overlay → screenshot
    // tất định), tránh Turbopack dev cold-compile chậm. Yêu cầu `npm run build` trước (verify loop §6).
    command: "npm run start",
    // Probe readiness ở /api/auth/me → 401 GỌN (không redirect). Root "/" trả 307→/login khiến
    // Playwright KHÔNG nhận diện server đang chạy → spawn trùng (EADDRINUSE).
    url: `${process.env.E2E_BASE_URL || "http://localhost:3000"}/api/auth/me`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
