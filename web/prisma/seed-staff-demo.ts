import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// SEED DEMO STAFF — ~20 tài khoản role=STAFF cho buổi demo.
// • Idempotent: upsert theo email (chạy lại KHÔNG nhân đôi).
// • mustChangePassword=false → demo khỏi bị ép đổi mật khẩu.
// • Mật khẩu SINH NGẪU NHIÊN lúc chạy → ghi ra web/.local-credentials.txt (gitignored).
//   ⚠ Chạy lại sẽ XOAY (rotate) mật khẩu + ghi đè file credentials cho khớp DB.
// • Dùng DATABASE_URL (khớp guard C4). Chạy: npx tsx prisma/seed-staff-demo.ts
// ─────────────────────────────────────────────────────────────────────────────

const CONNECTION = process.env.DATABASE_URL;
if (!CONNECTION) {
  console.error("✘ DATABASE_URL chưa set — đặt vào web/.env.local trước khi seed.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: CONNECTION }) });

// 20 họ tên hợp lý (demo) — KHÔNG phải người thật.
const STAFF_NAMES = [
  "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thị Dung",
  "Hoàng Văn Em", "Vũ Thị Giang", "Đặng Minh Hải", "Bùi Thị Hoa",
  "Ngô Văn Khoa", "Dương Thị Lan", "Đỗ Văn Minh", "Hồ Thị Nga",
  "Phan Văn Phúc", "Võ Thị Quyên", "Đinh Văn Sơn", "Trương Thị Thảo",
  "Lý Văn Tuấn", "Mai Thị Uyên", "Cao Văn Việt", "Tạ Thị Xuân",
];

/** Mật khẩu mạnh, dễ đọc khi demo: Demo@ + 8 ký tự an toàn. */
function genPassword(): string {
  const raw = randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  return `Demo@${(raw + "abcd1234").slice(0, 8)}`;
}

async function main() {
  // Guard phụ (defense-in-depth) — in host ra để chắc đúng DB.
  try {
    console.log("→ SEED TARGET host =", new URL(CONNECTION!).host);
  } catch {
    console.warn("⚠ Không parse được DATABASE_URL để in host.");
  }

  const credentials: Array<{ email: string; password: string; name: string }> = [];

  for (let i = 0; i < STAFF_NAMES.length; i++) {
    const num = String(i + 1).padStart(3, "0");
    const email = `gv${num}@demo.ltt`;
    const name = STAFF_NAMES[i];
    const password = genPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
      where: { email },
      update: { name, role: Role.STAFF, passwordHash, mustChangePassword: false, isActive: true },
      create: { email, name, role: Role.STAFF, passwordHash, mustChangePassword: false, isActive: true },
    });
    credentials.push({ email, password, name });
  }

  // Ghi danh sách plaintext NGOÀI git (để phát khi demo).
  const credPath = path.join(process.cwd(), ".local-credentials.txt");
  const header = `# SchooIOS — tài khoản STAFF demo (KHÔNG commit, KHÔNG chia sẻ rộng)\n# Sinh lúc seed; chạy lại seed sẽ xoay mật khẩu.\n# Đăng nhập STAFF bằng EMAIL + mật khẩu.\n\n`;
  const body = credentials
    .map((c) => `${c.email}\t${c.password}\t${c.name}`)
    .join("\n");
  fs.writeFileSync(credPath, header + body + "\n", "utf8");

  const [staff, admin] = await Promise.all([
    prisma.user.count({ where: { role: Role.STAFF } }),
    prisma.user.count({ where: { role: Role.ADMIN } }),
  ]);
  console.log(`✔ seed-staff-demo xong: ${credentials.length} STAFF upsert.`);
  console.log(`✔ Tổng trong DB: STAFF=${staff} · ADMIN=${admin}`);
  console.log(`✔ Danh sách mật khẩu (plaintext) ghi tại: ${credPath}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("seed-staff-demo lỗi:", e);
  await prisma.$disconnect();
  process.exit(1);
});
