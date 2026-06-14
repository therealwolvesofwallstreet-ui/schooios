// Fixture ephemeral cho Update C (anonymous + sensitivity siết) — KHÔNG đụng dữ liệu thật.
// setup: upsert 6 user (admin/staff1/staff2/auditor/student1/student2) + RESET case cũ của họ +
//   in KEY=VALUE (id user + 2 category normal/sensitive + tên student1 để leak-scan). Case do test
//   script tạo QUA API (kiểm cả luồng create anonymous/sensitive). teardown: best-effort cleanup.
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const PW = "Test@123456";
const ADMIN_EMAIL = "as-admin@test.local";
const STAFF1_EMAIL = "as-staff1@test.local";
const STAFF2_EMAIL = "as-staff2@test.local";
const AUDITOR_EMAIL = "as-auditor@test.local";
const SBD1 = "AS-0001";
const SBD2 = "AS-0002";
const STU1_NAME = "AS Student One";

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

async function cleanupOf(userIds: string[]) {
  const cases = await prisma.case.findMany({
    where: { createdById: { in: userIds } },
    select: { id: true },
  });
  const caseIds = cases.map((c) => c.id);
  await prisma.vote.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { caseId: { in: caseIds } }] },
  });
  await prisma.comment.deleteMany({
    where: { OR: [{ authorId: { in: userIds } }, { caseId: { in: caseIds } }] },
  });
  await prisma.notification.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { caseId: { in: caseIds } }] },
  });
  // statusHistory (append-only, không xoá được qua trigger) — case không hard-delete được nếu có
  // history → fallback soft-delete. Thử hard-delete trước (sạch hơn), lỗi → soft-delete.
  for (const id of caseIds) {
    try {
      await prisma.caseStatusHistory.deleteMany({ where: { caseId: id } });
    } catch {
      /* trigger chặn — bỏ qua, soft-delete bên dưới */
    }
    try {
      await prisma.case.delete({ where: { id } });
    } catch {
      await prisma.case.update({ where: { id }, data: { deletedAt: new Date() } });
    }
  }
}

async function ids() {
  const records = await Promise.all([
    prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: STAFF1_EMAIL }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: STAFF2_EMAIL }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: AUDITOR_EMAIL }, select: { id: true } }),
    prisma.user.findUnique({ where: { sbd: SBD1 }, select: { id: true } }),
    prisma.user.findUnique({ where: { sbd: SBD2 }, select: { id: true } }),
  ]);
  return records.filter(Boolean).map((u) => u!.id);
}

async function setup() {
  const passwordHash = await bcrypt.hash(PW, 10);
  const admin = await upsertByEmail(ADMIN_EMAIL, Role.ADMIN, "AS Admin", passwordHash);
  const staff1 = await upsertByEmail(STAFF1_EMAIL, Role.STAFF, "AS Staff One", passwordHash);
  const staff2 = await upsertByEmail(STAFF2_EMAIL, Role.STAFF, "AS Staff Two", passwordHash);
  const auditor = await upsertByEmail(AUDITOR_EMAIL, Role.AUDITOR, "AS Auditor", passwordHash);
  const stu1 = await upsertBySbd(SBD1, STU1_NAME, passwordHash);
  const stu2 = await upsertBySbd(SBD2, "AS Student Two", passwordHash);

  const catNormal = await prisma.category.findFirst({ where: { defaultSensitive: false, isActive: true } });
  const catSens = await prisma.category.findFirst({ where: { defaultSensitive: true, isActive: true } });
  if (!catNormal || !catSens)
    throw new Error("Thiếu category bootstrap (normal + sensitive) — chạy `npx prisma db seed` trước.");

  await cleanupOf([admin.id, staff1.id, staff2.id, auditor.id, stu1.id, stu2.id]);

  console.log(`ASFX_ADMIN=${admin.id}`);
  console.log(`ASFX_STAFF1=${staff1.id}`);
  console.log(`ASFX_STAFF2=${staff2.id}`);
  console.log(`ASFX_AUDITOR=${auditor.id}`);
  console.log(`ASFX_STU1=${stu1.id}`);
  console.log(`ASFX_STU2=${stu2.id}`);
  console.log(`ASFX_STU1_NAME=${STU1_NAME}`);
  console.log(`ASFX_CAT_NORMAL=${catNormal.id}`);
  console.log(`ASFX_CAT_SENS=${catSens.id}`);
  console.log("fixture ready");
}

async function teardown() {
  await cleanupOf(await ids());
  process.stdout.write("teardown done\n");
}

async function main() {
  const arg = process.argv[2];
  try {
    if (arg === "--teardown") await teardown();
    else await setup();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
