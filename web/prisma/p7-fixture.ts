// Fixture ephemeral cho test P7 (Emergency lane + Dashboard) — KHÔNG đụng dữ liệu thật.
// setup: upsert user test (admin/staff1/auditor/student1) baseline (không ép đổi MK) + RESET sạch case
//   [P7FX] cũ trước khi tạo lại → --counts/dashboard không bị nhiễu bởi run trước crash. In KEY=VALUE.
//   Tạo các case phủ: emergency mở (assigned/unassigned + ngoài-scope-STAFF), emergency CLOSED (test
//   activeOnly), case thường (flip emergency), stale (createdAt now-10d), unassigned, rải status/
//   priority/category/location + 1 case unlocated (locationId=null) → byLocation + unlocated phủ total.
// --counts <id>: in cho 1 id (case HOẶC user):
//   AUDIT_EMERG = audit EMERGENCY_FLAG theo entityId=id (id là caseId).
//   NOTIF_CASE  = notification EMERGENCY_CONFIRMED theo caseId=id.
//   NOTIF_USER  = notification EMERGENCY_CONFIRMED theo userId=id (kiểm tra recipient/actor-loại).
// --teardown: best-effort (giống p6). Ràng buộc DB: comment FK Restrict→case (xoá comment trước);
//   audit_logs immutable + actorId SetNull bị trigger chặn ⇒ user có audit rows KHÔNG hard-delete được
//   → fallback deactivate. notification.case SetNull (không chặn xoá case).
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  CaseStatus,
  CasePriority,
  AuditAction,
  NotificationType,
} from "../src/generated/prisma/client";

const PW = "Test@123456";
const ADMIN_EMAIL = "p7-admin@test.local";
const ADMIN2_EMAIL = "p7-admin2@test.local"; // admin THỨ HAI: test ADMIN-actor bị loại còn admin khác vẫn nhận
const STAFF1_EMAIL = "p7-staff1@test.local";
const AUDITOR_EMAIL = "p7-auditor@test.local";
const SBD1 = "P7-0001";
const EMAILS = [ADMIN_EMAIL, ADMIN2_EMAIL, STAFF1_EMAIL, AUDITOR_EMAIL];
const SBDS = [SBD1];

const DAY = 24 * 60 * 60 * 1000;

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
  const admin = await upsertByEmail(ADMIN_EMAIL, Role.ADMIN, "P7 Admin", passwordHash);
  const admin2 = await upsertByEmail(ADMIN2_EMAIL, Role.ADMIN, "P7 Admin Two", passwordHash);
  const staff1 = await upsertByEmail(STAFF1_EMAIL, Role.STAFF, "P7 Staff One", passwordHash);
  const auditor = await upsertByEmail(AUDITOR_EMAIL, Role.AUDITOR, "P7 Auditor", passwordHash);
  const student1 = await upsertBySbd(SBD1, "P7 Student One", passwordHash);

  // Category/location THẬT (findFirst → bền với khác biệt tên dữ liệu bootstrap).
  const cat = await prisma.category.findFirst({ where: { isActive: true } });
  const loc = await prisma.location.findFirst({ where: { isActive: true } });
  if (!cat) throw new Error("Thiếu category bootstrap — chạy `npx prisma db seed` trước.");
  if (!loc) throw new Error("Thiếu location bootstrap — chạy `npx prisma db seed` trước.");

  // RESET sạch case [P7FX] cũ của các user này (idempotent; phòng run trước crash không teardown) →
  // lane/dashboard chỉ thấy case của RUN hiện tại.
  const ids = [student1.id, staff1.id, admin.id, admin2.id, auditor.id];
  await cleanupOf(ids);

  const now = Date.now();
  // mk: omit caseCode (DB tự sinh); createdById=student1; locationId tùy ca (null = unlocated).
  const mk = (title: string, extra: Record<string, unknown>) =>
    prisma.case.create({
      data: {
        title: `[P7FX] ${title}`,
        description: "Case P7 fixture cho test emergency/dashboard (>= muoi ky tu).",
        categoryId: cat.id,
        createdById: student1.id,
        ...extra,
      },
    });

  // ── Cases cho EMERGENCY FLAG (PATCH) — bắt đầu isEmergency=false, visible cho staff1 ──
  // CASE_A: assigned staff1, IN_PROGRESS → staff1 thấy (owner). Dùng test 1-4 + 7 (case của-mình).
  const caseA = await mk("CASE_A flip", {
    status: CaseStatus.IN_PROGRESS,
    assignedToId: staff1.id,
    locationId: loc.id,
    priority: CasePriority.MEDIUM,
  });
  // CASE_NORMAL: NEW unlocated → no-op false→false (test 5); cũng góp 'unlocated'.
  const caseNormal = await mk("CASE_NORMAL", {
    status: CaseStatus.NEW,
    locationId: null,
    priority: CasePriority.LOW,
  });
  // CASE_UNASSIGNED: NEW, chưa giao → bật true thì CHỈ admin nhận (test 6).
  const caseUnassigned = await mk("CASE_UNASSIGNED", {
    status: CaseStatus.NEW,
    locationId: loc.id,
    priority: CasePriority.HIGH,
  });

  // ── Cases cho LANE + DASHBOARD (isEmergency=true sẵn, độc lập với PATCH tests) ──
  // EM_OPEN_1: NEW, chưa giao, unlocated, mở → emergencyOpen + lane.
  const emOpen1 = await mk("EM_OPEN_1", {
    status: CaseStatus.NEW,
    isEmergency: true,
    locationId: null,
    priority: CasePriority.CRITICAL,
    createdAt: new Date(now),
  });
  // EM_OPEN_2: IN_PROGRESS, assigned ADMIN (NGOÀI scope thường của staff1) → chứng minh lane bỏ scope.
  const emOpen2 = await mk("EM_OPEN_2", {
    status: CaseStatus.IN_PROGRESS,
    isEmergency: true,
    assignedToId: admin.id,
    locationId: loc.id,
    priority: CasePriority.CRITICAL,
    createdAt: new Date(now - 60_000),
  });
  // EM_CLOSED: CLOSED → activeOnly LOẠI; KHÔNG tính emergencyOpen; staff1 không thấy qua scope thường (404 PATCH).
  const emClosed = await mk("EM_CLOSED", {
    status: CaseStatus.CLOSED,
    isEmergency: true,
    locationId: loc.id,
    priority: CasePriority.HIGH,
    resolvedAt: new Date(now - 120_000),
    closedAt: new Date(now - 90_000),
    createdAt: new Date(now - 120_000),
  });

  // ── Cases NHẠY CẢM + emergency (chính sách: lane chỉ cho ADMIN/AUDITOR + assignee thấy) ──
  // EM_SENS_UNASSIGNED: nhạy cảm, chưa giao, mở → STAFF KHÔNG được giao PHẢI KHÔNG thấy; ADMIN/AUDITOR thấy.
  const emSensUnassigned = await mk("EM_SENS_UNASSIGNED", {
    status: CaseStatus.NEW,
    isEmergency: true,
    isSensitive: true,
    locationId: loc.id,
    priority: CasePriority.CRITICAL,
    createdAt: new Date(now - 30_000),
  });
  // EM_SENS_STAFF1: nhạy cảm, GIAO staff1, mở → assignee staff1 PHẢI thấy (gate theo assignee).
  const emSensStaff1 = await mk("EM_SENS_STAFF1", {
    status: CaseStatus.IN_PROGRESS,
    isEmergency: true,
    isSensitive: true,
    assignedToId: staff1.id,
    locationId: loc.id,
    priority: CasePriority.CRITICAL,
    createdAt: new Date(now - 45_000),
  });

  // ── Cases STALE (createdAt now-10d, mở) → stale > 0 ──
  const stale1 = await mk("STALE_1", {
    status: CaseStatus.NEW,
    locationId: loc.id,
    priority: CasePriority.MEDIUM,
    createdAt: new Date(now - 10 * DAY),
  });
  const stale2 = await mk("STALE_2", {
    status: CaseStatus.TRIAGED,
    locationId: null,
    priority: CasePriority.LOW,
    createdAt: new Date(now - 10 * DAY),
  });

  // CASE_RACE: assigned staff1, IN_PROGRESS, isEmergency=false → test 409 optimistic-lock tất định.
  const caseRace = await mk("CASE_RACE", {
    status: CaseStatus.IN_PROGRESS,
    assignedToId: staff1.id,
    locationId: loc.id,
    priority: CasePriority.MEDIUM,
  });
  // EM_SOFT_DELETED: isEmergency=true NHƯNG deletedAt set → PHẢI bị loại khỏi lane + dashboard.
  const emSoftDeleted = await mk("EM_SOFT_DELETED", {
    status: CaseStatus.NEW,
    isEmergency: true,
    locationId: loc.id,
    priority: CasePriority.HIGH,
    deletedAt: new Date(now - 1000),
  });

  // Hợp đồng cho test script (grep ^P7FX_).
  console.log(`P7FX_ADMIN=${admin.id}`);
  console.log(`P7FX_ADMIN2=${admin2.id}`);
  console.log(`P7FX_STAFF1=${staff1.id}`);
  console.log(`P7FX_AUDITOR=${auditor.id}`);
  console.log(`P7FX_STUDENT1=${student1.id}`);
  console.log(`P7FX_CAT=${cat.id}`);
  console.log(`P7FX_LOC=${loc.id}`);
  console.log(`P7FX_CASE_A=${caseA.id}`);
  console.log(`P7FX_CASE_NORMAL=${caseNormal.id}`);
  console.log(`P7FX_CASE_UNASSIGNED=${caseUnassigned.id}`);
  console.log(`P7FX_CASE_RACE=${caseRace.id}`);
  console.log(`P7FX_EM_OPEN_1=${emOpen1.id}`);
  console.log(`P7FX_EM_OPEN_2=${emOpen2.id}`);
  console.log(`P7FX_EM_CLOSED=${emClosed.id}`);
  console.log(`P7FX_EM_SOFT_DELETED=${emSoftDeleted.id}`);
  console.log(`P7FX_EM_SENS_UNASSIGNED=${emSensUnassigned.id}`);
  console.log(`P7FX_EM_SENS_STAFF1=${emSensStaff1.id}`);
  console.log(`P7FX_STALE_1=${stale1.id}`);
  console.log(`P7FX_STALE_2=${stale2.id}`);
  // Số case open-emergency / stale do fixture tạo → test dùng làm cận dưới sanity (>=).
  // 4 open-emergency: EM_OPEN_1, EM_OPEN_2, EM_SENS_UNASSIGNED, EM_SENS_STAFF1 (EM_CLOSED đóng, soft-del loại).
  console.log(`P7FX_N_EMERGENCY_OPEN=4`);
  console.log(`P7FX_N_STALE=2`);
  console.log("fixture ready");
}

// Đếm side-effect EMERGENCY cho 1 id (case HOẶC user). AUDIT_EMERG/NOTIF_CASE: id là caseId.
// NOTIF_USER: id là userId (test kiểm recipient: admin nhận, actor bị loại).
async function counts(id: string) {
  const auditEmerg = await prisma.auditLog.count({
    where: { entityType: "Case", entityId: id, action: AuditAction.EMERGENCY_FLAG },
  });
  const notifCase = await prisma.notification.count({
    where: { caseId: id, type: NotificationType.EMERGENCY_CONFIRMED },
  });
  const notifUser = await prisma.notification.count({
    where: { userId: id, type: NotificationType.EMERGENCY_CONFIRMED },
  });
  console.log(`AUDIT_EMERG=${auditEmerg}`);
  console.log(`NOTIF_CASE=${notifCase}`);
  console.log(`NOTIF_USER=${notifUser}`);
}

// In metadata của audit EMERGENCY_FLAG MỚI NHẤT cho 1 case → test xác thực NỘI DUNG {before,after,reason}
// (không chỉ đếm dòng). META=null nếu chưa có audit nào.
async function auditMeta(id: string) {
  const a = await prisma.auditLog.findFirst({
    where: { entityType: "Case", entityId: id, action: AuditAction.EMERGENCY_FLAG },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  console.log(`META=${JSON.stringify(a?.metadata ?? null)}`);
}

// Xoá best-effort: comment (FK Restrict→case, xoá trước) → notification (nhận HOẶC theo case, gồm cả
// notif gửi ADMIN THẬT về case fixture — bắt qua caseId) → case (hard-delete, kẹt thì soft-delete).
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
let mode: "setup" | "teardown" | "counts" | "audit-meta" = "setup";
if (argv.includes("--teardown")) mode = "teardown";
else if (argv.includes("--counts")) mode = "counts";
else if (argv.includes("--audit-meta")) mode = "audit-meta";
const countId = argv[argv.indexOf("--counts") + 1] ?? "";
const metaId = argv[argv.indexOf("--audit-meta") + 1] ?? "";

const run =
  mode === "teardown"
    ? teardown()
    : mode === "counts"
      ? counts(countId)
      : mode === "audit-meta"
        ? auditMeta(metaId)
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
