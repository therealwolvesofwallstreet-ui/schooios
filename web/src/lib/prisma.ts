import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 (generator `prisma-client`) bắt buộc driver adapter ở runtime.
// Runtime app dùng DATABASE_URL (pooled, transaction mode).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // Không bao giờ trả password_hash mặc định (CLAUDE.md). Auth login phải opt-in
    // bằng `omit: { passwordHash: false }` hoặc `select` tường minh khi cần so khớp.
    omit: { user: { passwordHash: true } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
