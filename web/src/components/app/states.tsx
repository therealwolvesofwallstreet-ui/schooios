"use client";

// Trạng thái ĐIỀM TĨNH dùng chung (trích từ CaseDetailView — F2-3) để mọi màn (hồ sơ, trang chủ,
// dashboard) cùng MỘT giọng: lỗi tải = ink-dim mono + "Thử lại" (KHÔNG đỏ — đỏ chỉ dành cho khẩn);
// 404 = serif 1 dòng (không phân biệt không-tồn-tại vs không-quyền — anti-enumeration);
// skeleton = khối "thở". Đây là NGUỒN DUY NHẤT — đừng tạo lại biến thể mới ở từng màn.
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

/** Lỗi tải toàn cục (network/500/503). ĐIỀM TĨNH (ink-dim, không đỏ) + Thử lại → refetch. */
export function ErrorState({
  onRetry,
  message = "Không tải được dữ liệu.",
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-24">
      <p className="text-ink-3 font-mono text-xs">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-ink-2 hover:text-ink focus-visible:outline-ink rounded-sm text-xs underline-offset-4 transition-colors duration-150 ease-quiet hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Thử lại
      </button>
    </div>
  );
}

/** Skeleton "thở" cho hồ sơ chi tiết. */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl py-10">
      <div className="flex flex-col gap-4 pl-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <div className="mt-10 flex flex-col gap-6 pl-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-5/6" />
        <Skeleton className="h-14 w-4/6" />
      </div>
    </div>
  );
}

/** 404 ĐỒNG NHẤT (serif 1 dòng) — không phân biệt không-tồn-tại vs không-quyền. */
export function NotFoundState() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 py-24">
      <h1 className="text-ink font-serif text-2xl leading-snug">Không tìm thấy hồ sơ này.</h1>
      <p className="text-ink-3 text-sm">
        Có thể hồ sơ không tồn tại, hoặc nằm ngoài tầm bạn được xem.
      </p>
      <Link
        href="/"
        className="text-ink-2 hover:text-ink focus-visible:outline-ink rounded-sm text-sm underline-offset-4 transition-colors duration-150 ease-quiet hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        ← Về trang chủ
      </Link>
    </div>
  );
}
