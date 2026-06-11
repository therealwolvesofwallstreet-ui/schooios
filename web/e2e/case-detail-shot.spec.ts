// R3 POLISH capture — dựng 1 case GIÀU node (origin + NEW + comment công khai + nội bộ + TRIAGED có
// ghi chú) rồi screenshot full-page ở viewport project (1280 desktop / 390 mobile). reducedMotion=reduce
// (config) → animation tắt → ảnh tất định. KHÔNG phải test pass/fail — chỉ xuất ảnh để soi FRONTEND.md.
import { test, authenticate, haveCreds } from "./_fixtures";

const CAT = process.env.E2E_CAT_NORMAL || "";

test.describe("R3 capture [ADMIN]", () => {
  test.skip(!(haveCreds("ADMIN") && CAT), "Thiếu E2E creds/ID");

  test("screenshot detail (Spine giàu node) + biến thể emergency", async ({ page, context }) => {
    await authenticate(context, "ADMIN");
    const w = page.viewportSize()?.width ?? 0;

    // Dựng case giàu node qua API (case API tự có node NEW khởi tạo).
    const mk = async () => {
      const res = await context.request.post("/api/cases", {
        data: {
          title: "Mất xe đạp ở nhà để xe khu B",
          description:
            "Em để xe ở nhà xe khu B sáng nay, đến trưa ra thì không thấy nữa. Em đã hỏi bác bảo vệ nhưng chưa tìm được. Mong nhà trường hỗ trợ ạ.",
          categoryId: CAT,
        },
      });
      const { case: c } = (await res.json()) as { case: { id: string } };
      return c.id;
    };
    const id = await mk();
    await context.request.post(`/api/cases/${id}/comments`, {
      data: { body: "Em cảm ơn thầy cô đã tiếp nhận ạ." },
    });
    await context.request.post(`/api/cases/${id}/comments`, {
      data: { body: "Đã liên hệ bảo vệ trích xuất camera khu B.", isInternal: true },
    });
    await context.request.patch(`/api/cases/${id}/status`, {
      data: { status: "TRIAGED", reason: "Đã tiếp nhận, chuyển bộ phận cơ sở vật chất." },
    });

    await page.goto(`/cases/${id}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForTimeout(400); // ổn định layout
    await page.screenshot({ path: `.verify/shots/detail-${w}.png`, fullPage: true });

    // Biến thể emergency → edge oxblood ở header.
    await context.request.patch(`/api/cases/${id}/emergency`, {
      data: { isEmergency: true, reason: "Liên quan an toàn tài sản học sinh." },
    });
    await page.reload();
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `.verify/shots/detail-emergency-${w}.png`, fullPage: true });
  });
});
