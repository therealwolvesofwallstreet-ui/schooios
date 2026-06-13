// GET /api/cases/[id] — detail 1 case theo quyền role.
// findFirst + caseWhereForRole → không thấy thì 404 đồng nhất (chống enumeration, không lộ 403/404).
// requireUser: re-check isActive (đồng bộ POST/list). Next 16: params là Promise → phải await.
// Update A: comments lọc deletedAt IS NULL + kèm parentId; vote aggregate thêm additive.
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
        // STUDENT không thấy isInternal; deletedAt IS NULL lọc comment đã xoá (Update A).
        comments: {
          where: {
            deletedAt: null,
            ...(user.role === "STUDENT" ? { isInternal: false } : {}),
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true, caseId: true, authorId: true, body: true, isInternal: true,
            parentId: true, createdAt: true, updatedAt: true,
            author: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Vote aggregate (additive — KHÔNG lộ danh tính voter).
    const [voteGroups, myVoteRow] = await Promise.all([
      prisma.vote.groupBy({
        by: ["value"],
        where: { caseId: id },
        _count: { value: true },
      }),
      prisma.vote.findUnique({
        where: { userId_caseId: { userId: user.id, caseId: id } },
        select: { value: true },
      }),
    ]);
    const upCount = voteGroups.find((g) => g.value === 1)?._count.value ?? 0;
    const downCount = voteGroups.find((g) => g.value === -1)?._count.value ?? 0;
    const enriched = {
      ...found,
      upCount,
      downCount,
      score: upCount - downCount,
      myVote: (myVoteRow?.value ?? null) as 1 | -1 | null,
    };

    return NextResponse.json({ case: enriched });
  } catch (err) {
    console.error("cases [id] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
