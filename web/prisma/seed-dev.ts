import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, CaseStatus, CasePriority, NotificationType, AuditAction } from "../src/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ DEV-ONLY — DỮ LIỆU GIẢ để test API (P3+). KHÔNG chạy trên prod.
// Tạo vài CASE demo (gắn nhãn [DEMO]) tham chiếu category/location/user THẬT từ bootstrap.
// KHÔNG cấu hình vào prisma.config.ts `migrations.seed` → chỉ chạy thủ công: npx tsx prisma/seed-dev.ts
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });

async function main() {
  const existing = await prisma.case.count();
  if (existing > 0) {
    console.log(`✔ Đã có ${existing} case. Bỏ qua seed-dev (tránh trùng).`);
    await prisma.$disconnect();
    return;
  }

  // Lấy data THẬT từ bootstrap để gắn vào case demo
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN }, select: { id: true } });
  const student = await prisma.user.findFirst({ where: { role: Role.STUDENT }, select: { id: true }, orderBy: { sbd: "asc" } });
  if (!admin || !student) throw new Error("Chưa có admin/student — chạy bootstrap (prisma db seed) trước.");

  const catByName = async (n: string) => (await prisma.category.findUnique({ where: { name: n }, select: { id: true } }))!.id;
  const locByCode = async (c: string) => (await prisma.location.findUnique({ where: { code: c }, select: { id: true } }))!.id;

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

  // 1) NEW — học sinh bấm khẩn cấp
  await prisma.case.create({
    data: {
      title: "[DEMO] Đèn hành lang tầng 3 dãy A bị hỏng",
      description: "Khu vực tối vào buổi chiều, dễ vấp ngã.",
      categoryId: await catByName("Cơ sở vật chất"),
      locationId: await locByCode("A3.1"),
      priority: CasePriority.MEDIUM,
      status: CaseStatus.NEW,
      studentFlaggedEmergency: true,
      createdById: student.id,
      createdAt: daysAgo(1),
      statusHistory: { create: [{ changedById: student.id, toStatus: CaseStatus.NEW, note: "[DEMO] HS tạo báo cáo", createdAt: daysAgo(1) }] },
      comments: { create: [{ authorId: student.id, body: "[DEMO] Mong nhà trường xử lý sớm ạ." }] },
    },
  });

  // 2) IN_PROGRESS — khẩn cấp, nhạy cảm, đã giao admin
  const emCase = await prisma.case.create({
    data: {
      title: "[DEMO] Sự cố tại nhà thi đấu cần xử lý",
      description: "Tình huống cần xác minh và xử lý theo quy trình.",
      categoryId: await catByName("Khẩn cấp"),
      locationId: await locByCode("GYM-1"),
      priority: CasePriority.CRITICAL,
      status: CaseStatus.IN_PROGRESS,
      isSensitive: true,
      isEmergency: true,
      studentFlaggedEmergency: true,
      createdById: student.id,
      assignedToId: admin.id,
      createdAt: daysAgo(3),
      statusHistory: {
        create: [
          { changedById: student.id, toStatus: CaseStatus.NEW, createdAt: daysAgo(3) },
          { changedById: admin.id, fromStatus: CaseStatus.NEW, toStatus: CaseStatus.ASSIGNED, createdAt: daysAgo(2) },
          { changedById: admin.id, fromStatus: CaseStatus.ASSIGNED, toStatus: CaseStatus.IN_PROGRESS, createdAt: daysAgo(2) },
        ],
      },
      comments: { create: [{ authorId: admin.id, body: "[DEMO][Nội bộ] Đang xử lý.", isInternal: true }] },
    },
  });
  await prisma.notification.create({ data: { userId: admin.id, caseId: emCase.id, type: NotificationType.EMERGENCY_CONFIRMED, message: "[DEMO] Case khẩn cấp cần xử lý." } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: AuditAction.EMERGENCY_FLAG, entityType: "Case", entityId: emCase.id, metadata: { before: { isEmergency: false }, after: { isEmergency: true } } } });

  // 3) RESOLVED — đã xử lý xong
  await prisma.case.create({
    data: {
      title: "[DEMO] Vòi nước WC tầng 2 dãy B rò rỉ",
      description: "Gây trơn trượt.",
      categoryId: await catByName("Cơ sở vật chất"),
      locationId: await locByCode("B2-WC-HS"),
      priority: CasePriority.MEDIUM,
      status: CaseStatus.RESOLVED,
      createdById: student.id,
      assignedToId: admin.id,
      createdAt: daysAgo(8),
      resolvedAt: daysAgo(5),
      statusHistory: {
        create: [
          { changedById: student.id, toStatus: CaseStatus.NEW, createdAt: daysAgo(8) },
          { changedById: admin.id, fromStatus: CaseStatus.NEW, toStatus: CaseStatus.IN_PROGRESS, createdAt: daysAgo(7) },
          { changedById: admin.id, fromStatus: CaseStatus.IN_PROGRESS, toStatus: CaseStatus.RESOLVED, note: "[DEMO] Đã thay vòi", createdAt: daysAgo(5) },
        ],
      },
      comments: { create: [{ authorId: admin.id, body: "[DEMO] Đã xử lý xong." }] },
    },
  });

  const [cases, comments, history, notifs, audits] = await Promise.all([
    prisma.case.count(), prisma.comment.count(), prisma.caseStatusHistory.count(), prisma.notification.count(), prisma.auditLog.count(),
  ]);
  console.log("✔ seed-dev xong (DỮ LIỆU GIẢ):", { cases, comments, history, notifs, audits });
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error("seed-dev lỗi:", e); await prisma.$disconnect(); process.exit(1); });
