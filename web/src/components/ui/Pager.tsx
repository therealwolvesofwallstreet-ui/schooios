// Pager — phân trang SERVER-DRIVEN (UI Grammar): "Trước/Sau" + chỉ-báo mono "trang X / Y".
// FE KHÔNG tự sort/ghép trang (hợp đồng API.md: sort `(createdAt desc, id desc)` & paging là của
// server) — chỉ đổi `page` rồi để server trả lát đúng. ≤1 trang → KHÔNG render (không nhiễu).
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export function Pager({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const btn =
    "text-ink-2 hover:text-ink disabled:text-ink-3/40 disabled:cursor-default flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

  return (
    <nav
      aria-label="Phân trang"
      className={cn("flex items-center justify-between gap-4 pt-2", className)}
    >
      <button
        type="button"
        data-testid="pager-prev"
        disabled={!canPrev}
        onClick={() => canPrev && onPageChange(page - 1)}
        className={btn}
      >
        <CaretLeft size={14} weight="light" />
        Trước
      </button>
      <span className="text-ink-3 font-mono text-[11px] tracking-[0.12em] tabular-nums">
        trang {page} / {totalPages}
      </span>
      <button
        type="button"
        data-testid="pager-next"
        disabled={!canNext}
        onClick={() => canNext && onPageChange(page + 1)}
        className={btn}
      >
        Sau
        <CaretRight size={14} weight="light" />
      </button>
    </nav>
  );
}
