"use client";

// Dòng-chọn biên tập (KHÔNG dropdown): radiogroup các hàng hairline. Chọn = nhấn mực (dot running
// ink + chữ đậm), KHÔNG đỏ — signal đỏ để dành cho CTA duy nhất của màn (luật signal HIẾM).
// States: loading → khối thở (Skeleton) · error → dòng mono ink-dim · empty → EmptyState serif.
import { useRef } from "react";
import { SignalDot } from "@/components/ui/SignalDot";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

export interface Choice {
  id: string;
  label: string;
  hint?: string;
}

interface ChoiceListProps {
  items: Choice[];
  value: string | null;
  onChange: (id: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  /** Tải lại khi lookup lỗi — chống dead-end ở bước bắt buộc (vd category). */
  onRetry?: () => void;
  "aria-label"?: string;
}

export function ChoiceList({
  items,
  value,
  onChange,
  isLoading,
  isError,
  emptyMessage = "Chưa có lựa chọn nào.",
  onRetry,
  "aria-label": ariaLabel,
}: ChoiceListProps) {
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-line border-b py-3.5">
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 py-4">
        <p className="text-ink-3 font-mono text-xs">Không tải được danh sách.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-ink-2 hover:text-ink text-xs underline underline-offset-4 transition-colors duration-150 ease-quiet"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState message={emptyMessage} className="py-10" />;
  }

  // Roving (APG radiogroup): một Tab-stop duy nhất; mũi tên/ Home/ End di chuyển trong nhóm.
  const focusSelect = (idx: number) => {
    onChange(items[idx].id);
    rowRefs.current[idx]?.focus();
  };
  const move = (from: number, delta: number) =>
    focusSelect((from + delta + items.length) % items.length);
  // Hàng được Tab tới = hàng đang chọn (hoặc hàng đầu nếu chưa chọn) — phần còn lại tabIndex -1.
  const activeIndex = items.findIndex((it) => it.id === value);
  const tabbableIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-col">
      {items.map((item, i) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === tabbableIndex ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => {
              switch (e.key) {
                case "ArrowDown":
                case "ArrowRight":
                  e.preventDefault();
                  move(i, 1);
                  break;
                case "ArrowUp":
                case "ArrowLeft":
                  e.preventDefault();
                  move(i, -1);
                  break;
                case "Home":
                  e.preventDefault();
                  focusSelect(0);
                  break;
                case "End":
                  e.preventDefault();
                  focusSelect(items.length - 1);
                  break;
              }
            }}
            className={cn(
              "border-line flex w-full items-center gap-3 border-b py-3.5 text-left transition-colors duration-150 ease-quiet outline-none",
              "focus-visible:bg-sunken hover:bg-sunken/60",
            )}
          >
            <SignalDot tone={selected ? "running" : "dormant"} size="md" />
            <span className="flex min-w-0 flex-col">
              <span className={cn("text-sm", selected ? "text-ink font-medium" : "text-ink-2")}>
                {item.label}
              </span>
              {item.hint && (
                <span className="text-ink-3 mt-0.5 truncate text-xs">{item.hint}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
