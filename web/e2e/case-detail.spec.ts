// E2E F2-3 — Case Detail + The Spine. Tier-0 (quyền/state-machine/409/internal) verify nặng nhất.
// Dùng _fixtures (login cookie-inject 4 role) + case fixture P4 (cases-fixture.ts) truyền qua ENV:
//   E2E_CASE_B_ID  = case THƯỜNG của student1, có 1 comment NỘI BỘ + 1 công khai, status NEW
//   E2E_CASE_A_ID  = case NHẠY CẢM của student2 (student1 KHÔNG được thấy → 404 đồng nhất)
//   E2E_CASE_C_ID  = case đã xoá mềm (mọi role → 404)
//   E2E_CAT_NORMAL = category id để tạo case TƯƠI cho test mutation (không đụng fixture đọc).
// Thiếu ENV → skip GỌN. Mutation chạy trên case TƯƠI (tạo qua API) để KHÔNG làm bẩn case đọc.
import {
  test,
  expect,
  authenticate,
  haveCreds,
  type RoleKey,
} from "./_fixtures";
import type { BrowserContext } from "@playwright/test";

const CASE_B = process.env.E2E_CASE_B_ID || "";
const CASE_A = process.env.E2E_CASE_A_ID || "";
const CASE_C = process.env.E2E_CASE_C_ID || "";
const CAT = process.env.E2E_CAT_NORMAL || "";

const PANEL = "Hành động";
const INTERNAL_BODY = "[P4FX][Nội bộ] Ghi chú staff.";
const PUBLIC_BODY = "[P4FX] Bình luận công khai.";

// Tạo 1 case TƯƠI (status NEW) bằng quyền của context đã đăng nhập → trả id. Cho test mutation.
async function freshCase(ctx: BrowserContext, title: string): Promise<string> {
  const res = await ctx.request.post("/api/cases", {
    data: { title, description: `${title} — mô tả đủ dài cho zod (>=10).`, categoryId: CAT },
  });
  expect(res.ok(), `tạo case tươi thất bại: HTTP ${res.status()}`).toBeTruthy();
  const json = (await res.json()) as { case: { id: string } };
  return json.case.id;
}

// ───────────────────────── R1 SHAPE + happy-path (ADMIN) ─────────────────────────
test.describe("R1 SHAPE — render + Spine + 1 transition [ADMIN]", () => {
  test.skip(!(haveCreds("ADMIN") && CASE_B && CAT), "Thiếu E2E creds/ID");
  test.beforeEach(async ({ context }) => authenticate(context, "ADMIN"));

  test("detail render dữ liệu thật + Spine gộp origin/comment", async ({ page }) => {
    await page.goto(`/cases/${CASE_B}`);
    await expect(page.getByText(/CASE-\d{4}-\d+/)).toBeVisible(); // caseCode mono
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); // title serif
    await expect(page.getByText("Chờ tiếp nhận")).toBeVisible(); // StatusPill NEW
    // Spine: origin (mô tả) + comment công khai + comment nội bộ (ADMIN thấy).
    await expect(page.getByText(PUBLIC_BODY)).toBeVisible();
    await expect(page.getByText(INTERNAL_BODY)).toBeVisible();
    await expect(page.getByText("Nội bộ", { exact: true }).first()).toBeVisible(); // tag NỘI BỘ (không phải tiêu đề)
  });

  test("post comment → hiện trên Spine", async ({ page }) => {
    await page.goto(`/cases/${CASE_B}`);
    const body = `[F2-3 e2e] comment ${Date.now()}`;
    await page.getByLabel("Thêm trao đổi").fill(body);
    await page.getByRole("button", { name: "Gửi" }).click();
    await expect(page.getByText(body)).toBeVisible();
  });

  test("transition NEW→TRIAGED trên case tươi → StatusPill + node mới", async ({ page, context }) => {
    const id = await freshCase(context, "[F2-3 e2e] transition");
    await page.goto(`/cases/${id}`);
    // exact:true → CHỈ StatusPill (node Spine "Chuyển sang “Chờ tiếp nhận”" có dấu ngoặc → không exact).
    await expect(page.getByText("Chờ tiếp nhận", { exact: true })).toBeVisible();
    await expect(page.getByText(/Chuyển sang/).first()).toBeVisible(); // case API có node NEW khởi tạo
    await page.getByRole("button", { name: "→ Đã phân loại" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận" }).click();
    await expect(page.getByText("Đã phân loại", { exact: true })).toBeVisible(); // StatusPill → TRIAGED
    // State đã tiến: TRIAGED không còn transition kế (ALLOWED_NEXT[TRIAGED]=[]) → 0 nút "→".
    await expect(page.getByRole("button", { name: /→/ })).toHaveCount(0);
  });
});

// ───────────────────────── R2 — 404 ĐỒNG NHẤT ─────────────────────────
test.describe("R2 — 404 đồng nhất (không phân biệt không-tồn-tại vs không-quyền)", () => {
  test.skip(!(haveCreds("STUDENT") && CASE_A && CASE_C), "Thiếu E2E creds/ID");
  test.beforeEach(async ({ context }) => authenticate(context, "STUDENT"));

  test("STUDENT xem case NHẠY CẢM của người khác → 404", async ({ page }) => {
    await page.goto(`/cases/${CASE_A}`);
    await expect(page.getByText("Không tìm thấy hồ sơ này.")).toBeVisible();
  });
  test("STUDENT xem case đã xoá mềm → 404", async ({ page }) => {
    await page.goto(`/cases/${CASE_C}`);
    await expect(page.getByText("Không tìm thấy hồ sơ này.")).toBeVisible();
  });
});

// ───────────────────────── R2 — internal comment ẩn với STUDENT ─────────────────────────
test.describe("R2 — STUDENT thấy 0 node nội bộ (server lọc)", () => {
  test.skip(!(haveCreds("STUDENT") && CASE_B), "Thiếu E2E creds/ID");
  test.beforeEach(async ({ context }) => authenticate(context, "STUDENT"));

  test("STUDENT (chủ case) thấy comment công khai, KHÔNG thấy nội bộ", async ({ page }) => {
    await page.goto(`/cases/${CASE_B}`);
    await expect(page.getByText(PUBLIC_BODY)).toBeVisible();
    await expect(page.getByText(INTERNAL_BODY)).toHaveCount(0);
    // exact:true → KHÔNG dính tiêu đề fixture ("…có comment nội bộ"); chỉ đếm tag/toggle thật.
    await expect(page.getByText("Nội bộ", { exact: true })).toHaveCount(0); // 0 tag + 0 toggle (STUDENT)
  });
});

// ───────────────────────── R2 — permission = không render (ma trận action) ─────────────────────────
// CASE_B giữ NEW (các test trên KHÔNG mutate nó) ⇒ ALLOWED_NEXT[NEW] = [TRIAGED] → 1 nút status.
type Expect = {
  panel: boolean; // CaseActionPanel render?
  statusBtns: number; // số nút "→ ..." = |ALLOWED_NEXT[NEW] ∩ changeStatus|
  assign: boolean; // nút "Nhận xử lý"
  emergency: boolean; // nút "Gắn khẩn cấp"
  composer: boolean; // soạn bình luận (comment:public)
};
const MATRIX: Record<Exclude<RoleKey, never>, Expect> = {
  STUDENT: { panel: false, statusBtns: 0, assign: false, emergency: false, composer: true },
  STAFF: { panel: true, statusBtns: 1, assign: true, emergency: true, composer: true },
  ADMIN: { panel: true, statusBtns: 1, assign: true, emergency: true, composer: true },
  AUDITOR: { panel: false, statusBtns: 0, assign: false, emergency: false, composer: false },
};

for (const role of ["STUDENT", "STAFF", "ADMIN", "AUDITOR"] as RoleKey[]) {
  test.describe(`R2 — action gating [${role}] trên CASE_B (NEW)`, () => {
    test.skip(!(haveCreds(role) && CASE_B), `Thiếu E2E creds/ID cho ${role}`);
    test.beforeEach(async ({ context }) => authenticate(context, role));

    test("số nút action = |ALLOWED_NEXT∩role|; không phép = không render", async ({ page }) => {
      const exp = MATRIX[role];
      await page.goto(`/cases/${CASE_B}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); // đã load

      await expect(page.getByRole("heading", { name: PANEL })).toHaveCount(exp.panel ? 1 : 0);
      await expect(page.getByRole("button", { name: /→/ })).toHaveCount(exp.statusBtns);
      await expect(page.getByRole("button", { name: "Nhận xử lý" })).toHaveCount(exp.assign ? 1 : 0);
      await expect(page.getByRole("button", { name: "Gắn khẩn cấp" })).toHaveCount(
        exp.emergency ? 1 : 0,
      );
      await expect(page.getByRole("button", { name: "Gửi" })).toHaveCount(exp.composer ? 1 : 0);
      // KHÔNG /status→ASSIGNED: nhãn ASSIGNED ("Đã giao") KHÔNG bao giờ là nút hành động.
      await expect(page.getByRole("button", { name: "→ Đã giao" })).toHaveCount(0);
    });
  });
}

// ───────────────────────── R2 — 409 reload-TRƯỚC-retry (route-mock tất định) ─────────────────────────
// Server 409 thật cần đua request (P5 đã proven bằng test-hooks). Ở FE, kiểm LUẬT XỬ LÝ tất định:
// 409 → invalidate (RELOAD: 1 GET detail) + toast "đã tải lại", KHÔNG retry mù (đúng 1 PATCH).
test.describe("R2 — 409 → reload trước, KHÔNG retry mù [ADMIN]", () => {
  test.skip(!(haveCreds("ADMIN") && CAT), "Thiếu E2E creds/ID");
  test.beforeEach(async ({ context }) => authenticate(context, "ADMIN"));

  test("PATCH 409 → reload hồ sơ + toast, đúng 1 PATCH", async ({ page, context }) => {
    const id = await freshCase(context, "[F2-3 e2e] 409");
    let patchCount = 0;
    let getAfterPatch = 0;
    let patched = false;

    await page.route(`**/api/cases/${id}`, async (route) => {
      if (route.request().method() === "GET" && patched) getAfterPatch++;
      await route.continue();
    });
    await page.route(`**/api/cases/${id}/status`, async (route) => {
      patchCount++;
      patched = true;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "Hồ sơ vừa được cập nhật" }),
      });
    });

    await page.goto(`/cases/${id}`);
    await page.getByRole("button", { name: "→ Đã phân loại" }).click();
    await page.getByRole("button", { name: "Xác nhận" }).click();

    await expect(page.getByText(/đã tải lại/i)).toBeVisible(); // conflict toast
    await expect.poll(() => getAfterPatch).toBeGreaterThanOrEqual(1); // reload (GET) sau 409
    expect(patchCount).toBe(1); // KHÔNG retry mù
  });
});
