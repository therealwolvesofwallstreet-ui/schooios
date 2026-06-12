// Skeleton = khối THỞ (opacity-pulse). KHÔNG shimmer, KHÔNG spinner (FRONTEND.md).
// animate-pulse bị tắt tự động dưới prefers-reduced-motion (globals.css).
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-sunken animate-pulse rounded-md", className)} />;
}
