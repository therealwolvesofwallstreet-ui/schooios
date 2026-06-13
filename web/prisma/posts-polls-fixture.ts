// Fixture ephemeral cho test Update B (Posts/Polls broadcast) — KHÔNG đụng dữ liệu thật.
// setup: upsert 4 user test (admin/staff/auditor/student) baseline (mustChangePassword=false) + RESET
//   sạch post/poll/vote cũ của các user này (idempotent, phòng run trước crash). In KEY=VALUE.
// --counts <entityId>: in AUDIT (số auditLog theo entityId) — chứng minh transaction ghi audit thật.
// --teardown: best-effort. Thứ tự xoá theo FK Restrict: pollVote/postVote → pollOption → poll/post →
//   user (user có audit rows → SetNull bị immutable trigger chặn ⇒ fallback deactivate).
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const PW = "Test@123456";
const ADMIN_EMAIL = "pb-admin@test.local";
const STAFF_EMAIL = "pb-staff@test.local";
const AUDITOR_EMAIL = "pb-auditor@test.local";
const SBD = "PB-0001";
const EMAILS = [ADMIN_EMAIL, STAFF_EMAIL, AUDITOR_EMAIL];
const SBDS = [SBD];

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

// Xoá best-effort post/poll/vote liên quan các user (theo FK Restrict order). votes: BY user HOẶC
// trên post/poll do user tạo. options/poll/post: do user tạo.
async function cleanupOf(userIds: string[]) {
  const polls = await prisma.poll.findMany({ where: { authorId: { in: userIds } }, select: { id: true } });
  const posts = await prisma.post.findMany({ where: { authorId: { in: userIds } }, select: { id: true } });
  const pollIds = polls.map((p) => p.id);
  const postIds = posts.map((p) => p.id);

  await prisma.pollVote.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { pollId: { in: pollIds } }] },
  });
  await prisma.postVote.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { postId: { in: postIds } }] },
  });
  await prisma.pollOption.deleteMany({ where: { pollId: { in: pollIds } } });
  await prisma.poll.deleteMany({ where: { id: { in: pollIds } } });
  await prisma.post.deleteMany({ where: { id: { in: postIds } } });
}

async function setup() {
  const passwordHash = await bcrypt.hash(PW, 10);
  const admin = await upsertByEmail(ADMIN_EMAIL, Role.ADMIN, "PB Admin", passwordHash);
  const staff = await upsertByEmail(STAFF_EMAIL, Role.STAFF, "PB Staff", passwordHash);
  const auditor = await upsertByEmail(AUDITOR_EMAIL, Role.AUDITOR, "PB Auditor", passwordHash);
  const student = await upsertBySbd(SBD, "PB Student", passwordHash);

  await cleanupOf([admin.id, staff.id, auditor.id, student.id]);

  console.log(`PBFX_ADMIN=${admin.id}`);
  console.log(`PBFX_STAFF=${staff.id}`);
  console.log(`PBFX_AUDITOR=${auditor.id}`);
  console.log(`PBFX_STUDENT=${student.id}`);
  console.log("fixture ready");
}

async function counts(id: string) {
  const audit = await prisma.auditLog.count({ where: { entityId: id } });
  console.log(`AUDIT=${audit}`);
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
