"use client";

// Bảng HÀNH ĐỘNG điều phối (status/assign/emergency). Render CHỈ action hợp lệ = ALLOWED_NEXT[status]
// ∩ quyền-role (useWorkflowTransitions) — luật "không phép = KHÔNG render". 0 action → return null
// ⇒ AUDITOR & STUDENT KHÔNG thấy panel. Mỗi action xác nhận qua Modal; nút "Xác nhận" (primary=signal)
// là khoảnh khắc signal DUY NHẤT ở trạng thái mở modal. Mutation lo 409 (reload-trước-retry)/toast.
// Assign = self-assign: assignedToId = chính mình (hợp đồng đóng băng không có endpoint liệt kê user;
// ADMIN-giao-người-khác = residual cần GET /api/users).
import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useWorkflowTransitions } from "@/hooks/useWorkflowTransitions";
import { useChangeStatus, useAssignCase, useFlagEmergency } from "@/hooks/useCaseActions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { STATUS_LABEL } from "@/lib/case-display";
import type { CaseDetail, CaseStatus } from "@/lib/api-types";

type PendingAction =
  | { type: "status"; to: CaseStatus }
  | { type: "assign" }
  | { type: "emergency"; next: boolean };

export function CaseActionPanel({ detail }: { detail: CaseDetail }) {
  const { user } = useSession();
  const { nextStatuses, canAssign, canSetEmergency } = useWorkflowTransitions(detail.status);
  // Ẩn "Nhận xử lý" nếu đã được giao cho chính mình (server short-circuit no-op) — không bày nút vô nghĩa.
  const showAssign = canAssign && detail.assignedToId !== user?.id;

  const changeStatus = useChangeStatus(detail.id);
  const assign = useAssignCase(detail.id);
  const flagEmergency = useFlagEmergency(detail.id);

  const [action, setAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const pending = changeStatus.isPending || assign.isPending || flagEmergency.isPending;

  // 0 hành động → KHÔNG render (AUDITOR/STUDENT, hoặc case CLOSED của STAFF…).
  if (nextStatuses.length === 0 && !showAssign && !canSetEmergency) return null;

  function open(a: PendingAction) {
    setReason("");
    setAction(a);
  }
  function close() {
    if (pending) return; // tránh đóng giữa chừng mutation
    setAction(null);
  }

  async function confirm() {
    if (!action) return;
    try {
      if (action.type === "status") {
        await changeStatus.mutateAsync({
          status: action.to,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      } else if (action.type === "assign") {
        if (!user) return;
        await assign.mutateAsync({ assignedToId: user.id });
      } else {
        await flagEmergency.mutateAsync({
          isEmergency: action.next,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      }
    } catch {
      // useOptimisticMutation đã xử lý 409 (reload hồ sơ)/403/429/503/… → chỉ cần đóng modal,
      // user thao tác lại trên bản đã tải mới.
    } finally {
      setAction(null);
    }
  }

  const copy = action ? MODAL_COPY(action) : null;

  return (
    <Card>
      <h2 className="text-ink-3 mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
        Hành động
      </h2>
      <div className="flex flex-col gap-2">
        {nextStatuses.map((s) => (
          <Button
            key={s}
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => open({ type: "status", to: s })}
          >
            → {STATUS_LABEL[s]}
          </Button>
        ))}
        {showAssign && (
          <Button
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => open({ type: "assign" })}
          >
            Nhận xử lý
          </Button>
        )}
        {canSetEmergency && (
          <Button
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => open({ type: "emergency", next: !detail.isEmergency })}
          >
            {detail.isEmergency ? "Gỡ khẩn cấp" : "Gắn khẩn cấp"}
          </Button>
        )}
      </div>

      <Modal open={!!action} onClose={close} title={copy?.title}>
        <p className="text-ink-2 text-sm leading-relaxed">{copy?.body}</p>
        {action && action.type !== "assign" && (
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
    </Card>
  );
}

function MODAL_COPY(a: PendingAction): { title: string; body: string } {
  switch (a.type) {
    case "status":
      return {
        title: "Đổi trạng thái",
        body: `Chuyển hồ sơ sang “${STATUS_LABEL[a.to]}”?`,
      };
    case "assign":
      return {
        title: "Nhận xử lý",
        body: "Bạn sẽ là người phụ trách hồ sơ này.",
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
