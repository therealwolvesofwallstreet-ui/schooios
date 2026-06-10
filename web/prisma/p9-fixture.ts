// Fixture ephemeral cho test P9 (Permission audit + Error states + Rate-limit) — KHÔNG đụng dữ liệu thật.
// setup: upsert user test (admin/staff1/staff2/auditor/student1/student2 + mcpUser ép-đổi-MK + inactiveUser)
//   baseline + RESET sạch case [P9FX] cũ trước khi tạo lại (idempotent). In KEY=VALUE (grep ^P9FX_).
//   Tạo 8 case phủ ma trận quyền:
//     C_PUBLIC (NEW, công khai)        → thấy-tất reads + comment 201 + bad-JSON/zod/405 targets
//     C_SENS (NEW, nhạy cảm)           → student1 KHÔNG thấy → GET[id]/comments 404
//     C_STAFF2 (IN_PROGRESS, giao staff2) → staff1 KHÔNG thấy → status/emergency/comments-GET 404
//     C_EMERG (IN_PROGRESS, giao staff1, isEmergency=true, nhạy cảm) → emergency no-op 200 (admin+staff1);
//                                          STAFF assign-403 (thấy nhưng status∉NEW/TRIAGED); lane content
//     C_ASSIGN_ADMIN / C_ASSIGN_STAFF / C_STATUS_ADMIN / C_STATUS_STAFF (NEW, chưa giao) → mutation-200
//                                          (mỗi cell 1 case riêng → ma trận TẤT-ĐỊNH-THỨ-TỰ, không clobber).
// --teardown: best-effort (giống p7). comment FK Restrict→case (xoá trước); user có audit rows KHÔNG
//   hard-delete được → fallback deactivate; case có statusHistory (sau mutation test) → fallback soft-delete.
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
const ADMIN_EMAIL = "p9-admin@test.local";
const STAFF1_EMAIL = "p9-staff1@test.local";
const STAFF2_EMAIL = "p9-staff2@test.local";
const AUDITOR_EMAIL = "p9-auditor@test.local";
const MCP_EMAIL = "p9-mcp@test.local"; // mustChangePassword=true → test cổng MUST_CHANGE_PASSWORD
const INACTIVE_EMAIL = "p9-inactive@test.local"; // isActive=false → test login 403
const SBD1 = "P9-0001";
const SBD2 = "P9-0002";
const EMAILS = [ADMIN_EMAIL, STAFF1_EMAIL, STAFF2_EMAIL, AUDITOR_EMAIL, MCP_EMAIL, INACTIVE_EMAIL];
const SBDS = [SBD1, SBD2];

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

type UserOpts = { mustChangePassword?: boolean; isActive?: boolean };
async function upsertByEmail(
  email: string,
  role: Role,
  name: string,
  passwordHash: string,
  opts: UserOpts = {},
) {
  const baseline = {
    name,
    role,
    isActive: opts.isActive ?? true,
    mustChangePassword: opts.mustChangePassword ?? false,
    passwordHash,
  };
  return prisma.user.upsert({ where: { email }, update: baseline, create: { email, ...baseline } });
}
async function upsertBySbd(sbd: string, name: string, passwordHash: string) {
  const baseline = { name, role: Role.STUDENT, isActive: true, mustChangePassword: false, passwordHash };
  return prisma.user.upsert({ where: { sbd }, update: baseline, create: { sbd, ...baseline } });
}

async function setup() {
  const passwordHash = await bcrypt.hash(PW, 10);
  const admin = await upsertByEmail(ADMIN_EMAIL, Role.ADMIN, "P9 Admin", passwordHash);
  const staff1 = await upsertByEmail(STAFF1_EMAIL, Role.STAFF, "P9 Staff One", passwordHash);
  const staff2 = await upsertByEmail(STAFF2_EMAIL, Role.STAFF, "P9 Staff Two", passwordHash);
  const auditor = await upsertByEmail(AUDITOR_EMAIL, Role.AUDITOR, "P9 Auditor", passwordHash);
  const mcpUser = await upsertByEmail(MCP_EMAIL, Role.STAFF, "P9 MustChange", passwordHash, {
    mustChangePassword: true,
  });
  const inactiveUser = await upsertByEmail(INACTIVE_EMAIL, Role.STAFF, "P9 Inactive", passwordHash, {
    isActive: false,
  });
  const student1 = await upsertBySbd(SBD1, "P9 Student One", passwordHash);
  const student2 = await upsertBySbd(SBD2, "P9 Student Two", passwordHash);

  // Category/location THẬT (findFirst → bền với khác biệt tên dữ liệu bootstrap).
  const cat = await prisma.category.findFirst({ where: { isActive: true } });
  const loc = await prisma.location.findFirst({ where: { isActive: true } });
  if (!cat) throw new Error("Thiếu category bootstrap — chạy `npx prisma db seed` trước.");
  if (!loc) throw new Error("Thiếu location bootstrap — chạy `npx prisma db seed` trước.");

  // RESET sạch case [P9FX] cũ của các user này (idempotent; phòng run trước crash không teardown).
  const ids = [
    student1.id,
    student2.id,
    staff1.id,
    staff2.id,
    admin.id,
    auditor.id,
    mcpUser.id,
    inactiveUser.id,
  ];
  await cleanupOf(ids);

  // Dọn user RL-probe của các run TRƯỚC (sbd ngẫu nhiên P9RL-* — tích lũy vì có audit LOGIN nên
  // chỉ deactivate được). Giữ DB test sạch giữa các lần chạy.
  await cleanupRlUsers();

  const now = Date.now();
  // User RL-probe DÙNG-MỘT-LẦN cho §I (change-password rate-limit): sbd ngẫu nhiên theo run → id MỚI
  // mỗi lần → bucket `pwchange:${id}` LUÔN sạch kể cả khi tái dùng dev-server (in-memory Map còn state).
  const RL_SBD = `P9RL-${now}`;
  const rlUser = await upsertBySbd(RL_SBD, "P9 RL Probe", passwordHash);
  void rlUser;
  // mk: omit caseCode (DB tự sinh); createdById + extra tuỳ ca. locationId mặc định = loc.id.
  const mk = (title: string, createdById: string, extra: Record<string, unknown>) =>
    prisma.case.create({
      data: {
        title: `[P9FX] ${title}`,
        description: "Case P9 fixture cho test permission/error/rate-limit (>= muoi ky tu).",
        categoryId: cat.id,
        locationId: loc.id,
        createdById,
        ...extra,
      },
    });

  // ── Read / role-gate (KHÔNG bị mutate) ──
  // C_PUBLIC: NEW, công khai → thấy với MỌI role (NEW→STAFF; công khai→STUDENT; ADMIN/AUDITOR tất).
  const cPublic = await mk("C_PUBLIC", student2.id, {
    status: CaseStatus.NEW,
    priority: CasePriority.MEDIUM,
  });
  // C_SENS: NEW, nhạy cảm, do student2 tạo → student1 KHÔNG thấy (404 chống dò).
  const cSens = await mk("C_SENS", student2.id, {
    status: CaseStatus.NEW,
    isSensitive: true,
    priority: CasePriority.HIGH,
  });
  // C_STAFF2: IN_PROGRESS, giao staff2 → staff1 KHÔNG thấy (không owner, không NEW/TRIAGED) → 404.
  const cStaff2 = await mk("C_STAFF2", student1.id, {
    status: CaseStatus.IN_PROGRESS,
    assignedToId: staff2.id,
    priority: CasePriority.MEDIUM,
  });
  // C_EMERG: IN_PROGRESS, giao staff1, isEmergency=true, nhạy cảm → emergency no-op 200 (admin+staff1);
  //   STAFF assign-403 (staff1 thấy vì owner, nhưng status∉NEW/TRIAGED → !isAssignable); lane content.
  const cEmerg = await mk("C_EMERG", student1.id, {
    status: CaseStatus.IN_PROGRESS,
    assignedToId: staff1.id,
    isEmergency: true,
    isSensitive: true,
    priority: CasePriority.CRITICAL,
    createdAt: new Date(now), // mới nhất → đứng đầu lane (sort createdAt desc)
  });
  // C_EMERG_PUB: emergency CÔNG KHAI, chưa giao → MỌI STAFF/ADMIN/AUDITOR thấy trên lane (lane bỏ scope).
  const cEmergPub = await mk("C_EMERG_PUB", student1.id, {
    status: CaseStatus.NEW,
    isEmergency: true,
    isSensitive: false,
    priority: CasePriority.HIGH,
    createdAt: new Date(now - 60_000),
  });
  // C_EMERG_SENS_UN: emergency NHẠY CẢM, chưa giao → STAFF KHÔNG thấy (gate), ADMIN/AUDITOR thấy.
  const cEmergSensUn = await mk("C_EMERG_SENS_UN", student1.id, {
    status: CaseStatus.NEW,
    isEmergency: true,
    isSensitive: true,
    priority: CasePriority.CRITICAL,
    createdAt: new Date(now - 120_000),
  });
  // C_EMERG_PUB2: emergency CÔNG KHAI thứ HAI, createdAt TRÙNG KHÍT C_EMERG_PUB → cặp tie để test
  //   tiebreaker {id:desc} trên lane (thiếu tiebreaker → thứ tự 2 case này không tất định).
  const cEmergPub2 = await mk("C_EMERG_PUB2", student1.id, {
    status: CaseStatus.NEW,
    isEmergency: true,
    isSensitive: false,
    priority: CasePriority.HIGH,
    createdAt: new Date(now - 60_000), // == C_EMERG_PUB
  });
  // C_SOFT_DELETED: isEmergency=true NHƯNG deletedAt set → PHẢI vô hình MỌI NƠI (GET 404 kể cả ADMIN,
  //   lane loại, dashboard KHÔNG đếm). Guard cho deletedAt:null ở caseWhereForRole + lane + aggregate.
  const cSoftDeleted = await mk("C_SOFT_DELETED", student1.id, {
    status: CaseStatus.NEW,
    isEmergency: true,
    isSensitive: false,
    priority: CasePriority.HIGH,
    deletedAt: new Date(now - 1000),
  });
  // C_EMERG_FLIP: isEmergency=FALSE, giao staff1 → §G positive control (flip false→true: audit+1/notify≥1)
  //   rồi no-op (true→true: Δ0). Chứng minh write-path SỐNG (no-op Δ0 không vacuous).
  const cEmergFlip = await mk("C_EMERG_FLIP", student1.id, {
    status: CaseStatus.IN_PROGRESS,
    assignedToId: staff1.id,
    isEmergency: false,
    isSensitive: false,
    priority: CasePriority.MEDIUM,
    createdAt: new Date(now - 30_000),
  });

  // ── Mutation-200 cells: mỗi cell 1 case NEW riêng (consumed once) → ma trận tất-định-thứ-tự ──
  const cAssignAdmin = await mk("C_ASSIGN_ADMIN", student1.id, { status: CaseStatus.NEW });
  const cAssignStaff = await mk("C_ASSIGN_STAFF", student1.id, { status: CaseStatus.NEW });
  const cStatusAdmin = await mk("C_STATUS_ADMIN", student1.id, { status: CaseStatus.NEW });
  const cStatusStaff = await mk("C_STATUS_STAFF", student1.id, { status: CaseStatus.NEW });

  // Seed NOTIF_SEED notification cho student1 trong MỘT createMany → created_at TRÙNG NHAU
  // (CURRENT_TIMESTAMP). Đầu vào đối nghịch để test phân trang TẤT ĐỊNH: thiếu id-tiebreaker thì
  // skip/take trên khoá sort trùng có thể bỏ sót/lặp dòng giữa các trang.
  const NOTIF_SEED = 25;
  await prisma.notification.createMany({
    data: Array.from({ length: NOTIF_SEED }, (_, i) => ({
      userId: student1.id,
      type: NotificationType.COMMENT_ADDED,
      message: `[P9FX] seeded notif ${i + 1}`,
      caseId: cPublic.id,
    })),
  });

  // Hợp đồng cho test script (grep ^P9FX_).
  console.log(`P9FX_ADMIN=${admin.id}`);
  console.log(`P9FX_STAFF1=${staff1.id}`);
  console.log(`P9FX_STAFF2=${staff2.id}`);
  console.log(`P9FX_AUDITOR=${auditor.id}`);
  console.log(`P9FX_MCP=${mcpUser.id}`);
  console.log(`P9FX_INACTIVE=${inactiveUser.id}`);
  console.log(`P9FX_STUDENT1=${student1.id}`);
  console.log(`P9FX_STUDENT2=${student2.id}`);
  console.log(`P9FX_CAT=${cat.id}`);
  console.log(`P9FX_LOC=${loc.id}`);
  console.log(`P9FX_C_PUBLIC=${cPublic.id}`);
  console.log(`P9FX_C_SENS=${cSens.id}`);
  console.log(`P9FX_C_STAFF2=${cStaff2.id}`);
  console.log(`P9FX_C_EMERG=${cEmerg.id}`);
  console.log(`P9FX_C_EMERG_PUB=${cEmergPub.id}`);
  console.log(`P9FX_C_EMERG_PUB2=${cEmergPub2.id}`);
  console.log(`P9FX_C_EMERG_SENS_UN=${cEmergSensUn.id}`);
  console.log(`P9FX_C_SOFT_DELETED=${cSoftDeleted.id}`);
  console.log(`P9FX_C_EMERG_FLIP=${cEmergFlip.id}`);
  console.log(`P9FX_RL_SBD=${RL_SBD}`);
  console.log(`P9FX_NOTIF_USER=${student1.id}`);
  console.log(`P9FX_NOTIF_SEEDED=${NOTIF_SEED}`);
  console.log(`P9FX_C_ASSIGN_ADMIN=${cAssignAdmin.id}`);
  console.log(`P9FX_C_ASSIGN_STAFF=${cAssignStaff.id}`);
  console.log(`P9FX_C_STATUS_ADMIN=${cStatusAdmin.id}`);
  console.log(`P9FX_C_STATUS_STAFF=${cStatusStaff.id}`);
  // Định danh login (test dùng trực tiếp).
  console.log(`P9FX_ADMIN_EMAIL=${ADMIN_EMAIL}`);
  console.log(`P9FX_STAFF1_EMAIL=${STAFF1_EMAIL}`);
  console.log(`P9FX_STAFF2_EMAIL=${STAFF2_EMAIL}`);
  console.log(`P9FX_AUDITOR_EMAIL=${AUDITOR_EMAIL}`);
  console.log(`P9FX_MCP_EMAIL=${MCP_EMAIL}`);
  console.log(`P9FX_INACTIVE_EMAIL=${INACTIVE_EMAIL}`);
  console.log(`P9FX_STUDENT1_SBD=${SBD1}`);
  console.log(`P9FX_STUDENT2_SBD=${SBD2}`);
  console.log("fixture ready");
}

// Xoá best-effort: comment (FK Restrict→case, xoá trước) → notification (theo user HOẶC case) →
// case (hard-delete; kẹt vì statusHistory FK Restrict thì soft-delete).
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

// Xoá user RL-probe (sbd P9RL-*) còn sót từ run trước: dọn case của họ rồi hard-delete (kẹt audit → deactivate).
async function cleanupRlUsers() {
  const rl = await prisma.user.findMany({
    where: { sbd: { startsWith: "P9RL-" } },
    select: { id: true },
  });
  if (rl.length === 0) return;
  const rlIds = rl.map((u) => u.id);
  await cleanupOf(rlIds);
  for (const id of rlIds) {
    try {
      await prisma.user.delete({ where: { id } });
    } catch {
      await prisma.user.update({ where: { id }, data: { isActive: false } });
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
  await cleanupRlUsers(); // user RL-probe sbd ngẫu nhiên (P9RL-*) không nằm trong SBDS cố định.
  console.log("fixture torn down");
}

// --counts <caseId>: đếm side-effect EMERGENCY của 1 case → test no-op chứng minh Δ0 (no phantom write).
//   AUDIT_EMERG = audit EMERGENCY_FLAG theo entityId; NOTIF_EMERG = notification EMERGENCY_CONFIRMED theo caseId.
async function counts(caseId: string) {
  const auditEmerg = await prisma.auditLog.count({
    where: { entityType: "Case", entityId: caseId, action: AuditAction.EMERGENCY_FLAG },
  });
  const notifEmerg = await prisma.notification.count({
    where: { caseId, type: NotificationType.EMERGENCY_CONFIRMED },
  });
  console.log(`AUDIT_EMERG=${auditEmerg}`);
  console.log(`NOTIF_EMERG=${notifEmerg}`);
}

// --live-total: tổng case SỐNG (deletedAt:null) ngay thời điểm gọi → §E so khớp dashboard.totalCases
//   (mutation: bỏ deletedAt:null ở MỌI count dashboard → total phồng → lệch LIVE_TOTAL → bắt được).
async function liveTotal() {
  const n = await prisma.case.count({ where: { deletedAt: null } });
  console.log(`LIVE_TOTAL=${n}`);
}

const argv = process.argv.slice(2);
let mode: "setup" | "teardown" | "counts" | "live-total" = "setup";
if (argv.includes("--teardown")) mode = "teardown";
else if (argv.includes("--counts")) mode = "counts";
else if (argv.includes("--live-total")) mode = "live-total";
const countId = argv[argv.indexOf("--counts") + 1] ?? "";
const run =
  mode === "teardown"
    ? teardown()
    : mode === "counts"
      ? counts(countId)
      : mode === "live-total"
        ? liveTotal()
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
