// Fixture ephemeral cho test Votes + Comment threads (Update A) — KHÔNG đụng dữ liệu thật.
// setup: upsert user (admin/staff1/staff2/auditor/student1/student2) + RESET fixture cũ
//   + tạo 2 case (public, sensitive) cho test. In KEY=VALUE.
// --teardown: best-effort (comment/vote → case → user fallback deactivate).
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, CaseStatus } from "../src/generated/prisma/client";

const PW = "Test@123456";
const ADMIN_EMAIL = "va-admin@test.local";
const STAFF1_EMAIL = "va-staff1@test.local";
const STAFF2_EMAIL = "va-staff2@test.local";
const AUDITOR_EMAIL = "va-auditor@test.local";
const SBD1 = "VA-0001";
const SBD2 = "VA-0002";

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
  // Xoá vote trước (FK caseId+userId → cases+users).
  await prisma.vote.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { caseId: { in: caseIds } }] },
  });
  // Xoá comment (FK Restrict → case).
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
      await prisma.case.update({ where: { id }, data: { deletedAt: new Date() } });
    }
  }
}

async function setup() {
  const passwordHash = await bcrypt.hash(PW, 10);
  const admin   = await upsertByEmail(ADMIN_EMAIL,   Role.ADMIN,   "VA Admin",       passwordHash);
  const staff1  = await upsertByEmail(STAFF1_EMAIL,  Role.STAFF,   "VA Staff One",   passwordHash);
  const staff2  = await upsertByEmail(STAFF2_EMAIL,  Role.STAFF,   "VA Staff Two",   passwordHash);
  const auditor = await upsertByEmail(AUDITOR_EMAIL, Role.AUDITOR, "VA Auditor",     passwordHash);
  const stu1    = await upsertBySbd(SBD1, "VA Student One", passwordHash);
  const stu2    = await upsertBySbd(SBD2, "VA Student Two", passwordHash);

  const cat = await prisma.category.findFirst({ where: { defaultSensitive: false, isActive: true } });
  const catSens = await prisma.category.findFirst({ where: { defaultSensitive: true, isActive: true } });
  if (!cat) throw new Error("Thiếu category bootstrap — chạy `npx prisma db seed` trước.");

  const ids = [admin.id, staff1.id, staff2.id, auditor.id, stu1.id, stu2.id];
  await cleanupOf(ids);

  const mk = (title: string, createdById: string, extra: Record<string, unknown>) =>
    prisma.case.create({
      data: {
        title: `[VAFX] ${title}`,
        description: "Case VAFX fixture cho test votes/comments (>= muoi ky tu).",
        categoryId: cat.id,
        createdById,
        ...extra,
      },
    });

  // C_PUBLIC: student2 tạo, công khai → student1, staff1, admin, auditor đều thấy.
  const cPublic = await mk("C_PUBLIC", stu2.id, { status: CaseStatus.NEW });
  // C_OWN: student1 tạo, assigned staff1 → IN_PROGRESS.
  const cOwn = await mk("C_OWN", stu1.id, { status: CaseStatus.IN_PROGRESS, assignedToId: staff1.id });
  // C_SENS: student2 tạo, nhạy cảm → student1 KHÔNG thấy → 404 khi vote/comment.
  const cSens = await mk("C_SENS", stu2.id, {
    status: CaseStatus.NEW,
    isSensitive: true,
    ...(catSens ? { categoryId: catSens.id } : {}),
  });

  console.log(`VAFX_ADMIN=${admin.id}`);
  console.log(`VAFX_STAFF1=${staff1.id}`);
  console.log(`VAFX_STAFF2=${staff2.id}`);
  console.log(`VAFX_AUDITOR=${auditor.id}`);
  console.log(`VAFX_STU1=${stu1.id}`);
  console.log(`VAFX_STU2=${stu2.id}`);
  console.log(`VAFX_C_PUBLIC=${cPublic.id}`);
  console.log(`VAFX_C_OWN=${cOwn.id}`);
  console.log(`VAFX_C_SENS=${cSens.id}`);
  console.log("fixture ready");
}

async function teardown() {
  const passwordHash = await bcrypt.hash(PW, 10);
  const users = [
    { email: ADMIN_EMAIL, role: Role.ADMIN, name: "VA Admin", passwordHash },
    { email: STAFF1_EMAIL, role: Role.STAFF, name: "VA Staff One", passwordHash },
    { email: STAFF2_EMAIL, role: Role.STAFF, name: "VA Staff Two", passwordHash },
    { email: AUDITOR_EMAIL, role: Role.AUDITOR, name: "VA Auditor", passwordHash },
  ];
  const userRecords = (await Promise.all(
    users.map((u) => prisma.user.findUnique({ where: { email: u.email }, select: { id: true } }))
  )).filter(Boolean).map((u) => u!.id);
  const stuRecords = await Promise.all(
    [SBD1, SBD2].map((sbd) => prisma.user.findUnique({ where: { sbd }, select: { id: true } }))
  );
  const allIds = [...userRecords, ...stuRecords.filter(Boolean).map((u) => u!.id)];
  await cleanupOf(allIds);
  process.stdout.write("teardown done\n");
}

async function main() {
  const arg = process.argv[2];
  try {
    if (arg === "--teardown") { await teardown(); }
    else { await setup(); }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
