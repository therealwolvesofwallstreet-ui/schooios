"use client";

// Thread bình luận 2 tầng: gốc + replies thụt vào. Reply CHỈ ADMIN thấy nút "Trả lời".
// Xoá: tác giả thấy nút xoá trên comment của chính mình; ADMIN thấy trên mọi comment.
// Composer gốc: mọi role thấy case trừ AUDITOR. Xác nhận trước khi xoá.
// Warm DNA: token-only, không hex, không canvas, micro-motion gate hydrated.
import { useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { usePermissionView } from "@/hooks/usePermissionView";
import { useCreateComment } from "@/hooks/useCreateComment";
import { useDeleteComment } from "@/hooks/useDeleteComment";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SignalDot } from "@/components/ui/SignalDot";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/case-display";
import type { CommentDTO } from "@/lib/api-types";

function CommentBubble({
  comment,
  caseId,
  canReply,
  canDelete,
  onReply,
  isReply,
}: {
  comment: CommentDTO;
  caseId: string;
  canReply: boolean;
  canDelete: boolean;
  onReply: (parentId: string) => void;
  isReply: boolean;
}) {
  const deleteMutation = useDeleteComment(caseId);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    setConfirming(false);
    deleteMutation.mutate(comment.id);
  }

  return (
    <div className={cn("flex flex-col gap-1", isReply && "ml-8 border-l border-line pl-3")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-ink font-medium text-sm">{comment.author.name}</span>
        {comment.isInternal && (
          <span className="font-mono text-[10px] tracking-wider uppercase text-ink-3 bg-sunken border border-line px-1.5 py-0.5 rounded">
            Nội bộ
          </span>
        )}
        <span className="text-ink-3 text-xs">{formatDateTime(comment.createdAt)}</span>
      </div>
      <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">{comment.body}</p>
      <div className="flex items-center gap-3 mt-0.5">
        {canReply && !isReply && (
          <button
            type="button"
            onClick={() => onReply(comment.id)}
            className="text-ink-3 hover:text-ink font-mono text-[11px] tracking-wide transition-colors duration-150 ease-quiet"
          >
            Trả lời
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleteMutation.isPending}
            className={cn(
              "font-mono text-[11px] tracking-wide transition-colors duration-150 ease-quiet disabled:opacity-40",
              confirming ? "text-red-500" : "text-ink-3 hover:text-ink",
            )}
          >
            {confirming ? "Xác nhận xoá?" : "Xoá"}
          </button>
        )}
        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-ink-3 hover:text-ink font-mono text-[11px] transition-colors duration-150"
          >
            Huỷ
          </button>
        )}
      </div>
    </div>
  );
}

function ReplyComposer({
  caseId,
  parentId,
  onClose,
}: {
  caseId: string;
  parentId: string;
  onClose: () => void;
}) {
  const mutation = useCreateComment(caseId);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      await mutation.mutateAsync({ body: trimmed, parentId });
      setBody("");
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        const b = e.body as { error?: string; details?: { message?: string }[] } | null;
        setError(b?.details?.[0]?.message ?? b?.error ?? "Nội dung chưa hợp lệ");
      }
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="ml-8 border-l border-line pl-3 flex flex-col gap-2 mt-1">
      <Textarea
        label="Trả lời"
        rows={2}
        maxLength={5000}
        placeholder="Viết trả lời…"
        value={body}
        error={error ?? undefined}
        onChange={(e) => { if (error) setError(null); setBody(e.target.value); }}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void submit()} disabled={mutation.isPending || !body.trim()}>
          {mutation.isPending ? "Đang gửi…" : "Gửi"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Huỷ</Button>
      </div>
    </div>
  );
}

export function CommentThread({ caseId, comments }: { caseId: string; comments: CommentDTO[] }) {
  const { user } = useSession();
  const { can } = usePermissionView();
  const mutation = useCreateComment(caseId);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const inFlight = useRef(false);

  const canPublic = can("comment:public");
  const canInternal = can("comment:internal");
  const canReply = can("comment:reply");

  const roots = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  async function submitRoot() {
    const trimmed = body.trim();
    if (!trimmed || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      await mutation.mutateAsync({ body: trimmed, ...(canInternal && isInternal ? { isInternal: true } : {}) });
      setBody("");
      setIsInternal(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        const b = e.body as { error?: string; details?: { message?: string }[] } | null;
        setError(b?.details?.[0]?.message ?? b?.error ?? "Nội dung chưa hợp lệ");
      }
    } finally {
      inFlight.current = false;
    }
  }

  if (!user) return null;

  return (
    <div className="border-line flex flex-col gap-5 border-t pt-6 pl-4">
      {roots.length === 0 && (
        <p className="text-ink-3 text-sm">Chưa có bình luận nào</p>
      )}
      {roots.map((root) => {
        const replies = repliesOf(root.id);
        const isOwner = root.authorId === user.id;
        const canDel = can("comment:deleteOwn", { isOwner });
        return (
          <div key={root.id} className="flex flex-col gap-2">
            <CommentBubble
              comment={root}
              caseId={caseId}
              canReply={canReply}
              canDelete={canDel}
              onReply={(pid) => setReplyingTo(replyingTo === pid ? null : pid)}
              isReply={false}
            />
            {replies.map((rep) => {
              const isRepOwner = rep.authorId === user.id;
              const canDelRep = can("comment:deleteOwn", { isOwner: isRepOwner });
              return (
                <CommentBubble
                  key={rep.id}
                  comment={rep}
                  caseId={caseId}
                  canReply={false}
                  canDelete={canDelRep}
                  onReply={() => {}}
                  isReply={true}
                />
              );
            })}
            {replyingTo === root.id && (
              <ReplyComposer caseId={caseId} parentId={root.id} onClose={() => setReplyingTo(null)} />
            )}
          </div>
        );
      })}

      {canPublic && (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <Textarea
            label={canInternal ? "Thêm trao đổi" : "Phản hồi của bạn"}
            rows={3}
            maxLength={5000}
            placeholder="Viết gì đó…"
            value={body}
            error={error ?? undefined}
            onChange={(e) => { if (error) setError(null); setBody(e.target.value); }}
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
            <Button size="sm" onClick={() => void submitRoot()} disabled={mutation.isPending || !body.trim()}>
              {mutation.isPending ? "Đang gửi…" : "Gửi"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
