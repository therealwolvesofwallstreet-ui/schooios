// Fixture ephemeral cho test P4 (Cases API) — KHÔNG đụng dữ liệu thật.
// setup: upsert 5 user test (admin/staff/auditor/2 student) về baseline (active, không ép đổi MK)
//   + tạo 3 case kịch bản [P4FX] tham chiếu category/location THẬT. In ra KEY=VALUE cho test script.
// --teardown: dọn sạch best-effort. Lưu ý ràng buộc DB:
//   - case_status_history IMMUTABLE (trigger chặn DELETE) + FK Restrict ⇒ case CÓ status history
//     (các case do API tạo trong lúc test) KHÔNG hard-delete được → soft-delete (set deletedAt).
//   - user có audit/login rows ⇒ hard-delete bị chặn → fallback deactivate (giống auth-fixture).
//   - Case fixture cố tình KHÔNG có statusHistory ⇒ xoá comment xong là hard-delete được.
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const PW = "Test@123456";
const ADMIN_EMAIL = "p4-admin@test.local";
const STAFF_EMAIL = "p4-staff@test.local";
const AUDITOR_EMAIL = "p4-auditor@test.local";
const SBD1 = "P4-0001";
const SBD2 = "P4-0002";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function upsertByEmail(email: string, role: Role, name: string, passwordHash: string) {
  const baseline = { name, role, isActive: true, mustChangePassword: false, passwordHash };
  return prisma.user.upsert({ where: { email }, update: baseline, create: { email, ...baseline } });
}
async function upsertBySbd(sbd: string, name: string, passwordHash: string) {
  const baseline = { name, role: Role.STUDENT, isActive: true, mustChangePassword: false, passwordHash };
  return prisma.user.upsert({ where: { sbd }, update: baseline, create: { sbd, ...baseline } });
}

async function setup() {
  const passwordHash = await bcrypt.hash(PW, 10);
  const admin = await upsertByEmail(ADMIN_EMAIL, Role.ADMIN, "P4 Admin", passwordHash);
  await upsertByEmail(STAFF_EMAIL, Role.STAFF, "P4 Staff", passwordHash);
  await upsertByEmail(AUDITOR_EMAIL, Role.AUDITOR, "P4 Auditor", passwordHash);
  const student1 = await upsertBySbd(SBD1, "P4 Student One", passwordHash);
  const student2 = await upsertBySbd(SBD2, "P4 Student Two", passwordHash);

  // Category/location THẬT (findFirst → bền với khác biệt tên dữ liệu bootstrap).
  const catNormal = await prisma.category.findFirst({ where: { defaultSensitive: false, isActive: true } });
  const catSensitive = await prisma.category.findFirst({ where: { defaultSensitive: true, isActive: true } });
  const loc = await prisma.location.findFirst({ where: { isActive: true } });
  if (!catNormal || !catSensitive)
    throw new Error("Thiếu category bootstrap — chạy `npx prisma db seed` trước.");

  // Dọn case fixture cũ của các user này (idempotent, phòng run trước crash không teardown).
  await cleanupCasesOf([student1.id, student2.id, admin.id]);

  // (a) case nhạy cảm của student2 (test STUDENT1 không thấy). KHÔNG statusHistory.
  const a = await prisma.case.create({
    data: {
      title: "[P4FX] Vụ nhạy cảm do student2 tạo",
      description: "Nội dung nhạy cảm chỉ người tạo + STAFF/ADMIN thấy.",
      categoryId: catSensitive.id,
      locationId: loc?.id ?? null,
      isSensitive: true,
      createdById: student2.id,
    },
  });

  // (b) case của student1 + 1 comment nội bộ (admin) + 1 comment công khai (student1).
  const b = await prisma.case.create({
    data: {
      title: "[P4FX] Case student1 có comment nội bộ",
      description: "Dùng để test ẩn comment isInternal với STUDENT.",
      categoryId: catNormal.id,
      locationId: loc?.id ?? null,
      createdById: student1.id,
      comments: {
        create: [
          { authorId: admin.id, body: "[P4FX][Nội bộ] Ghi chú staff.", isInternal: true },
          { authorId: student1.id, body: "[P4FX] Bình luận công khai." },
        ],
      },
    },
  });

  // (c) case đã soft-delete (test không lọt list & detail 404). KHÔNG statusHistory.
  const c = await prisma.case.create({
    data: {
      title: "[P4FX] Case đã xoá mềm",
      description: "Không được xuất hiện ở list/detail.",
      categoryId: catNormal.id,
      createdById: student1.id,
      deletedAt: new Date(),
    },
  });

  // Hợp đồng cho test script (grep ^P4FX_).
  console.log(`P4FX_CAT_NORMAL=${catNormal.id}`);
  console.log(`P4FX_CAT_SENSITIVE=${catSensitive.id}`);
  console.log(`P4FX_LOC=${loc?.id ?? ""}`);
  console.log(`P4FX_A_ID=${a.id}`);
  console.log(`P4FX_A_CODE=${a.caseCode}`);
  console.log(`P4FX_B_ID=${b.id}`);
  console.log(`P4FX_C_ID=${c.id}`);
  console.log("fixture ready");
}

// Xoá best-effort mọi case do các user này tạo: xoá comment trước, hard-delete nếu được,
// kẹt (có status history immutable) thì soft-delete.
async function cleanupCasesOf(userIds: string[]) {
  const cases = await prisma.case.findMany({ where: { createdById: { in: userIds } }, select: { id: true } });
  const caseIds = cases.map((c) => c.id);
  if (caseIds.length === 0) return;
  await prisma.comment.deleteMany({ where: { caseId: { in: caseIds } } });
  for (const id of caseIds) {
    try {
      await prisma.case.delete({ where: { id } });
    } catch {
      await prisma.case.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});
    }
  }
}

async function teardown() {
  const emails = [ADMIN_EMAIL, STAFF_EMAIL, AUDITOR_EMAIL];
  const sbds = [SBD1, SBD2];
  const users = await prisma.user.findMany({
    where: { OR: [{ email: { in: emails } }, { sbd: { in: sbds } }] },
    select: { id: true },
  });
  if (users.length === 0) {
    console.log("fixture absent");
    return;
  }
  const ids = users.map((u) => u.id);
  await cleanupCasesOf(ids);
  for (const id of ids) {
    try {
      await prisma.user.delete({ where: { id } });
    } catch {
      // có audit/login rows (SetNull bị immutable trigger chặn) → deactivate.
      await prisma.user.update({ where: { id }, data: { isActive: false } });
    }
  }
  console.log("fixture torn down");
}

const mode = process.argv.includes("--teardown") ? "teardown" : "setup";
(mode === "teardown" ? teardown() : setup())
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("fixture error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
