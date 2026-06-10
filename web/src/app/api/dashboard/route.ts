// GET /api/dashboard — số liệu tổng hợp THUẦN CODE (Prisma count/groupBy, KHÔNG AI). Nguồn data cho
//   chart/heatmap FE. Role ∈ {ADMIN, AUDITOR}; STAFF/STUDENT → 403 (dashboard theo-scope-STAFF để sau).
//
// ── Biên metric (chốt, KHÔNG suy đoán) ──
//   • MỌI metric chỉ tính case deletedAt=null (loại soft-deleted tuyệt đối).
//   • totalCases = TẤT CẢ case — các tập con (emergency/stale/unassigned) CHỒNG LẤN, không phải phân hoạch.
//   • newToday = case tạo trong 24h gần nhất (rolling, không phải lịch).
//   • emergencyOpen = isEmergency ∧ status ∉ {RESOLVED,CLOSED}.
//   • stale = status ∉ {RESOLVED,CLOSED} ∧ createdAt < now-7d (thay 'overdue' — dueAt deferred).
//     CÓ tính WAITING_FOR_USER nếu quá hạn (chủ ý: mọi case mở ứ đọng đều tính).
//   • byStatus/byPriority: groupBy phủ mọi case → Σ _count == totalCases (sanity-check).
//   • byCategory: map tên theo CHÍNH các id xuất hiện, KỂ CẢ category isActive=false (không bỏ sót case cũ).
//   • byLocation chỉ gồm locationId≠null (kèm code/name cho heatmap); case null nằm ở `unlocated`.
//     byLocation(Σ count) + unlocated == totalCases.
//
//   Đọc nhất quán: gói toàn bộ count/groupBy trong 1 $transaction RepeatableRead → snapshot duy nhất
//   ⇒ các sanity-check Σ luôn đúng kể cả khi có ghi xen giữa. Read-only nên không vướng 40001.
//   Enrich tên (Category/Location) chạy SAU snapshot (chỉ là nhãn — count đã chốt trong snapshot).
//   avgResolutionHours: BỎ ở phase này (không nằm trong hợp đồng response) — dễ thêm sau qua $queryRaw.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";
import { CaseStatus, Prisma, Role } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== Role.ADMIN && user.role !== Role.AUDITOR)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Mốc thời gian tính 1 lần đầu hàm (new Date() được phép trong route handler).
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const open = { notIn: [CaseStatus.RESOLVED, CaseStatus.CLOSED] };

    const [
      totalCases,
      newToday,
      emergencyOpen,
      unassigned,
      stale,
      byStatus,
      byPriority,
      byCategoryRaw,
      byLocationRaw,
      unlocated,
    ] = await prisma.$transaction(
      [
        prisma.case.count({ where: { deletedAt: null } }),
        prisma.case.count({ where: { deletedAt: null, createdAt: { gte: dayAgo } } }),
        prisma.case.count({ where: { deletedAt: null, isEmergency: true, status: open } }),
        prisma.case.count({
          where: { deletedAt: null, assignedToId: null, status: { in: [CaseStatus.NEW, CaseStatus.TRIAGED] } },
        }),
        prisma.case.count({ where: { deletedAt: null, status: open, createdAt: { lt: weekAgo } } }),
        prisma.case.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true, orderBy: { status: "asc" } }),
        prisma.case.groupBy({ by: ["priority"], where: { deletedAt: null }, _count: true, orderBy: { priority: "asc" } }),
        prisma.case.groupBy({ by: ["categoryId"], where: { deletedAt: null }, _count: true, orderBy: { categoryId: "asc" } }),
        prisma.case.groupBy({
          by: ["locationId"],
          where: { deletedAt: null, locationId: { not: null } },
          _count: true,
          orderBy: { locationId: "asc" },
        }),
        prisma.case.count({ where: { deletedAt: null, locationId: null } }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    // Enrich nhãn category. AN TOÀN dù chạy SAU snapshot vì Category/Location dùng FK Restrict: case
    // còn tham chiếu ⇒ KHÔNG thể xoá ⇒ id trong groupBy LUÔN còn → name không bao giờ null (`?? null`
    // chỉ là phòng thủ, không reachable). Rename đồng thời chỉ cho nhãn MỚI hơn — count vẫn theo snapshot,
    // cả hai đều đúng (cùng một category, đổi tên không đổi tập case). KHÔNG lọc isActive (giữ category đã ẩn).
    const catIds = byCategoryRaw.map((g) => g.categoryId);
    const cats = await prisma.category.findMany({
      where: { id: { in: catIds } },
      select: { id: true, name: true },
    });
    const catName = new Map(cats.map((c) => [c.id, c.name]));
    const byCategory = byCategoryRaw.map((g) => ({
      categoryId: g.categoryId,
      name: catName.get(g.categoryId) ?? null,
      count: g._count,
    }));

    // Enrich nhãn location (code/name cho heatmap). locationId chắc chắn ≠ null (đã lọc trong groupBy).
    const locIds = byLocationRaw
      .map((g) => g.locationId)
      .filter((x): x is string => x !== null);
    const locs = await prisma.location.findMany({
      where: { id: { in: locIds } },
      select: { id: true, code: true, name: true },
    });
    const locInfo = new Map(locs.map((l) => [l.id, l]));
    const byLocation = byLocationRaw.map((g) => {
      const l = g.locationId ? locInfo.get(g.locationId) : undefined;
      return {
        locationId: g.locationId,
        code: l?.code ?? null,
        name: l?.name ?? null,
        count: g._count,
      };
    });

    console.info("dashboard: avgResolutionHours skipped (deferred)");

    return NextResponse.json({
      totalCases,
      newToday,
      emergencyOpen,
      unassigned,
      stale,
      byStatus,
      byPriority,
      byCategory,
      byLocation,
      unlocated,
    });
  } catch (err) {
    // Mở $transaction (RepeatableRead) → cạn pool/timeout là lỗi tạm thời → 503 + Retry-After.
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("dashboard GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
