"use client";

// Bảng HÀNH ĐỘNG điều phối (status/assign/emergency). Render CHỈ action hợp lệ = ALLOWED_NEXT[status]
// ∩ quyền-role (useWorkflowTransitions) — luật "không phép = KHÔNG render". 0 action → return null
// ⇒ AUDITOR & STUDENT KHÔNG thấy panel. Mỗi action xác nhận qua Modal; nút "Xác nhận" (primary=signal)
// là khoảnh khắc signal DUY NHẤT ở trạng thái mở modal. Mutation lo 409 (reload-trước-retry)/toast.
//
// §3a (ADMIN): "Giao cho…" → modal picker STAFF với cân tải (N vụ đang mở). GIỮ "Nhận xử lý" (self-assign).
// §3c: nút RESOLVED→IN_PROGRESS hiện là "Mở lại" (rõ nghĩa), CLOSED là terminal (KHÔNG render).
import { useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useWorkflowTransitions } from "@/hooks/useWorkflowTransitions";
import { useChangeStatus, useAssignCase, useFlagEmergency } from "@/hooks/useCaseActions";
import { useAssignableStaff } from "@/hooks/useAssignableStaff";
import { useCaseList } from "@/hooks/useCaseList";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/Skeleton";
import { STATUS_LABEL } from "@/lib/case-display";
import type { CaseDetail, CaseStatus, UserRef } from "@/lib/api-types";

type PendingAction =
  | { type: "status"; to: CaseStatus }
  | { type: "assign"; assignedToId: string; assigneeName: string }
  | { type: "selfAssign" }
  | { type: "emergency"; next: boolean };

export function CaseActionPanel({ detail }: { detail: CaseDetail }) {
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const { nextStatuses, canAssign, canSetEmergency } = useWorkflowTransitions(detail.status);
  const showSelfAssign = canAssign && detail.assignedToId !== user?.id && !isAdmin;
  // ADMIN luôn thấy "Giao cho…" khi case chưa terminal (server enforce; ADMIN khỏi self-assign picker).
  const showAdminAssign =
    isAdmin && detail.status !== "RESOLVED" && detail.status !== "CLOSED";

  const changeStatus = useChangeStatus(detail.id);
  const assign = useAssignCase(detail.id);
  const flagEmergency = useFlagEmergency(detail.id);

  // Picker ADMIN — load staff chỉ khi ADMIN (isAdmin) để STAFF/AUDITOR/STUDENT không phát request
  const { staff, isLoading: staffLoading, isError: staffError } = useAssignableStaff(isAdmin);

  // Cân tải: đếm case MỞ (!=RESOLVED,CLOSED) theo assignedToId — 1 query tất định (limit 100)
  const { cases: openCases } = useCaseList(
    isAdmin ? (user?.id ?? "admin-workload") : "skip",
    isAdmin ? { limit: 100 } : {},
  );
  const workload = isAdmin
    ? openCases.reduce<Record<string, number>>((acc, c) => {
        if (c.assignedToId && c.status !== "RESOLVED" && c.status !== "CLOSED") {
          acc[c.assignedToId] = (acc[c.assignedToId] ?? 0) + 1;
        }
        return acc;
      }, {})
    : {};
  const openCasesOverCap = isAdmin && (openCases.length >= 100);

  const [action, setAction] = useState<PendingAction | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reason, setReason] = useState("");
  const pending = changeStatus.isPending || assign.isPending || flagEmergency.isPending;
  const inFlight = useRef(false);

  if (nextStatuses.length === 0 && !showSelfAssign && !showAdminAssign && !canSetEmergency)
    return null;

  function openAction(a: PendingAction) {
    setReason("");
    setAction(a);
  }
  function close() {
    if (pending) return;
    setAction(null);
  }
  function closePicker() {
    setPickerOpen(false);
  }

  async function confirm() {
    if (!action || inFlight.current) return;
    inFlight.current = true;
    try {
      if (action.type === "status") {
        await changeStatus.mutateAsync({
          status: action.to,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      } else if (action.type === "selfAssign") {
        if (!user) return;
        await assign.mutateAsync({ assignedToId: user.id });
      } else if (action.type === "assign") {
        await assign.mutateAsync({ assignedToId: action.assignedToId });
      } else {
        await flagEmergency.mutateAsync({
          isEmergency: action.next,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      }
    } catch {
      // useOptimisticMutation đã xử lý 409 (reload)/403/429/503/…
    } finally {
      inFlight.current = false;
      setAction(null);
    }
  }

  function selectAssignee(member: UserRef) {
    closePicker();
    openAction({ type: "assign", assignedToId: member.id, assigneeName: member.name });
  }

  const copy = action ? MODAL_COPY(action) : null;

  return (
    <Card>
      <h2 className="text-ink-3 mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
        Hành động
      </h2>

      {/* Người phụ trách hiện tại (ADMIN only) */}
      {isAdmin && (
        <p className="text-ink-3 mb-3 text-xs">
          Phụ trách:{" "}
          <span className="text-ink-2">
            {detail.assignedTo?.name ?? "Chưa giao"}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        {/* §3c: RESOLVED→IN_PROGRESS nhãn "Mở lại" thay "→ Đang xử lý" */}
        {nextStatuses.map((s) => (
          <Button
            key={s}
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => openAction({ type: "status", to: s })}
          >
            {s === "IN_PROGRESS" && detail.status === "RESOLVED" ? "Mở lại" : `→ ${STATUS_LABEL[s]}`}
          </Button>
        ))}

        {/* §3a: ADMIN "Giao cho…" picker */}
        {showAdminAssign && (
          <Button
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => setPickerOpen(true)}
          >
            Giao cho…
          </Button>
        )}

        {/* STAFF self-assign */}
        {showSelfAssign && (
          <Button
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => openAction({ type: "selfAssign" })}
          >
            Nhận xử lý
          </Button>
        )}

        {canSetEmergency && (
          <Button
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => openAction({ type: "emergency", next: !detail.isEmergency })}
          >
            {detail.isEmergency ? "Gỡ khẩn cấp" : "Gắn khẩn cấp"}
          </Button>
        )}
      </div>

      {/* Modal xác nhận action (status/assign/emergency) */}
      <Modal open={!!action} onClose={close} title={copy?.title}>
        <p className="text-ink-2 text-sm leading-relaxed">{copy?.body}</p>
        {action && action.type !== "selfAssign" && action.type !== "assign" && (
          <div className="mt-4">
            <Textarea
              label="Ghi chú (không bắt buộc)"
              rows={3}
              maxLength={5000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={close} disabled={pending}>
            Huỷ
          </Button>
          <Button size="sm" onClick={confirm} disabled={pending}>
            {pending ? "Đang lưu…" : "Xác nhận"}
          </Button>
        </div>
      </Modal>

      {/* Modal picker "Giao cho…" (ADMIN only) */}
      <Modal open={pickerOpen} onClose={closePicker} title="Giao cho…">
        {staffLoading ? (
          <div className="flex flex-col gap-2 py-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full rounded" />)}
          </div>
        ) : staffError ? (
          <ErrorState compact message="Không tải được danh sách nhân sự." />
        ) : staff.length === 0 ? (
          <p className="text-ink-3 py-4 text-center text-sm">Không có nhân sự nào đang hoạt động.</p>
        ) : (
          <>
            {openCasesOverCap && (
              <p className="text-ink-3 mb-3 font-mono text-[10px]">
                * Cân tải ước lượng trên 100 vụ gần nhất
              </p>
            )}
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {staff
                .slice()
                .sort((a, b) => (workload[a.id] ?? 0) - (workload[b.id] ?? 0))
                .map((m) => {
                  const load = workload[m.id] ?? 0;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => selectAssignee(m)}
                        className="hover:bg-paper-raised focus-visible:outline-ink flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2"
                      >
                        <span className="text-ink">{m.name}</span>
                        <span className="text-ink-3 font-mono text-[11px]">
                          {load} vụ đang mở
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={closePicker}>
            Huỷ
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function MODAL_COPY(a: PendingAction): { title: string; body: string } {
  switch (a.type) {
    case "status":
      return {
        title: a.to === "IN_PROGRESS" ? "Mở lại hồ sơ" : "Đổi trạng thái",
        body:
          a.to === "IN_PROGRESS"
            ? "Mở lại hồ sơ và chuyển về trạng thái Đang xử lý?"
            : `Chuyển hồ sơ sang "${STATUS_LABEL[a.to]}"?`,
      };
    case "selfAssign":
      return {
        title: "Nhận xử lý",
        body: "Bạn sẽ là người phụ trách hồ sơ này.",
      };
    case "assign":
      return {
        title: "Giao cho…",
        body: `Giao hồ sơ cho "${a.assigneeName}"?`,
      };
    case "emergency":
      return a.next
        ? {
            title: "Gắn khẩn cấp",
            body: "Đánh dấu hồ sơ là KHẨN CẤP chính thức — quản trị sẽ được thông báo.",
          }
        : {
            title: "Gỡ khẩn cấp",
            body: "Bỏ đánh dấu khẩn cấp chính thức của hồ sơ.",
          };
  }
}
