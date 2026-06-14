"use client";

// PostCard — 1 thông báo BGH: body + tác giả + thời-gian-tương-đối + nút Thích (upvote toggle) + số
// lượt. KHÔNG ô comment (theo chốt). Optimistic toggle + rollback khi lỗi (count/myUpvoted reconcile
// từ response server). AUDITOR: KHÔNG nút thích (chỉ xem count). ADMIN: nút Xoá + xác nhận inline.
import { useState } from "react";
import { Heart, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/relative-time";
import { formatDateTime } from "@/lib/case-display";
import { useDeletePost, useUpvotePost } from "@/hooks/useBroadcast";
import type { PostDTO } from "@/lib/api-types";

export function PostCard({
  post,
  canInteract,
  isAdmin,
}: {
  post: PostDTO;
  canInteract: boolean;
  isAdmin: boolean;
}) {
  const [liked, setLiked] = useState(post.myUpvoted);
  const [count, setCount] = useState(post.upvoteCount);
  const [confirming, setConfirming] = useState(false);
  const upvote = useUpvotePost();
  const del = useDeletePost();

  const onToggle = () => {
    if (!canInteract || upvote.isPending) return;
    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !liked;
    setLiked(nextLiked); // optimistic
    setCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));
    upvote.mutate(
      { postId: post.id, liked: nextLiked },
      {
        onSuccess: (data) => {
          setLiked(data.myUpvoted);
          setCount(data.upvoteCount);
        },
        onError: () => {
          setLiked(prevLiked); // rollback
          setCount(prevCount);
        },
      },
    );
  };

  return (
    <article className="border-line bg-paper-raised flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-ink-2 text-sm font-medium">{post.author.name}</span>
          <span
            className="text-ink-3 font-mono text-[11px] tracking-[0.1em]"
            title={formatDateTime(post.createdAt)}
          >
            {relativeTime(post.createdAt)}
          </span>
        </div>
        {isAdmin &&
          (confirming ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-ink-3">Xoá?</span>
              <button
                type="button"
                onClick={() => !del.isPending && del.mutate({ postId: post.id })}
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
              aria-label="Xoá thông báo"
              className="text-ink-3 hover:text-signal -mt-1 -mr-1 rounded-md p-1 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Trash size={16} weight="light" />
            </button>
          ))}
      </div>

      <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>

      {canInteract ? (
        <button
          type="button"
          onClick={onToggle}
          disabled={upvote.isPending}
          aria-pressed={liked}
          aria-label={liked ? "Bỏ thích" : "Thích"}
          className={cn(
            "flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60",
            liked ? "text-signal" : "text-ink-3 hover:text-ink",
          )}
        >
          <Heart size={16} weight={liked ? "fill" : "light"} />
          <span className="tabular-nums">{count}</span>
        </button>
      ) : (
        <span className="text-ink-3 flex w-fit items-center gap-1.5 px-2 py-1 text-xs">
          <Heart size={16} weight="light" />
          <span className="tabular-nums">{count}</span>
        </span>
      )}
    </article>
  );
}
