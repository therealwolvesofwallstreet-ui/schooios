import { config } from "dotenv";
import { defineConfig } from "prisma/config"; // Kiểm tra lại import này tùy version

config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Sửa dòng này để dùng DIRECT_URL cho Migrate (port 6543 nếu 5432 bị chặn)
    url: process.env["DIRECT_URL"],
  },
});