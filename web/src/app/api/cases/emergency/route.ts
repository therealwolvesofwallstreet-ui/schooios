// GET /api/cases/emergency — LANE khẩn cấp: case isEmergency=true (chưa soft-delete).
//   Case CÔNG KHAI (isSensitive=false): BỎ QUA scope assignment/status của STAFF — mọi STAFF/ADMIN/
//   AUDITOR thấy hết, kể cả không được giao + status ∉ NEW/TRIAGED (cấp cứu cần phản ứng nhanh).
//   Case NHẠY CẢM (isSensitive=true): CHỈ hiện cho ADMIN/AUDITOR (giám sát/điều phối toàn cục) + STAFF
//   ĐƯỢC GIAO (assignedToId=mình) — KHÔNG broadcast nội dung nhạy cảm cho STAFF khác (chính sách đã chốt).
//   STUDENT → 403 (không có quyền lane).
//
//   ?activeOnly=true → loại case đã RESOLVED/CLOSED (chỉ còn emergency đang mở).
//   PII-safe: createdBy/assignedTo chỉ id/name(/role); KHÔNG lộ email/sbd/dob. orderBy createdAt desc
//   + id desc (tiebreak tất định khi trùng mốc thời gian). Phân biệt với /cases/[id] vì "emergency" là
//   segment TĨNH (Next ưu tiên tĩnh hơn dynamic [id]).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";
import { CaseStatus, Role } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === Role.STUDENT)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";

    // Case công khai: STAFF thấy hết (bỏ scope). Case nhạy cảm: STAFF chỉ thấy nếu được giao
    // (assignedToId=mình); ADMIN/AUDITOR thấy tất. activeOnly thêm lọc status đang mở.
    const where: Prisma.CaseWhereInput = {
      isEmergency: true,
      deletedAt: null,
      ...(activeOnly
        ? { status: { notIn: [CaseStatus.RESOLVED, CaseStatus.CLOSED] } }
        : {}),
      ...(user.role === Role.STAFF
        ? { OR: [{ isSensitive: false }, { assignedToId: user.id }] }
        : {}),
    };

    const cases = await prisma.case.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        category: { select: { id: true, name: true } },
        locationRef: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ cases, total: cases.length });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("cases emergency lane GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
