// GET /api/cases/[id] — detail 1 case theo quyền role.
// findFirst + caseWhereForRole → không thấy thì 404 đồng nhất (chống enumeration, không lộ 403/404).
// requireUser: re-check isActive (đồng bộ POST/list). Next 16: params là Promise → phải await.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { caseWhereForRole, caseDetailInclude } from "@/lib/cases";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const found = await prisma.case.findFirst({
      where: { id, ...caseWhereForRole({ sub: user.id, role: user.role }) },
      include: {
        ...caseDetailInclude,
        // STUDENT không thấy comment nội bộ; role khác thấy hết.
        comments: {
          where: user.role === "STUDENT" ? { isInternal: false } : {},
          orderBy: [{ createdAt: "asc" }, { id: "asc" }], // id tiebreaker → thứ tự tất định khi trùng createdAt
          include: { author: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ case: found });
  } catch (err) {
    console.error("cases [id] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
