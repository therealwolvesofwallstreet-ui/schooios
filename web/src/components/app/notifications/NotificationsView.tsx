"use client";

// /notifications — danh sách thông báo CỦA TÔI dọc hairline (giọng Refined). Dấu "tiếng nói" (signal)
// cho dòng CHƯA-ĐỌC → TAN (fade/scale) khi đã đọc; đã-đọc = không dấu. "Đánh dấu đã đọc tất cả"
// (useReadAll) → badge + list refetch SERVER-TRUTH (không decrement cục bộ). Phân trang server-driven
// (Pager). Mỗi dòng có case → điều hướng về hồ sơ. States dùng CHUNG (states.tsx + EmptyState).
// Mono ID/timestamp. KHÔNG reduced-motion (immersive cho mọi người — gate motion KHÔNG có).
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useNotifications, useReadAll } from "@/hooks/useNotifications";
import { formatDateTime } from "@/lib/case-display";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { Hairline } from "@/components/ui/Hairline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pager } from "@/components/ui/Pager";
import { ErrorState } from "@/components/app/states";
import { cn } from "@/lib/cn";
import type { NotificationDTO, NotificationType } from "@/lib/api-types";

const PAGE_SIZE = 20;

// Dấu theo LOẠI: khẩn xác nhận = emergency (oxblood, pulse — HIẾM) · resolved = gold (đã ghi nhận) ·
// còn lại = signal (tiếng nói). Chỉ hiện khi CHƯA đọc.
const TYPE_TONE: Record<NotificationType, SignalTone> = {
  EMERGENCY_CONFIRMED: "emergency",
  CASE_RESOLVED: "gold",
  CASE_ASSIGNED: "signal",
  STATUS_CHANGED: "signal",
  COMMENT_ADDED: "signal",
};

export function NotificationsView() {
  const [page, setPage] = useState(1);
  const { notifications, unreadCount, totalPages, isLoading, isError, refetch } = useNotifications(
    page,
    PAGE_SIZE,
  );
  const readAll = useReadAll();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-ink font-serif text-3xl leading-snug">Thông báo</h1>
          <p className="text-ink-3 text-sm" data-testid="unread-summary">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết"}
          </p>
        </div>
        <button
          type="button"
          data-testid="read-all"
          onClick={() => readAll.mutate()}
          disabled={unreadCount === 0 || readAll.isPending}
          className="text-ink-2 hover:text-ink focus-visible:outline-ink shrink-0 rounded-sm text-xs underline-offset-4 transition-colors duration-150 ease-quiet hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40 disabled:hover:no-underline"
        >
          Đánh dấu đã đọc tất cả
        </button>
      </header>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} message="Không tải được thông báo" />
      ) : notifications.length === 0 ? (
        <EmptyState message="Chưa có thông báo nào" />
      ) : (
        <>
          <ul data-testid="notification-list" className="flex flex-col">
            {notifications.map((n, i) => (
              <li key={n.id} className="flex flex-col">
                {i > 0 && <Hairline />}
                <NotificationRow n={n} />
              </li>
            ))}
          </ul>
          <Pager page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function NotificationRow({ n }: { n: NotificationDTO }) {
  const tone = TYPE_TONE[n.type] ?? "signal";
  const inner = (
    <div className="flex items-start gap-3 py-3.5">
      {/* cột dấu cố định 8px: dấu "tiếng nói" chưa-đọc → TAN khi đọc (exit fade/scale) */}
      <span className="mt-1.5 flex w-2 shrink-0 justify-center">
        <AnimatePresence initial={false}>
          {!n.isRead && (
            <motion.span
              key="dot"
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <SignalDot tone={tone} size="sm" pulse={tone === "emergency"} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn("text-sm leading-snug", n.isRead ? "text-ink-2" : "text-ink font-medium")}>
          {n.message}
        </p>
        <span className="text-ink-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.08em]">
          {n.case && <span className="tracking-[0.12em]">{n.case.caseCode}</span>}
          {n.case && <span aria-hidden="true">·</span>}
          <time dateTime={n.createdAt}>{formatDateTime(n.createdAt)}</time>
        </span>
      </div>
    </div>
  );

  if (n.case) {
    return (
      <Link
        href={`/cases/${n.case.id}`}
        className="focus-visible:outline-ink -mx-2 rounded-md px-2 transition-colors duration-150 ease-quiet hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-5" data-testid="notifications-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="mt-1.5 h-2 w-2 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
