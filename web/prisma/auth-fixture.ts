// Fixture ephemeral cho test P3 — KHÔNG đụng 979 HS / 3 admin thật.
// setup (mặc định): upsert user test về trạng thái baseline (rerunnable kể cả sau khi test đổi MK).
// --teardown: hard-delete nếu được; nếu user đã có audit log (immutable → cascade SetNull bị trigger
//   chặn) thì fallback deactivate. Đặt ở prisma/ để resolve node_modules giống seed.ts.
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const SBD = "T3-0001"; // định danh tổng hợp, không trùng SBD thật (dạng 6 số)

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function setup() {
  const passwordHash = await bcrypt.hash("123456", 10);
  const baseline = {
    name: "P3 Test",
    role: Role.STUDENT,
    isActive: true,
    mustChangePassword: true,
    passwordHash,
  };
  const u = await prisma.user.upsert({
    where: { sbd: SBD },
    update: baseline, // RESET (test case 8 đổi mật khẩu → phải reset để chạy lại được)
    create: { sbd: SBD, ...baseline },
  });
  console.log(`fixture ready: sbd=${SBD} id=${u.id}`);
}

async function teardown() {
  const u = await prisma.user.findUnique({ where: { sbd: SBD } });
  if (!u) {
    console.log("fixture absent");
    return;
  }
  try {
    await prisma.user.delete({ where: { sbd: SBD } });
    console.log("fixture deleted");
  } catch {
    // User có audit log → hard-delete bị chặn (audit_logs immutable, FK SetNull = UPDATE bị trigger chặn).
    await prisma.user.update({ where: { sbd: SBD }, data: { isActive: false } });
    console.log("fixture deactivated (immutable audit rows present → hard-delete blocked by design)");
  }
}

const mode = process.argv.includes("--teardown") ? "teardown" : "setup";
(mode === "teardown" ? teardown() : setup())
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("fixture error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
