import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";

// GET /api/categories — lookup loại sự vụ đang hoạt động (mọi role đã đăng nhập).
// Dùng nạp dropdown ở form tạo case. Response bọc theo key tài nguyên: { categories }.
export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        defaultPriority: true,
        defaultSensitive: true,
      },
    });
    return NextResponse.json({ categories });
  } catch (err) {
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("GET /api/categories error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
