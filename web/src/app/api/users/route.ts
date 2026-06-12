import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";
import { Role } from "@/generated/prisma/client";

// GET /api/users — danh sách user có thể giao việc (ADMIN-only; STAFF/STUDENT/AUDITOR → 403; anon → 401).
// Dùng nạp picker "Giao cho…" + cân tải ADMIN. KHÔNG phơi PII: chỉ {id,name,role}.
// ?role∈{STAFF,ADMIN} (default STAFF; STUDENT/AUDITOR/rác → 400). Chỉ isActive=true.
// Sort (name asc, id asc) tất định; phân trang page-based với tiebreaker id.
const listUsersQuery = z.object({
  role: z
    .enum(["STAFF", "ADMIN"])
    .default("STAFF"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = listUsersQuery.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  const { role, page, limit } = parsed.data;

  try {
    const where = { role: role as Role, isActive: true };
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, name: true, role: true },
      }),
      prisma.user.count({ where }),
    ]);
    return NextResponse.json({
      users,
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
    console.error("GET /api/users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
