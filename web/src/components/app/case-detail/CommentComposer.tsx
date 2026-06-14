"use client";

// Soạn bình luận (POST /comments). Quyền: comment:public (STUDENT/STAFF/ADMIN) → render; AUDITOR
// (!comment:public) → null. Toggle "NỘI BỘ" CHỈ khi comment:internal (STAFF/ADMIN) — STUDENT không
// thấy toggle & không gửi được isInternal. 400 → lỗi inline (KHÔNG toast); 409/429/503/403 → hook toast.
import { useRef, useState } from "react";
import { usePermissionView } from "@/hooks/usePermissionView";
import { useCreateComment } from "@/hooks/useCreateComment";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SignalDot } from "@/components/ui/SignalDot";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

export function CommentComposer({ caseId }: { caseId: string }) {
  const { can } = usePermissionView();
  const mutation = useCreateComment(caseId);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Khoá ĐỒNG BỘ chống double-submit: `disabled={submitting}` dựa trên mutation.isPending (state ASYNC)
  // chưa flush kịp giữa 2 click đồng bộ → 2 POST → comment TRÙNG (POST không idempotent). Ref chặn ngay.
  const inFlight = useRef(false);

  if (!can("comment:public")) return null; // AUDITOR chỉ lắng nghe
  const canInternal = can("comment:internal");
  const submitting = mutation.isPending;

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      await mutation.mutateAsync({
        body: trimmed,
        ...(canInternal && isInternal ? { isInternal: true } : {}),
      });
      setBody("");
      setIsInternal(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        const b = e.body as { error?: string; details?: { message?: string }[] } | null;
        setError(b?.details?.[0]?.message ?? b?.error ?? "Nội dung chưa hợp lệ");
      }
      // 403/409/429/503/network → đã toast ở useOptimisticMutation.
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="border-line flex flex-col gap-3 border-t pt-6 pl-4">
      <Textarea
        label={canInternal ? "Thêm trao đổi" : "Phản hồi của bạn"}
        rows={3}
        maxLength={5000}
        placeholder="Viết gì đó…"
        value={body}
        error={error ?? undefined}
        onChange={(e) => {
          if (error) setError(null);
          setBody(e.target.value);
        }}
      />
      <div className="flex items-center justify-between gap-3">
        {canInternal ? (
          <button
            type="button"
            aria-pressed={isInternal}
            onClick={() => setIsInternal((v) => !v)}
            className={cn(
              "focus-visible:outline-ink inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2",
              isInternal ? "border-line-2 bg-sunken text-ink" : "border-line text-ink-3 hover:text-ink",
            )}
          >
            <SignalDot tone={isInternal ? "running" : "dormant"} size="sm" />
            Nội bộ
          </button>
        ) : (
          <span aria-hidden />
        )}
        <Button size="sm" onClick={submit} disabled={submitting || !body.trim()}>
          {submitting ? "Đang gửi…" : "Gửi"}
        </Button>
      </div>
    </div>
  );
}
