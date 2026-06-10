// Nguồn DUY NHẤT ghi AuditLog (immutable — DB trigger chặn UPDATE/DELETE; chỉ INSERT).
// metadata convention: { before, after, ...context }. KHÔNG bao giờ ghi mật khẩu/secret vào metadata.
import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@/generated/prisma/client";

type RecordAuditInput = {
  action: AuditAction;
  entityType: string; // "User", "Case", ...
  entityId: string;
  actorId?: string | null; // null = hành động hệ thống
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
