import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";

// GET /api/locations — địa điểm report đang hoạt động + thông tin tòa nhà (mọi role đã đăng nhập).
// Dùng nạp dropdown ở form tạo case. Response bọc theo key tài nguyên: { locations }.
export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        floor: true,
        type: true,
        buildingId: true,
        building: { select: { id: true, code: true, name: true } },
      },
    });
    return NextResponse.json({ locations });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("GET /api/locations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
