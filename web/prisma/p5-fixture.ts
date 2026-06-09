// Fixture ephemeral cho test P5 (Workflow + Assignment) — KHÔNG đụng dữ liệu thật.
// setup: upsert user test (admin/staff1/staff2/staff3-inactive/auditor/student1) baseline, không ép đổi MK
//   + tạo các case [P5FX] ở TỪNG trạng thái sẵn (status đặt thẳng, KHÔNG statusHistory). Mỗi test
//   mutating có case RIÊNG để không nhiễm trạng thái lẫn nhau. In KEY=VALUE cho test script.
// --counts <caseId>: in HIST/AUDIT/NOTIF count của 1 case (kiểm side-effect transaction đã ghi thật).
// --teardown: best-effort. Lưu ý ràng buộc DB:
//   - case_status_history IMMUTABLE (trigger chặn DELETE) + FK Restrict ⇒ case ĐÃ qua transition
//     (sinh history lúc test) KHÔNG hard-delete được → soft-delete (set deletedAt).
//   - notification.case onDelete SetNull (không chặn xoá case); dọn notification theo userId test.
//   - user có audit/login rows ⇒ hard-delete bị chặn → fallback deactivate (giống cases-fixture).
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, CaseStatus } from "../src/generated/prisma/client";

const PW = "Test@123456";
const ADMIN_EMAIL = "p5-admin@test.local";
const STAFF1_EMAIL = "p5-staff1@test.local";
const STAFF2_EMAIL = "p5-staff2@test.local";
const STAFF3_EMAIL = "p5-staff3@test.local"; // STAFF nhưng isActive=false (test assign target inactive)
const AUDITOR_EMAIL = "p5-auditor@test.local";
const SBD1 = "P5-0001";
const EMAILS = [ADMIN_EMAIL, STAFF1_EMAIL, STAFF2_EMAIL, STAFF3_EMAIL, AUDITOR_EMAIL];

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function upsertByEmail(
  email: string,
  role: Role,
  name: string,
  passwordHash: string,
  isActive = true,
) {
  const baseline = { name, role, isActive, mustChangePassword: false, passwordHash };
  return prisma.user.upsert({ where: { email }, update: baseline, create: { email, ...baseline } });
}
async function upsertBySbd(sbd: string, name: string, passwordHash: string) {
  const baseline = { name, role: Role.STUDENT, isActive: true, mustChangePassword: false, passwordHash };
  return prisma.user.upsert({ where: { sbd }, update: baseline, create: { sbd, ...baseline } });
}

async function setup() {
  const passwordHash = await bcrypt.hash(PW, 10);
  const admin = await upsertByEmail(ADMIN_EMAIL, Role.ADMIN, "P5 Admin", passwordHash);
  const staff1 = await upsertByEmail(STAFF1_EMAIL, Role.STAFF, "P5 Staff One", passwordHash);
  const staff2 = await upsertByEmail(STAFF2_EMAIL, Role.STAFF, "P5 Staff Two", passwordHash);
  const staff3 = await upsertByEmail(STAFF3_EMAIL, Role.STAFF, "P5 Staff Three (inactive)", passwordHash, false);
  const auditor = await upsertByEmail(AUDITOR_EMAIL, Role.AUDITOR, "P5 Auditor", passwordHash);
  const student1 = await upsertBySbd(SBD1, "P5 Student One", passwordHash);

  // Category/location THẬT (findFirst → bền với khác biệt tên dữ liệu bootstrap).
  const cat = await prisma.category.findFirst({ where: { defaultSensitive: false, isActive: true } });
  const loc = await prisma.location.findFirst({ where: { isActive: true } });
  if (!cat) throw new Error("Thiếu category bootstrap — chạy `npx prisma db seed` trước.");

  // Dọn case/notification fixture cũ của các user này (idempotent, phòng run trước crash không teardown).
  await cleanupCasesOf([student1.id, admin.id, staff1.id, staff2.id]);

  // Helper tạo case [P5FX] (createdBy student1). KHÔNG statusHistory để hard-delete được khi chưa test.
  const mk = (title: string, extra: Record<string, unknown>) =>
    prisma.case.create({
      data: {
        title: `[P5FX] ${title}`,
        description: "Case P5 fixture cho test workflow/assignment (>= muoi ky tu).",
        categoryId: cat.id,
        locationId: loc?.id ?? null,
        createdById: student1.id,
        ...extra,
      },
    });

  // Group A — NEW cho ASSIGN tests (mỗi test mutating 1 case riêng)
  const newAssign = await mk("NEW assign", { status: CaseStatus.NEW });
  const newSelf = await mk("NEW self-assign", { status: CaseStatus.NEW });
  const newStaff4 = await mk("NEW staff->other (T4 dedicated)", { status: CaseStatus.NEW });
  const newBadAssignee = await mk("NEW bad-assignee (nonexistent/inactive)", { status: CaseStatus.NEW });
  const newAdmin2Admin = await mk("NEW admin->admin accept", { status: CaseStatus.NEW });
  // Group B — NEW cho STATUS tests
  const newBad = await mk("NEW bad-transition", { status: CaseStatus.NEW });
  const newTriage = await mk("NEW triage (admin)", { status: CaseStatus.NEW });
  const newStaffTriage = await mk("NEW triage (staff)", { status: CaseStatus.NEW });
  // Group C — trạng thái nâng cao (không thể tạo qua API)
  const assigned = await mk("ASSIGNED", { status: CaseStatus.ASSIGNED, assignedToId: staff1.id });
  const inprog = await mk("IN_PROGRESS", { status: CaseStatus.IN_PROGRESS, assignedToId: staff1.id });
  const inprogW = await mk("IN_PROGRESS (WAITING flow)", { status: CaseStatus.IN_PROGRESS, assignedToId: staff1.id });
  const reassignRace = await mk("IN_PROGRESS (reassign race)", { status: CaseStatus.IN_PROGRESS, assignedToId: staff1.id });
  const resolved = await mk("RESOLVED", {
    status: CaseStatus.RESOLVED,
    assignedToId: staff1.id,
    resolvedAt: new Date(),
  });
  const closed = await mk("CLOSED", {
    status: CaseStatus.CLOSED,
    assignedToId: staff1.id,
    resolvedAt: new Date(),
    closedAt: new Date(),
  });
  const staff1Run = await mk("IN_PROGRESS staff1 (T14)", {
    status: CaseStatus.IN_PROGRESS,
    assignedToId: staff1.id,
  });
  // Race cases (0 audit ban đầu → sau khi đua PHẢI có ĐÚNG 1 mutation-audit; >1 = lost-update).
  const statusRace = await mk("NEW (status race)", { status: CaseStatus.NEW });
  const lockcheckCase = await mk("NEW (lockcheck primitive)", { status: CaseStatus.NEW });
  const crossIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const c = await mk(`IN_PROGRESS (cross race ${i})`, {
      status: CaseStatus.IN_PROGRESS,
      assignedToId: staff1.id,
    });
    crossIds.push(c.id);
  }
  // Case cho CROSS TẤT ĐỊNH (dùng hook delay ép assign commit xen giữa read↔write của status).
  const crossDet = await mk("IN_PROGRESS (cross deterministic)", {
    status: CaseStatus.IN_PROGRESS,
    assignedToId: staff1.id,
  });

  // Hợp đồng cho test script (grep ^P5FX_).
  console.log(`P5FX_ADMIN=${admin.id}`);
  console.log(`P5FX_STAFF1=${staff1.id}`);
  console.log(`P5FX_STAFF2=${staff2.id}`);
  console.log(`P5FX_STAFF3_INACTIVE=${staff3.id}`);
  console.log(`P5FX_AUDITOR=${auditor.id}`);
  console.log(`P5FX_STUDENT1=${student1.id}`);
  console.log(`P5FX_CAT=${cat.id}`);
  console.log(`P5FX_LOC=${loc?.id ?? ""}`);
  console.log(`P5FX_NEW_ASSIGN=${newAssign.id}`);
  console.log(`P5FX_NEW_SELFASSIGN=${newSelf.id}`);
  console.log(`P5FX_NEW_STAFF4=${newStaff4.id}`);
  console.log(`P5FX_NEW_BADASSIGNEE=${newBadAssignee.id}`);
  console.log(`P5FX_NEW_ADMIN2ADMIN=${newAdmin2Admin.id}`);
  console.log(`P5FX_NEW_BADTRANS=${newBad.id}`);
  console.log(`P5FX_NEW_TRIAGE=${newTriage.id}`);
  console.log(`P5FX_NEW_STAFFTRIAGE=${newStaffTriage.id}`);
  console.log(`P5FX_ASSIGNED=${assigned.id}`);
  console.log(`P5FX_INPROG=${inprog.id}`);
  console.log(`P5FX_INPROG_W=${inprogW.id}`);
  console.log(`P5FX_REASSIGN_RACE=${reassignRace.id}`);
  console.log(`P5FX_RESOLVED=${resolved.id}`);
  console.log(`P5FX_CLOSED=${closed.id}`);
  console.log(`P5FX_STAFF1_RUN=${staff1Run.id}`);
  console.log(`P5FX_STATUS_RACE=${statusRace.id}`);
  console.log(`P5FX_LOCKCHECK=${lockcheckCase.id}`);
  crossIds.forEach((id, i) => console.log(`P5FX_CROSS${i + 1}=${id}`));
  console.log(`P5FX_CROSSDET=${crossDet.id}`);
  console.log("fixture ready");
}

// Đếm side-effect đã ghi cho 1 case (chứng minh transaction ghi thật history/audit/notification).
async function counts(caseId: string) {
  const hist = await prisma.caseStatusHistory.count({ where: { caseId } });
  const audit = await prisma.auditLog.count({ where: { entityType: "Case", entityId: caseId } });
  const notif = await prisma.notification.count({ where: { caseId } });
  console.log(`HIST=${hist}`);
  console.log(`AUDIT=${audit}`);
  console.log(`NOTIF=${notif}`);
}

// Đếm audit (mutation) cho NHIỀU case trong 1 lần gọi → bất biến đua: mỗi case PHẢI đúng 1.
async function auditCounts(ids: string[]) {
  for (const id of ids) {
    const n = await prisma.auditLog.count({ where: { entityType: "Case", entityId: id } });
    console.log(`AUDIT_${id}=${n}`);
  }
}

// Kiểm TRỰC TIẾP semantics optimistic-lock theo updatedAt trên Postgres THẬT (trả lời mục D):
// writer mang updatedAt CŨ (stale) → updateMany khớp 0 dòng; writer mang updatedAt MỚI → khớp 1.
async function lockcheck(id: string) {
  const before = await prisma.case.findUnique({
    where: { id },
    select: { updatedAt: true, status: true, priority: true },
  });
  if (!before) {
    console.log("LOCKCHECK_STALE=-1");
    console.log("LOCKCHECK_FRESH=-1");
    return;
  }
  // Mô phỏng "writer khác commit trước": cập nhật out-of-band (đợi >1ms để @updatedAt chắc chắn đổi).
  await new Promise((r) => setTimeout(r, 10));
  await prisma.case.update({ where: { id }, data: { priority: before.priority } });
  const stale = await prisma.case.updateMany({
    where: { id, status: before.status, updatedAt: before.updatedAt, deletedAt: null },
    data: { priority: before.priority },
  });
  const after = await prisma.case.findUnique({ where: { id }, select: { updatedAt: true } });
  const fresh = await prisma.case.updateMany({
    where: { id, updatedAt: after!.updatedAt, deletedAt: null },
    data: { priority: before.priority },
  });
  console.log(`LOCKCHECK_STALE=${stale.count}`); // expect 0
  console.log(`LOCKCHECK_FRESH=${fresh.count}`); // expect 1
}

// Xoá best-effort mọi case do các user này tạo + notification của họ: comment trước, hard-delete nếu
// được, kẹt (status history immutable) thì soft-delete.
async function cleanupCasesOf(userIds: string[]) {
  const cases = await prisma.case.findMany({
    where: { createdById: { in: userIds } },
    select: { id: true },
  });
  const caseIds = cases.map((c) => c.id);
  // Dọn notification gửi tới các user test (tránh phình qua nhiều lần chạy).
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  if (caseIds.length === 0) return;
  await prisma.comment.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.notification.deleteMany({ where: { caseId: { in: caseIds } } });
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
    where: { OR: [{ email: { in: EMAILS } }, { sbd: { in: [SBD1] } }] },
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

const argv = process.argv.slice(2);
let mode: "setup" | "teardown" | "counts" | "audit" | "lockcheck" = "setup";
if (argv.includes("--teardown")) mode = "teardown";
else if (argv.includes("--counts")) mode = "counts";
else if (argv.includes("--audit")) mode = "audit";
else if (argv.includes("--lockcheck")) mode = "lockcheck";
const countId = argv[argv.indexOf("--counts") + 1] ?? "";
const lockId = argv[argv.indexOf("--lockcheck") + 1] ?? "";
const auditIds = mode === "audit" ? argv.slice(argv.indexOf("--audit") + 1) : [];

const run =
  mode === "teardown"
    ? teardown()
    : mode === "counts"
      ? counts(countId)
      : mode === "audit"
        ? auditCounts(auditIds)
        : mode === "lockcheck"
          ? lockcheck(lockId)
          : setup();
run
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("fixture error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
