"use client";

// Thanh thao tác hàng loạt (ADMIN, chỉ khi ≥1 case được chọn).
// Tái dùng picker STAFF từ useAssignableStaff (cùng hook, cùng cache).
// Báo kết quả minh bạch: "Thành công X · Bỏ qua Y" + liệt kê case bại.
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAssignableStaff } from "@/hooks/useAssignableStaff";
import { useBulkCaseAction, type BulkCaseItem } from "@/hooks/useBulkCaseAction";
import { useToastQueue } from "@/store/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/app/states";
import type { CaseStatus, UserRef } from "@/lib/api-types";

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: "TRIAGED", label: "Đã phân loại" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "RESOLVED", label: "Đã giải quyết" },
  { value: "CLOSED", label: "Đã đóng" },
];

export function BulkActionBar({
  selected,
  onDone,
}: {
  selected: BulkCaseItem[];
  onDone: () => void;
}) {
  const { execute } = useBulkCaseAction();
  const push = useToastQueue((s) => s.push);
  const { staff, isLoading: staffLoading, isError: staffError } = useAssignableStaff(true);

  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const inFlight = useRef(false);

  async function run(action: Parameters<typeof execute>[1]) {
    if (inFlight.current) return;
    inFlight.current = true;
    setRunning(true);
    try {
      const result = await execute(selected, action);
      const successMsg = `Thành công ${result.ok.length}${result.failed.length > 0 ? ` · Bỏ qua ${result.failed.length}` : ""}`;
      push(successMsg, result.failed.length > 0 ? "info" : "success");
      if (result.failed.length > 0) {
        const detail = result.failed
          .slice(0, 5)
          .map((f) => `${f.caseCode}: ${f.reason}`)
          .join(" | ");
        push(detail, "error");
      }
    } finally {
      inFlight.current = false;
      setRunning(false);
      setAssignPickerOpen(false);
      setStatusPickerOpen(false);
      setCloseConfirmOpen(false);
      onDone();
    }
  }

  function handleAssign(member: UserRef) {
    void run({ type: "assign", assignedToId: member.id });
  }
  function handleStatus(status: CaseStatus) {
    setStatusPickerOpen(false);
    void run({ type: "status", status });
  }

  const n = selected.length;

  return (
    <>
      <div className="bg-paper-raised border-line flex items-center gap-3 rounded border px-4 py-2">
        <span className="text-ink-2 font-mono text-[11px] tabular-nums">
          {n} đã chọn
        </span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={running} onClick={() => setAssignPickerOpen(true)}>
            Giao cho…
          </Button>
          <Button size="sm" variant="secondary" disabled={running} onClick={() => setStatusPickerOpen(true)}>
            Đổi trạng thái…
          </Button>
          <Button size="sm" variant="secondary" disabled={running} onClick={() => setCloseConfirmOpen(true)}>
            Đóng
          </Button>
        </div>
        {running && (
          <span className="text-ink-3 font-mono text-[10px]">đang xử lý…</span>
        )}
      </div>

      {/* Picker STAFF */}
      <Modal open={assignPickerOpen} onClose={() => setAssignPickerOpen(false)} title={`Giao ${n} vụ cho…`}>
        {staffLoading ? (
          <div className="flex flex-col gap-2 py-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full rounded" />)}
          </div>
        ) : staffError ? (
          <ErrorState compact message="Không tải được danh sách nhân sự." />
        ) : staff.length === 0 ? (
          <p className="text-ink-3 py-4 text-center text-sm">Không có nhân sự nào đang hoạt động.</p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {staff.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => handleAssign(m)}
                  className="hover:bg-paper focus-visible:outline-ink flex w-full rounded px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 focus-visible:outline-2"
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setAssignPickerOpen(false)}>Huỷ</Button>
        </div>
      </Modal>

      {/* Picker trạng thái */}
      <Modal open={statusPickerOpen} onClose={() => setStatusPickerOpen(false)} title={`Đổi trạng thái ${n} vụ`}>
        <ul className="flex flex-col gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                disabled={running}
                onClick={() => handleStatus(opt.value)}
                className="hover:bg-paper-raised focus-visible:outline-ink flex w-full rounded px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 focus-visible:outline-2"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setStatusPickerOpen(false)}>Huỷ</Button>
        </div>
      </Modal>

      {/* Xác nhận đóng */}
      <Modal open={closeConfirmOpen} onClose={() => setCloseConfirmOpen(false)} title={`Đóng ${n} vụ`}>
        <p className="text-ink-2 text-sm">Xác nhận đóng {n} vụ việc đã chọn? Chỉ vụ đang ở trạng thái RESOLVED mới đóng được; vụ khác sẽ bị bỏ qua và báo lý do.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCloseConfirmOpen(false)} disabled={running}>Huỷ</Button>
          <Button size="sm" onClick={() => { void run({ type: "status", status: "CLOSED" }); }} disabled={running}>
            {running ? "Đang xử lý…" : "Xác nhận đóng"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
