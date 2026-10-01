// BRAND MARK — huy hiệu trường THPT chuyên Lý Tự Trọng + chữ "LTT SchooIOS". Nguồn ảnh DUY NHẤT:
// /brand/ltt-emblem.png (512px, nền trong suốt, cắt tròn từ logo gốc). Màu chữ do caller truyền qua
// className (paper trên sidebar authority, ink trên landing) — component KHÔNG tự chọn tone.
import Image from "next/image";
import { cn } from "@/lib/cn";

export const BRAND_NAME = "LTT SchooIOS";

export function BrandEmblem({
  size = 32,
  priority = false,
  className,
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/brand/ltt-emblem.png"
      alt="Huy hiệu Trường THPT chuyên Lý Tự Trọng"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}

export function BrandMark({
  size = 32,
  priority = false,
  className,
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <BrandEmblem size={size} priority={priority} />
      <span className={className}>{BRAND_NAME}</span>
    </span>
  );
}
