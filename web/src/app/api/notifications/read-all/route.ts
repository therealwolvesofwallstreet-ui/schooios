// PATCH /api/notifications/read-all — đánh dấu mọi notification CHƯA ĐỌC của tôi thành đã đọc.
//   updateMany ghim userId=mình + isRead=false → chỉ đụng của tôi, idempotent (gọi lại updated=0).
//
// KHÔNG audit — QUYẾT ĐỊNH CÓ CHỦ Ý (không phải bỏ sót): thao tác cá nhân, tần suất cao, không phải
//   mutation nghiệp vụ. Đánh đổi: trạng thái đã-đọc của notification không có lịch sử forensic.
//   (notifications KHÔNG bị immutable trigger nên UPDATE hợp lệ — khác audit_logs/case_status_history.)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { classifyMutationError } from "@/lib/http-errors";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const r = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true, updated: r.count });
  } catch (err) {
    // DB tạm thời (cạn pool/timeout) → 503 + Retry-After (nhất quán house-style P5); còn lại 500.
    const mapped = classifyMutationError(err);
    if (mapped) {
      const res = NextResponse.json({ error: mapped.error }, { status: mapped.status });
      if (mapped.status === 503) res.headers.set("Retry-After", "1");
      return res;
    }
    console.error("notifications read-all PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
