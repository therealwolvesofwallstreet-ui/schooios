import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js giữ secret trong .env.local (gitignored); .env chỉ chứa default không nhạy cảm.
// dotenv không override key đã set → nạp .env.local trước để nó thắng, rồi .env bù phần thiếu.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma db seed` chạy bootstrap dữ liệu thật. (seed-dev.ts cố ý KHÔNG ở đây — chỉ chạy thủ công.)
    seed: "tsx prisma/seed.ts",
  },
  // Migrate/CLI dùng kết nối TRỰC TIẾP (DIRECT_URL — session pooler 5432, non-pooled cho DDL/advisory locks).
  // Runtime app dùng DATABASE_URL (pooled) qua adapter trong src/lib/prisma.ts.
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
