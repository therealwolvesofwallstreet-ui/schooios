"use client";

// AGING BADGE — pill mono chỉ-báo TỒN-ĐỌNG (tuổi tính client từ createdAt; xem lib/case-aging.ts).
// CHỈ hiện khi vụ còn MỞ ∧ tier≠fresh. Thang màu trong họ GOLD (đã-ghi-nhận/cần-chú-ý) — KHÔNG đỏ
// (đỏ = oxblood emergency dành cho khẩn thật): aging = gold-fill nhạt · stale = gold đậm (đầy, nhấn).
// 0 hex hardcode (token gold/gold-fill/ink). RESOLVED/CLOSED → KHÔNG render.
import { caseAge } from "@/lib/case-aging";
import type { CaseStatus } from "@/lib/api-types";
import { cn } from "@/lib/cn";

export function AgingBadge({
  createdAt,
  status,
  className,
}: {
  createdAt: string;
  status: CaseStatus;
  className?: string;
}) {
  const { days, tier, isOpen } = caseAge(createdAt, status);
  if (!isOpen || tier === "fresh") return null;
  return (
    <span
      data-testid="aging-badge"
      data-tier={tier}
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] tabular-nums",
        tier === "stale" ? "bg-gold text-ink font-medium" : "bg-gold-fill text-ink",
        className,
      )}
    >
      Tồn {days} ngày
    </span>
  );
}
