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
  NotificationType,
  AuditAction,
} from "../src/generated/prisma/client";

// Seed dùng DIRECT_URL (session pooler 5432) cho an toàn với nhiều câu lệnh.
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // ── Users (idempotent theo email) ──
  const [admin, staff, student] = await Promise.all([
    prisma.user.upsert({ where: { email: "admin@schoo.ios" }, update: {}, create: { email: "admin@schoo.ios", passwordHash, name: "Quản trị viên", role: Role.ADMIN } }),
    prisma.user.upsert({ where: { email: "staff@schoo.ios" }, update: {}, create: { email: "staff@schoo.ios", passwordHash, name: "Cán bộ phụ trách", role: Role.STAFF } }),
    prisma.user.upsert({ where: { email: "student@schoo.ios" }, update: {}, create: { email: "student@schoo.ios", passwordHash, name: "Học sinh A", role: Role.STUDENT } }),
    prisma.user.upsert({ where: { email: "student2@schoo.ios" }, update: {}, create: { email: "student2@schoo.ios", passwordHash, name: "Học sinh B", role: Role.STUDENT } }),
    prisma.user.upsert({ where: { email: "auditor@schoo.ios" }, update: {}, create: { email: "auditor@schoo.ios", passwordHash, name: "Kiểm toán viên", role: Role.AUDITOR } }),
  ]);

  // ── Categories (idempotent theo name) ──
  const catSpec = [
    { name: "Cơ sở vật chất", defaultPriority: CasePriority.MEDIUM, defaultSensitive: false },
    { name: "Bạo lực học đường", defaultPriority: CasePriority.HIGH, defaultSensitive: true },
    { name: "Sức khỏe", defaultPriority: CasePriority.HIGH, defaultSensitive: true },
    { name: "Học tập", defaultPriority: CasePriority.LOW, defaultSensitive: false },
    { name: "Khác", defaultPriority: CasePriority.MEDIUM, defaultSensitive: false },
  ];
  const cat: Record<string, { id: string }> = {};
  for (const c of catSpec) {
    cat[c.name] = await prisma.category.upsert({ where: { name: c.name }, update: {}, create: c });
  }

  // ── Cases: chỉ seed một lần (tránh trùng; KHÔNG xóa được audit/history vì trigger immutable) ──
  const existing = await prisma.case.count();
  if (existing > 0) {
    console.log(`✔ Cases đã seed (${existing}). Bỏ qua phần case.`);
    await summary();
    return;
  }

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

  // 1) NEW — học sinh vừa báo, tự bấm khẩn cấp
  await prisma.case.create({
    data: {
      title: "Đèn hành lang tầng 3 bị hỏng",
      description: "Khu vực tối, học sinh dễ vấp ngã vào buổi tối.",
      location: "Hành lang tầng 3, dãy A",
      categoryId: cat["Cơ sở vật chất"].id,
      priority: CasePriority.MEDIUM,
      status: CaseStatus.NEW,
      studentFlaggedEmergency: true,
      createdById: student.id,
      createdAt: daysAgo(1),
      statusHistory: { create: [{ changedById: student.id, fromStatus: null, toStatus: CaseStatus.NEW, note: "Học sinh tạo báo cáo", createdAt: daysAgo(1) }] },
    },
  });

  // 2) TRIAGED — đã phân loại
  await prisma.case.create({
    data: {
      title: "Xin thêm tài liệu ôn tập môn Toán",
      description: "Lớp 11A đề xuất bổ sung đề cương.",
      location: "Phòng 301",
      categoryId: cat["Học tập"].id,
      priority: CasePriority.LOW,
      status: CaseStatus.TRIAGED,
      createdById: student.id,
      createdAt: daysAgo(3),
      statusHistory: {
        create: [
          { changedById: student.id, fromStatus: null, toStatus: CaseStatus.NEW, createdAt: daysAgo(3) },
          { changedById: admin.id, fromStatus: CaseStatus.NEW, toStatus: CaseStatus.TRIAGED, note: "Phân loại Học tập", createdAt: daysAgo(2) },
        ],
      },
    },
  });

  // 3) IN_PROGRESS — nhạy cảm, đã giao staff, có comment nội bộ
  await prisma.case.create({
    data: {
      title: "Mâu thuẫn giữa hai học sinh trong giờ ra chơi",
      description: "Cần xác minh và xử lý theo quy trình.",
      location: "Sân trường",
      categoryId: cat["Bạo lực học đường"].id,
      priority: CasePriority.HIGH,
      status: CaseStatus.IN_PROGRESS,
      isSensitive: true,
      isEmergency: true,
      studentFlaggedEmergency: true,
      createdById: student.id,
      assignedToId: staff.id,
      createdAt: daysAgo(5),
      statusHistory: {
        create: [
          { changedById: student.id, fromStatus: null, toStatus: CaseStatus.NEW, createdAt: daysAgo(5) },
          { changedById: admin.id, fromStatus: CaseStatus.NEW, toStatus: CaseStatus.TRIAGED, createdAt: daysAgo(5) },
          { changedById: admin.id, fromStatus: CaseStatus.TRIAGED, toStatus: CaseStatus.ASSIGNED, note: "Giao cho cán bộ phụ trách", createdAt: daysAgo(4) },
          { changedById: staff.id, fromStatus: CaseStatus.ASSIGNED, toStatus: CaseStatus.IN_PROGRESS, createdAt: daysAgo(4) },
        ],
      },
      comments: {
        create: [
          { authorId: student.id, body: "Em mong nhà trường xử lý sớm ạ.", createdAt: daysAgo(4) },
          { authorId: staff.id, body: "[Nội bộ] Đã mời hai bên lên làm việc, đang xác minh.", isInternal: true, createdAt: daysAgo(3) },
        ],
      },
    },
  });

  // 4) RESOLVED — đã xử lý xong (resolvedAt)
  await prisma.case.create({
    data: {
      title: "Vòi nước nhà vệ sinh tầng 2 rò rỉ",
      description: "Gây trơn trượt và lãng phí nước.",
      location: "WC tầng 2",
      categoryId: cat["Cơ sở vật chất"].id,
      priority: CasePriority.MEDIUM,
      status: CaseStatus.RESOLVED,
      createdById: student.id,
      assignedToId: staff.id,
      createdAt: daysAgo(10),
      resolvedAt: daysAgo(7),
      statusHistory: {
        create: [
          { changedById: student.id, fromStatus: null, toStatus: CaseStatus.NEW, createdAt: daysAgo(10) },
          { changedById: admin.id, fromStatus: CaseStatus.NEW, toStatus: CaseStatus.ASSIGNED, createdAt: daysAgo(9) },
          { changedById: staff.id, fromStatus: CaseStatus.ASSIGNED, toStatus: CaseStatus.IN_PROGRESS, createdAt: daysAgo(9) },
          { changedById: staff.id, fromStatus: CaseStatus.IN_PROGRESS, toStatus: CaseStatus.RESOLVED, note: "Đã thay vòi", createdAt: daysAgo(7) },
        ],
      },
    },
  });

  // 5) CLOSED — đã đóng (resolvedAt + closedAt)
  await prisma.case.create({
    data: {
      title: "Đề nghị bổ sung quạt phòng học 205",
      description: "Phòng nóng vào buổi chiều.",
      location: "Phòng 205",
      categoryId: cat["Khác"].id,
      priority: CasePriority.LOW,
      status: CaseStatus.CLOSED,
      createdById: student.id,
      assignedToId: staff.id,
      createdAt: daysAgo(20),
      resolvedAt: daysAgo(15),
      closedAt: daysAgo(14),
      statusHistory: {
        create: [
          { changedById: student.id, fromStatus: null, toStatus: CaseStatus.NEW, createdAt: daysAgo(20) },
          { changedById: staff.id, fromStatus: CaseStatus.NEW, toStatus: CaseStatus.RESOLVED, createdAt: daysAgo(15) },
          { changedById: admin.id, fromStatus: CaseStatus.RESOLVED, toStatus: CaseStatus.CLOSED, note: "Hoàn tất", createdAt: daysAgo(14) },
        ],
      },
    },
  });

  // ── Notification + Audit log mẫu ──
  const emergencyCase = await prisma.case.findFirst({ where: { isEmergency: true }, select: { id: true, caseCode: true } });
  if (emergencyCase) {
    await prisma.notification.create({
      data: { userId: staff.id, caseId: emergencyCase.id, type: NotificationType.CASE_ASSIGNED, message: `Bạn được giao xử lý case ${emergencyCase.caseCode}.` },
    });
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: AuditAction.ASSIGN, entityType: "Case", entityId: emergencyCase.id, metadata: { before: { assignedTo: null }, after: { assignedTo: staff.id } } },
    });
  }

  await summary();
}

async function summary() {
  const [users, categories, cases, comments, history, notifs, audits] = await Promise.all([
    prisma.user.count(), prisma.category.count(), prisma.case.count(),
    prisma.comment.count(), prisma.caseStatusHistory.count(), prisma.notification.count(), prisma.auditLog.count(),
  ]);
  const sample = await prisma.case.findMany({ select: { caseCode: true, status: true }, orderBy: { createdAt: "asc" } });
  console.log("✔ Seed xong:", { users, categories, cases, comments, history, notifs, audits });
  console.log("  caseCodes:", sample.map((c) => `${c.caseCode}(${c.status})`).join(", "));
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("Seed lỗi:", e); await prisma.$disconnect(); process.exit(1); });
