// Divider 1px (line/line-2). KHÔNG box-shadow ở đâu — phân tách bằng hairline là chính.
import { cn } from "@/lib/cn";

export function Hairline({
  orientation = "horizontal",
  strong = false,
  className,
}: {
  orientation?: "horizontal" | "vertical";
  strong?: boolean;
  className?: string;
}) {
  const color = strong ? "bg-line-2" : "bg-line";
  return (
    <span
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "block",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        color,
        className,
      )}
    />
  );
}
