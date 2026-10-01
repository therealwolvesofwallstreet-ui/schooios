"use client";

// /notifications — danh sách thông báo CỦA TÔI dọc hairline (giọng Refined). Dấu "tiếng nói" (signal)
// cho dòng CHƯA-ĐỌC → TAN (fade/scale) khi đã đọc; đã-đọc = không dấu. "Đánh dấu đã đọc tất cả"
// (useReadAll) → badge + list refetch SERVER-TRUTH (không decrement cục bộ). Phân trang server-driven
// (Pager). Mỗi dòng có case → điều hướng về hồ sơ. States dùng CHUNG (states.tsx + EmptyState).
// Mono ID/timestamp. KHÔNG reduced-motion (immersive cho mọi người — gate motion KHÔNG có).
import { useState } from "react";
import Link from "next/link";
import { useNotifications, useReadAll } from "@/hooks/useNotifications";
import { formatDateTime, STATUS_LABEL } from "@/lib/case-display";
import { Hairline } from "@/components/ui/Hairline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pager } from "@/components/ui/Pager";
import { ErrorState } from "@/components/app/states";
import { cn } from "@/lib/cn";
import type { CaseStatus, NotificationDTO } from "@/lib/api-types";

const PAGE_SIZE = 20;

// Server ghi message đổi-trạng-thái dạng "CASE-…: RESOLVED → CLOSED" (enum tiếng Anh, đã lưu sẵn trong DB).
// Dịch lúc HIỂN THỊ sang nhãn Việt: "CASE-…: Đã giải quyết → Đã đóng" (cả thông báo cũ lẫn mới).
const STATUS_TOKEN = new RegExp("(?<![A-Z_])(" + Object.keys(STATUS_LABEL).join("|") + ")(?![A-Z_])", "g");
function localizeMessage(message: string): string {
  return message.replace(STATUS_TOKEN, (m) => STATUS_LABEL[m as CaseStatus]);
}

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
  // Chưa đọc = nền xanh nhạt + chữ đậm + nhãn "Mới" (KHÔNG dấu chấm). Đã đọc = nền trong, chữ thường.
  const inner = (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-md px-3 py-3.5 transition-colors duration-300 ease-quiet",
        !n.isRead && "bg-gold-fill/60",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn("text-sm leading-snug", n.isRead ? "text-ink-2" : "text-ink font-medium")}>
          {localizeMessage(n.message)}
        </p>
        <span className="text-ink-3 flex flex-wrap items-center gap-x-4 font-mono text-xs">
          {n.case && <span>{n.case.caseCode}</span>}
          <time dateTime={n.createdAt}>{formatDateTime(n.createdAt)}</time>
        </span>
      </div>
      {!n.isRead && (
        <span className="bg-signal text-paper-raised shrink-0 rounded-md px-2 py-0.5 text-xs font-medium">
          Mới
        </span>
      )}
    </div>
  );

  if (n.case) {
    return (
      <Link
        href={`/cases/${n.case.id}`}
        className="focus-visible:outline-ink -mx-3 block rounded-md transition-colors duration-150 ease-quiet hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {inner}
      </Link>
    );
  }
  return <div className="-mx-3">{inner}</div>;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-5" data-testid="notifications-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
