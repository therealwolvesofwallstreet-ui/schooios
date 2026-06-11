// Card = bề mặt nổi paper-raised + hairline. 0 box-shadow ở trạng thái tĩnh
// (hover chỉ được đậm hairline, KHÔNG đổ bóng — §5).
import { cn } from "@/lib/cn";

export function Card({
  children,
  interactive = false,
  className,
}: {
  children: React.ReactNode;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line bg-paper-raised rounded-md border p-6",
        interactive && "hover:border-line-2 transition-colors duration-150 ease-quiet",
        className,
      )}
    >
      {children}
    </div>
  );
}
