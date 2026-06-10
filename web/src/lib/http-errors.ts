// Phân loại lỗi tầng mutation → mã HTTP đúng ngữ nghĩa, thay vì nuốt mọi thứ thành 500.
// Dùng chung cho các route PATCH (assign/status). Giữ "nuốt-thành-500" CHỈ cho lỗi thật sự bất ngờ.
//  - ConflictError (thua optimistic-lock updatedAt)            → 409.
//  - Xung đột đồng thời ở DB (serialization 40001 / deadlock 40P01) → 409 (retry được ngay).
//  - Cạn tài nguyên / timeout (pool P2024, transaction P2028,
//    lock_not_available 55P03, statement_timeout 57014)        → 503 (retry sau, kèm Retry-After).
//  - Còn lại                                                    → null (route tự trả 500).
import { Prisma } from "@/generated/prisma/client";
import { ConflictError } from "@/lib/workflow";

export type MappedError = { status: number; error: string };

export function classifyMutationError(err: unknown): MappedError | null {
  if (err instanceof ConflictError) return { status: 409, error: "Conflict" };

  // Lấy mã lỗi từ Prisma known-error (P20xx) hoặc SQLSTATE của driver pg (err.code).
  const code =
    err instanceof Prisma.PrismaClientKnownRequestError
      ? err.code
      : typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: unknown }).code)
        : "";

  if (code === "40001" || code === "40P01")
    return { status: 409, error: "Conflict, please retry" };

  if (code === "P2024" || code === "P2028" || code === "55P03" || code === "57014")
    return { status: 503, error: "Service busy, please retry" };

  return null;
}
