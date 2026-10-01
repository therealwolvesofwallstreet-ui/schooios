"use client";

// AGING BADGE — nhãn viền chỉ-báo TỒN-ĐỌNG (tuổi tính client từ createdAt; xem lib/case-aging.ts).
// CHỈ hiện khi vụ còn MỞ và tier khác fresh. KHÔNG đỏ (đỏ dành cho khẩn): aging = viền nhạt, stale = viền đậm.
// RESOLVED/CLOSED → KHÔNG render.
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
        "shrink-0 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap tabular-nums",
        tier === "stale" ? "border-ink-3 text-ink font-medium" : "border-line-2 text-ink-2",
        className,
      )}
    >
      Tồn {days} ngày
    </span>
  );
}
