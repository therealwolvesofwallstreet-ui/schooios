// Pill chung (tag/meta) — viền hairline trên giấy. tone "mono" cho định danh (caseCode…).
import { cn } from "@/lib/cn";

export function Pill({
  children,
  mono = false,
  className,
}: {
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "border-line text-ink-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs",
        mono && "font-mono tracking-tight",
        className,
      )}
    >
      {children}
    </span>
  );
}
