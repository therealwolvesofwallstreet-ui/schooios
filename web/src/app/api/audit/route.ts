import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";
import { Prisma, Role } from "@/generated/prisma/client";

// GET /api/audit — đọc audit log (CHỈ ADMIN/AUDITOR → khác 403). Phân trang page-based,
// tiebreaker {id} để paging tất định (created_at có thể trùng). actor select gọn {id,name,role}
// để KHÔNG rò PII/passwordHash. Bọc { logs, total, page, totalPages }.
const listAuditQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Bộ lọc tùy chọn (audit theo 1 entity, vd 1 case): không bắt buộc → test page/limit vẫn pass.
  entityType: z.string().min(1).max(64).optional(),
  entityId: z.string().min(1).max(64).optional(),
});

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.AUDITOR)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = listAuditQuery.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  const { page, limit, entityType, entityId } = parsed.data;
  const where: Prisma.AuditLogWhereInput = {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
  };

  try {
    const [logs, total] = await prisma.$transaction(
      [
        prisma.auditLog.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            metadata: true,
            createdAt: true,
            actorId: true,
            actor: { select: { id: true, name: true, role: true } },
          },
        }),
        prisma.auditLog.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("GET /api/audit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
