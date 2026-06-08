import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP seed — dữ liệu THẬT của trường (Trường THPT Chuyên Lý Tự Trọng).
// Nguồn: docs/data/*.json. Idempotent. KHÔNG tạo case/student giả (case thật từ app).
// students.json chứa PII (gitignored) → OPTIONAL: vắng thì bỏ qua students+enrollments.
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "../../docs/data");
const readJson = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const campus = readJson("campus.json");
  const classesData = readJson("classes.json");
  const schoolYear: string = classesData.meta?.schoolYear ?? "2025-2026";

  // ── 1. Categories (upsert by name) ──
  for (const c of campus.categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { defaultPriority: c.defaultPriority, defaultSensitive: c.defaultSensitive, description: c.note ?? null },
      create: { name: c.name, defaultPriority: c.defaultPriority, defaultSensitive: c.defaultSensitive, description: c.note ?? null },
    });
  }

  // ── 2. Buildings (upsert by code) ──
  for (const b of campus.buildings) {
    await prisma.building.upsert({
      where: { code: b.code },
      update: { name: b.name, type: b.type, note: b.note ?? null },
      create: { code: b.code, name: b.name, type: b.type, note: b.note ?? null },
    });
  }
  const buildings = await prisma.building.findMany({ select: { id: true, code: true } });
  const buildingByCode = new Map(buildings.map((b) => [b.code, b.id]));

  // ── 3. Locations (upsert by code; buildingCode → buildingId) ──
  for (const l of campus.locations) {
    const buildingId = l.buildingCode ? buildingByCode.get(l.buildingCode) ?? null : null;
    await prisma.location.upsert({
      where: { code: l.code },
      update: { name: l.name, buildingId, floor: l.floor ?? null, type: l.type, note: l.note ?? null },
      create: { code: l.code, name: l.name, buildingId, floor: l.floor ?? null, type: l.type, note: l.note ?? null },
    });
  }

  // ── 4. Admins (upsert by email; mật khẩu từ env) ──
  const adminPw = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  if (!process.env.SEED_ADMIN_PASSWORD) console.warn("⚠ SEED_ADMIN_PASSWORD chưa set — dùng mật khẩu mặc định 'Admin@12345' (đổi sau khi đăng nhập).");
  const adminHash = await bcrypt.hash(adminPw, 10);
  for (const a of campus.admins) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { name: a.name, role: Role.ADMIN },
      create: { email: a.email, name: a.name, role: Role.ADMIN, passwordHash: adminHash },
    });
  }

  // ── 5. Classes (upsert by [name, schoolYear]) ──
  for (const c of classesData.classes) {
    await prisma.class.upsert({
      where: { name_schoolYear: { name: c.name, schoolYear: c.schoolYear } },
      update: { grade: c.grade ?? null, specialization: c.specialization ?? null },
      create: { name: c.name, schoolYear: c.schoolYear, grade: c.grade ?? null, specialization: c.specialization ?? null },
    });
  }
  const classes = await prisma.class.findMany({ where: { schoolYear }, select: { id: true, name: true } });
  const classByName = new Map(classes.map((c) => [c.name, c.id]));

  // ── 6. Students (979) — OPTIONAL (PII, gitignored) ──
  const studentsPath = path.join(DATA, "students.json");
  if (!fs.existsSync(studentsPath)) {
    console.warn("⚠ docs/data/students.json không có (PII/gitignored) — BỎ QUA students + enrollments.");
  } else {
    const students = JSON.parse(fs.readFileSync(studentsPath, "utf8")).students;
    const studentHash = await bcrypt.hash("123456", 10); // hash 1 lần, dùng chung 979 HS (đổi sau lần đầu)
    await prisma.user.createMany({
      skipDuplicates: true,
      data: students.map((s: any) => ({
        sbd: s.sbd,
        name: s.name,
        role: Role.STUDENT,
        dob: s.dob ? new Date(s.dob) : null,
        gender: s.gender ?? null,
        admissionYear: s.admissionYear ?? null,
        passwordHash: studentHash,
      })),
    });

    // ── 7. Enrollments (student ↔ class theo className) ──
    const studentRows = await prisma.user.findMany({ where: { role: Role.STUDENT }, select: { id: true, sbd: true } });
    const idBySbd = new Map(studentRows.map((u) => [u.sbd, u.id]));
    const enrollData: { studentId: string; classId: string }[] = [];
    const missingClass = new Set<string>();
    for (const s of students) {
      const studentId = idBySbd.get(s.sbd);
      const classId = classByName.get(s.className);
      if (studentId && classId) enrollData.push({ studentId, classId });
      else if (!classId) missingClass.add(s.className);
    }
    if (missingClass.size) console.warn("⚠ className không khớp class:", [...missingClass].join(", "));
    await prisma.enrollment.createMany({ skipDuplicates: true, data: enrollData });
  }

  await summary();
}

async function summary() {
  const [categories, buildings, locations, admins, classes, students, enrollments] = await Promise.all([
    prisma.category.count(),
    prisma.building.count(),
    prisma.location.count(),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.class.count(),
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.enrollment.count(),
  ]);
  console.log("✔ Bootstrap xong:", { categories, buildings, locations, admins, classes, students, enrollments });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("Seed lỗi:", e); await prisma.$disconnect(); process.exit(1); });
