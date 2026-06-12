"use client";

// /audit — NHẬT KÝ bất biến toàn hệ (CHỈ ADMIN/AUDITOR; role khác → 403 → PermissionDenied điềm tĩnh).
// Giọng "khắc đá": hàng hairline mono, KHÔNG dấu signal (đây là sổ kỹ thuật, không phải feed tiếng nói).
// Mono ID/timestamp; action có nhãn VN + entityType·entityId mono (title = full để soi cuid đầy đủ).
// Filter entityType/entityId + phân trang SERVER-DRIVEN (FE không tự lọc — commit khi "Áp dụng" → page=1).
import { useState } from "react";
import { useAudit } from "@/hooks/useAudit";
import { formatDateTime } from "@/lib/case-display";
import { Hairline } from "@/components/ui/Hairline";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pager } from "@/components/ui/Pager";
import { ErrorState, PermissionDenied } from "@/components/app/states";
import type { AuditAction, AuditLogDTO, Role } from "@/lib/api-types";

const PAGE_SIZE = 25;

const ACTION_LABEL: Record<AuditAction, string> = {
  CREATE: "Tạo",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  ASSIGN: "Giao việc",
  STATUS_CHANGE: "Đổi trạng thái",
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  EMERGENCY_FLAG: "Cờ khẩn",
  SENSITIVE_FLAG: "Cờ nhạy cảm",
};

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "HS",
  STAFF: "Nhân sự",
  ADMIN: "Quản trị",
  AUDITOR: "Kiểm toán",
};

export function AuditView() {
  const [page, setPage] = useState(1);
  // `committed` = filter ĐÃ áp dụng (nguồn cho query); `draft` = giá trị đang gõ. Tách để KHÔNG bắn
  // request mỗi keystroke — chỉ khi "Áp dụng" (server-driven, page về 1).
  const [committed, setCommitted] = useState<{ entityType: string; entityId: string }>({
    entityType: "",
    entityId: "",
  });
  const [draftType, setDraftType] = useState("");
  const [draftId, setDraftId] = useState("");

  const { logs, totalPages, total, isLoading, isError, forbidden, refetch } = useAudit(
    page,
    PAGE_SIZE,
    committed.entityType || undefined,
    committed.entityId || undefined,
  );

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setCommitted({ entityType: draftType.trim(), entityId: draftId.trim() });
    setPage(1);
  }
  function clear() {
    setDraftType("");
    setDraftId("");
    setCommitted({ entityType: "", entityId: "" });
    setPage(1);
  }

  // Quyền: server là chân lý. 403 → màn ngoài-quyền (nav vốn đã ẩn /audit với STUDENT/STAFF).
  if (forbidden) return <PermissionDenied />;

  const hasFilter = committed.entityType !== "" || committed.entityId !== "";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink font-serif text-3xl leading-snug">Nhật ký</h1>
        <p className="text-ink-3 text-sm">
          Truy vết hoạt động
        </p>
      </header>

      {/* Filter server-driven — commit khi Áp dụng. */}
      <form
        onSubmit={apply}
        data-testid="audit-filter"
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Input
            label="Loại thực thể"
            placeholder="vd: Case, Comment, User"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value)}
            data-testid="filter-entity-type"
          />
        </div>
        <div className="flex-1">
          <Input
            label="Mã thực thể"
            placeholder="ID cuid (tuỳ chọn)"
            value={draftId}
            onChange={(e) => setDraftId(e.target.value)}
            data-testid="filter-entity-id"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="submit" variant="secondary">
            Áp dụng
          </Button>
          {hasFilter && (
            <Button type="button" variant="ghost" onClick={clear}>
              Xóa lọc
            </Button>
          )}
        </div>
      </form>

      {isLoading ? (
        <LedgerSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} message="Không tải được nhật ký." />
      ) : logs.length === 0 ? (
        <EmptyState
          message={hasFilter ? "Không có bản ghi khớp bộ lọc." : "Chưa có bản ghi nào."}
        />
      ) : (
        <section className="flex flex-col gap-4">
          <p className="text-ink-3 font-mono text-[11px] tracking-[0.12em] tabular-nums">
            {total} bản ghi
          </p>
          <ul data-testid="audit-list" className="flex flex-col">
            {logs.map((log, i) => (
              <li key={log.id} className="flex flex-col">
                {i > 0 && <Hairline />}
                <AuditRow log={log} />
              </li>
            ))}
          </ul>
          <Pager page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      )}
    </div>
  );
}

function AuditRow({ log }: { log: AuditLogDTO }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 py-3.5 sm:grid-cols-[150px_1fr_auto] sm:items-baseline sm:gap-4">
      {/* timestamp — mono khắc */}
      <time
        dateTime={log.createdAt}
        className="text-ink-3 font-mono text-[11px] tracking-[0.06em] tabular-nums"
      >
        {formatDateTime(log.createdAt)}
      </time>

      {/* action + thực thể */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-ink text-sm font-medium">{ACTION_LABEL[log.action] ?? log.action}</span>
        <span
          className="text-ink-3 truncate font-mono text-[11px] tracking-[0.04em]"
          title={`${log.entityType}:${log.entityId}`}
        >
          {log.entityType} · {log.entityId}
        </span>
      </div>

      {/* actor */}
      <div className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0.5">
        <span className="text-ink-2 text-sm">{log.actor?.name ?? "Hệ thống"}</span>
        {log.actor && (
          <span className="text-ink-3 font-mono text-[10px] tracking-[0.14em] uppercase">
            {ROLE_LABEL[log.actor.role]}
          </span>
        )}
      </div>
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <div className="flex flex-col gap-5" data-testid="audit-skeleton">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="grid grid-cols-[150px_1fr_auto] items-baseline gap-4">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
