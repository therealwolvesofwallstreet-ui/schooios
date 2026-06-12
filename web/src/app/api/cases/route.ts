// /api/cases — POST tạo case (mọi role TRỪ AUDITOR) + GET list (lọc theo role).
// Authz lặp ở route (proxy chỉ gác sớm). caseCode do DB tự sinh — KHÔNG truyền.
// requireUser (KHÔNG phải getAuthPayload trần): vừa lấy {sub, role} vừa re-check isActive từ DB
// → user bị vô hiệu hoá mất quyền ngay dù JWT chưa hết hạn (đồng bộ login/change-password P3).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, clientMeta } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { createCaseSchema, listCasesQuery } from "@/lib/validation";
import { caseWhereForRole } from "@/lib/cases";
import { classifyMutationError } from "@/lib/http-errors";
import { AuditAction, CasePriority, CaseStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === "AUDITOR")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createCaseSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    const body = parsed.data;

    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category || !category.isActive)
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });

    if (body.locationId) {
      const loc = await prisma.location.findUnique({ where: { id: body.locationId } });
      if (!loc) return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }

    const priority = body.priority ?? category.defaultPriority ?? CasePriority.MEDIUM;
    const isSensitive = body.sensitive === true || category.defaultSensitive; // escalate-only
    const studentFlaggedEmergency = body.emergency === true;

    const created = await prisma.case.create({
      data: {
        title: body.title,
        description: body.description,
        categoryId: body.categoryId,
        locationId: body.locationId ?? null,
        priority,
        status: CaseStatus.NEW,
        isSensitive,
        studentFlaggedEmergency,
        isEmergency: false, // cờ chính thức do STAFF/ADMIN/AI duyệt ở P7 — luôn false khi tạo
        createdById: user.id,
        statusHistory: { create: [{ changedById: user.id, toStatus: CaseStatus.NEW }] },
      },
      // Trả case ĐÃ enrich (list-item shape) → response 201 khớp CaseListItem (FE không phải refetch
      // để có category/createdBy; bỏ cast không an toàn ở store).
      include: {
        category: { select: { id: true, name: true } },
        locationRef: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Audit fail-closed: ghi CREATE trước khi trả 201; lỗi audit → 500 (đồng bộ login P3).
    await recordAudit({
      action: AuditAction.CREATE,
      entityType: "Case",
      entityId: created.id,
      actorId: user.id,
      metadata: {
        after: {
          caseCode: created.caseCode,
          title: created.title,
          status: created.status,
          priority: created.priority,
          isSensitive: created.isSensitive,
          studentFlaggedEmergency: created.studentFlaggedEmergency,
          categoryId: created.categoryId,
          locationId: created.locationId ?? null,
        },
      },
      ...clientMeta(request),
    });

    return NextResponse.json({ case: created }, { status: 201 });
  } catch (err) {
    // DB bận/timeout → 503 + Retry-After (parity với status/assign/emergency; FE đã có nhánh 503).
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("cases POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = listCasesQuery.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.issues },
        { status: 400 },
      );
    const { status, isEmergency, page, limit } = parsed.data;

    // AND giữ nguyên OR của role (spread MẢNG điều kiện, không spread object).
    const where: Prisma.CaseWhereInput = {
      AND: [
        caseWhereForRole({ sub: user.id, role: user.role }),
        ...(status !== undefined ? [{ status: { in: status } }] : []),
        ...(isEmergency !== undefined ? [{ isEmergency }] : []),
      ],
    };

    const [total, cases] = await Promise.all([
      prisma.case.count({ where }),
      prisma.case.findMany({
        where,
        // id làm tiebreaker → phân trang tất định khi trùng createdAt.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          locationRef: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      cases,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("cases GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
