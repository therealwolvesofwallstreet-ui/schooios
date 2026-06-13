"use client";

// PollCard — 1 bình chọn BGH: câu hỏi + options dạng thanh %; bấm option = bình chọn/đổi → cập nhật %
// từ poll trong response (server-truth, KHÔNG tự tính). Đánh dấu lựa-chọn-của-tôi (myOptionId) + tổng
// lượt. Poll đã đóng (isClosed) → chỉ xem, không bấm. AUDITOR: chỉ xem. ADMIN: nút Xoá + xác nhận inline.
// KHÔNG ô comment, KHÔNG up/down (chỉ chọn 1 phương án). 0 hex (token-only), 0 three.
import { useState } from "react";
import { Check, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/relative-time";
import { formatDateTime } from "@/lib/case-display";
import { useDeletePoll, useVotePoll } from "@/hooks/useBroadcast";
import type { PollDTO } from "@/lib/api-types";

export function PollCard({
  poll: initial,
  canInteract,
  isAdmin,
}: {
  poll: PollDTO;
  canInteract: boolean;
  isAdmin: boolean;
}) {
  const [poll, setPoll] = useState(initial);
  const [pendingOpt, setPendingOpt] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const vote = useVotePoll();
  const del = useDeletePoll();

  const votable = canInteract && !poll.isClosed;

  const onVote = (optionId: string) => {
    if (!votable || vote.isPending) return;
    if (poll.myOptionId === optionId) return; // chọn lại đúng option cũ → bỏ qua
    setPendingOpt(optionId);
    vote.mutate(
      { pollId: poll.id, optionId },
      {
        onSuccess: (data) => {
          setPoll(data.poll);
          setPendingOpt(null);
        },
        onError: () => setPendingOpt(null),
      },
    );
  };

  return (
    <article className="border-line bg-paper-raised flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-ink-2 text-sm font-medium">{poll.author.name}</span>
          <span
            className="text-ink-3 font-mono text-[11px] tracking-[0.1em]"
            title={formatDateTime(poll.createdAt)}
          >
            {relativeTime(poll.createdAt)}
          </span>
        </div>
        {isAdmin &&
          (confirming ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-ink-3">Xoá?</span>
              <button
                type="button"
                onClick={() => !del.isPending && del.mutate({ pollId: poll.id })}
                disabled={del.isPending}
                className="text-signal hover:text-emergency disabled:opacity-50"
              >
                Xoá
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-ink-3 hover:text-ink"
              >
                Huỷ
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Xoá bình chọn"
              className="text-ink-3 hover:text-signal -mt-1 -mr-1 rounded-md p-1 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Trash size={16} weight="light" />
            </button>
          ))}
      </div>

      <p className="text-ink font-serif text-base leading-snug">{poll.question}</p>

      <ul className="flex flex-col gap-2">
        {poll.options.map((o) => {
          const mine = poll.myOptionId === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onVote(o.id)}
                disabled={!votable || vote.isPending}
                aria-pressed={mine}
                className={cn(
                  "ease-quiet relative block w-full overflow-hidden rounded-md border px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  mine ? "border-signal/50" : "border-line",
                  votable ? "hover:border-ink/40 cursor-pointer" : "cursor-default",
                )}
              >
                {/* Thanh % nền (token-only; width động qua style — KHÔNG hex). */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 transition-[width] duration-300 ease-quiet",
                    mine ? "bg-signal/15" : "bg-sunken",
                  )}
                  style={{ width: `${o.percent}%` }}
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="text-ink flex items-center gap-1.5 text-sm">
                    {mine && <Check size={14} weight="bold" className="text-signal shrink-0" />}
                    {o.text}
                  </span>
                  <span className="text-ink-2 shrink-0 font-mono text-xs tabular-nums">
                    {o.percent}% · {o.count}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="text-ink-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] tabular-nums">
        <span>{poll.totalVotes} lượt bình chọn</span>
        {poll.isClosed && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-ink-2">Đã đóng</span>
          </>
        )}
        {pendingOpt && (
          <>
            <span aria-hidden="true">·</span>
            <span>đang gửi…</span>
          </>
        )}
      </div>
    </article>
  );
}
