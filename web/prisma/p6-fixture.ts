// Fixture ephemeral cho test P6 (Comments + Notifications) — KHÔNG đụng dữ liệu thật.
// setup: upsert user test (admin/staff1/staff2/auditor/student1/student2) baseline (không ép đổi MK)
//   + RESET sạch (xoá comment/notification + case [P6FX] cũ) trước khi tạo lại → --counts không bị
//   nhiễu bởi run trước crash. Tạo 3 case + seed 3 notification chưa đọc cho student1. In KEY=VALUE.
// --counts <userId|caseId>: in NOTIF/AUDIT cho 1 id. NOTIF đếm theo recipient userId HOẶC caseId
//   (test so DELTA trước/sau theo recipient userId). AUDIT đếm theo entityId (vd comment id).
// --teardown: best-effort (giống p5). Lưu ý ràng buộc DB:
//   - comment FK Restrict tới case ⇒ phải xoá comment trước khi xoá case.
//   - notification.case onDelete SetNull (không chặn xoá case); audit_logs immutable + actorId SetNull
//     bị trigger chặn ⇒ user có audit rows KHÔNG hard-delete được → fallback deactivate.
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, CaseStatus, NotificationType } from "../src/generated/prisma/client";

const PW = "Test@123456";
const ADMIN_EMAIL = "p6-admin@test.local";
const STAFF1_EMAIL = "p6-staff1@test.local";
const STAFF2_EMAIL = "p6-staff2@test.local";
const AUDITOR_EMAIL = "p6-auditor@test.local";
const SBD1 = "P6-0001";
const SBD2 = "P6-0002";
const EMAILS = [ADMIN_EMAIL, STAFF1_EMAIL, STAFF2_EMAIL, AUDITOR_EMAIL];
const SBDS = [SBD1, SBD2];

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
  const admin = await upsertByEmail(ADMIN_EMAIL, Role.ADMIN, "P6 Admin", passwordHash);
  const staff1 = await upsertByEmail(STAFF1_EMAIL, Role.STAFF, "P6 Staff One", passwordHash);
  const staff2 = await upsertByEmail(STAFF2_EMAIL, Role.STAFF, "P6 Staff Two", passwordHash);
  const auditor = await upsertByEmail(AUDITOR_EMAIL, Role.AUDITOR, "P6 Auditor", passwordHash);
  const student1 = await upsertBySbd(SBD1, "P6 Student One", passwordHash);
  const student2 = await upsertBySbd(SBD2, "P6 Student Two", passwordHash);

  // Category/location THẬT (findFirst → bền với khác biệt tên dữ liệu bootstrap).
  const cat = await prisma.category.findFirst({ where: { defaultSensitive: false, isActive: true } });
  const catSens = await prisma.category.findFirst({ where: { defaultSensitive: true, isActive: true } });
  const loc = await prisma.location.findFirst({ where: { isActive: true } });
  if (!cat) throw new Error("Thiếu category bootstrap — chạy `npx prisma db seed` trước.");

  // RESET sạch fixture cũ của các user này (idempotent; phòng run trước crash không teardown).
  const ids = [student1.id, student2.id, admin.id, staff1.id, staff2.id, auditor.id];
  await cleanupOf(ids);

  const mk = (title: string, createdById: string, extra: Record<string, unknown>) =>
    prisma.case.create({
      data: {
        title: `[P6FX] ${title}`,
        description: "Case P6 fixture cho test comments/notifications (>= muoi ky tu).",
        categoryId: cat.id,
        locationId: loc?.id ?? null,
        createdById,
        ...extra,
      },
    });

  // C_OWN: HS tạo (student1), STAFF được giao (staff1), đang xử lý. Có CẢ recipient STUDENT (creator)
  //   để test loại-nội-bộ, lẫn recipient STAFF (assignee) để test vẫn-nhận-nội-bộ.
  const cOwn = await mk("C_OWN", student1.id, {
    status: CaseStatus.IN_PROGRESS,
    assignedToId: staff1.id,
  });
  // C_PUBLIC: HS khác (student2) tạo, category KHÔNG nhạy cảm, NEW → student1 THẤY (công khai) → comment được.
  const cPublic = await mk("C_PUBLIC", student2.id, { status: CaseStatus.NEW });
  // C_SENS: student2 tạo, nhạy cảm → student1 KHÔNG thấy → 404.
  const cSens = await mk("C_SENS", student2.id, {
    status: CaseStatus.NEW,
    isSensitive: true,
    ...(catSens ? { categoryId: catSens.id } : {}),
  });

  // Seed 3 notification CHƯA ĐỌC cho student1 (test GET/unreadOnly/read-all tất định).
  await prisma.notification.createMany({
    data: [1, 2, 3].map((n) => ({
      userId: student1.id,
      caseId: cOwn.id,
      type: NotificationType.STATUS_CHANGED,
      message: `[P6FX] seeded notification ${n}`,
    })),
  });

  // Hợp đồng cho test script (grep ^P6FX_).
  console.log(`P6FX_ADMIN=${admin.id}`);
  console.log(`P6FX_STAFF1=${staff1.id}`);
  console.log(`P6FX_STAFF2=${staff2.id}`);
  console.log(`P6FX_AUDITOR=${auditor.id}`);
  console.log(`P6FX_STUDENT1=${student1.id}`);
  console.log(`P6FX_STUDENT2=${student2.id}`);
  console.log(`P6FX_CAT=${cat.id}`);
  console.log(`P6FX_CAT_SENS=${catSens?.id ?? ""}`);
  console.log(`P6FX_LOC=${loc?.id ?? ""}`);
  console.log(`P6FX_C_OWN=${cOwn.id}`);
  console.log(`P6FX_C_PUBLIC=${cPublic.id}`);
  console.log(`P6FX_C_SENS=${cSens.id}`);
  console.log("fixture ready");
}

// Đếm side-effect cho 1 id. NOTIF: theo recipient userId HOẶC caseId (test dùng recipient userId cho
// DELTA). AUDIT: theo entityId (vd comment id) — chứng minh transaction ghi audit thật.
async function counts(id: string) {
  const notif = await prisma.notification.count({
    where: { OR: [{ userId: id }, { caseId: id }] },
  });
  const audit = await prisma.auditLog.count({ where: { entityId: id } });
  console.log(`NOTIF=${notif}`);
  console.log(`AUDIT=${audit}`);
}

// Xoá best-effort: comment (do user tạo HOẶC trên case của user) → notification (nhận HOẶC theo case)
// → case (hard-delete nếu được, kẹt history immutable thì soft-delete). Thứ tự: comment trước (FK Restrict).
async function cleanupOf(userIds: string[]) {
  const cases = await prisma.case.findMany({
    where: { createdById: { in: userIds } },
    select: { id: true },
  });
  const caseIds = cases.map((c) => c.id);
  await prisma.comment.deleteMany({
    where: { OR: [{ authorId: { in: userIds } }, { caseId: { in: caseIds } }] },
  });
  await prisma.notification.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { caseId: { in: caseIds } }] },
  });
  for (const id of caseIds) {
    try {
      await prisma.case.delete({ where: { id } });
    } catch {
      await prisma.case.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});
    }
  }
}

async function teardown() {
  const users = await prisma.user.findMany({
    where: { OR: [{ email: { in: EMAILS } }, { sbd: { in: SBDS } }] },
    select: { id: true },
  });
  if (users.length === 0) {
    console.log("fixture absent");
    return;
  }
  const ids = users.map((u) => u.id);
  await cleanupOf(ids);
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

const argv = process.argv.slice(2);
let mode: "setup" | "teardown" | "counts" = "setup";
if (argv.includes("--teardown")) mode = "teardown";
else if (argv.includes("--counts")) mode = "counts";
const countId = argv[argv.indexOf("--counts") + 1] ?? "";

const run = mode === "teardown" ? teardown() : mode === "counts" ? counts(countId) : setup();
run
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("fixture error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
