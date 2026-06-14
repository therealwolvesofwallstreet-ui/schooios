"use client";

// BroadcastLane — KHU "Thông báo & Bình chọn (BGH)" thêm TRÊN CÙNG feed (additive — KHÔNG phá stream
// case Đợt 1). 2 nhóm con (Thông báo = posts · Bình chọn = polls), MỖI nhóm phân trang SERVER riêng
// (KHÔNG client-merge 2 nguồn). ADMIN thấy nút tạo + xoá (server vẫn là rào chắn). Lane ẩn với non-admin
// khi CHƯA có broadcast (tránh khu rỗng). KHÔNG three/canvas, KHÔNG reduced-motion, 0 hex.
import { useState } from "react";
import { ChartBar, Megaphone, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pager } from "@/components/ui/Pager";
import { ErrorState } from "@/components/app/states";
import { useSession } from "@/hooks/useSession";
import { usePosts, usePolls } from "@/hooks/useBroadcast";
import { PostCard } from "./PostCard";
import { PollCard } from "./PollCard";
import { CreatePostModal } from "./CreatePostModal";
import { CreatePollModal } from "./CreatePollModal";

export function BroadcastLane() {
  const { role } = useSession();
  const isAdmin = role === "ADMIN";
  const canInteract = role != null && role !== "AUDITOR";

  const [postPage, setPostPage] = useState(1);
  const [pollPage, setPollPage] = useState(1);
  const posts = usePosts(postPage);
  const polls = usePolls(pollPage);

  const [showPost, setShowPost] = useState(false);
  const [showPoll, setShowPoll] = useState(false);

  const loading = posts.isLoading || polls.isLoading;
  const hasContent = posts.total > 0 || polls.total > 0;

  // Non-admin + chưa có broadcast nào → ẩn cả lane (không khu rỗng). ADMIN luôn thấy (để tạo).
  if (!loading && !isAdmin && !hasContent) return null;

  const showPostsGroup = isAdmin || posts.total > 0;
  const showPollsGroup = isAdmin || polls.total > 0;

  return (
    <section
      aria-label="Thông báo và bình chọn"
      data-testid="broadcast-lane"
      className="border-line flex flex-col gap-5 rounded-md border border-dashed p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-ink flex items-center gap-2 font-serif text-xl leading-snug">
          <Megaphone size={20} weight="light" className="text-signal" />
          Thông báo &amp; Bình chọn
        </h2>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowPost(true)}>
              <Plus size={14} weight="bold" /> Thông báo
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowPoll(true)}>
              <Plus size={14} weight="bold" /> Bình chọn
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <BroadcastSkeleton />
      ) : (
        <>
          {showPostsGroup && (
            <div className="flex flex-col gap-3">
              <h3 className="text-ink-3 text-[11px] font-medium tracking-wider uppercase">
                Thông báo
              </h3>
              {posts.isError ? (
                <ErrorState
                  compact
                  onRetry={() => void posts.refetch()}
                  message="Không tải được thông báo"
                />
              ) : posts.posts.length === 0 ? (
                <p className="text-ink-3 text-sm">Chưa có thông báo nào</p>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {posts.posts.map((p) => (
                      <PostCard key={p.id} post={p} canInteract={canInteract} isAdmin={isAdmin} />
                    ))}
                  </div>
                  <Pager page={postPage} totalPages={posts.totalPages} onPageChange={setPostPage} />
                </>
              )}
            </div>
          )}

          {showPollsGroup && (
            <div className="flex flex-col gap-3">
              <h3 className="text-ink-3 flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
                <ChartBar size={13} weight="light" /> Bình chọn
              </h3>
              {polls.isError ? (
                <ErrorState
                  compact
                  onRetry={() => void polls.refetch()}
                  message="Không tải được bình chọn"
                />
              ) : polls.polls.length === 0 ? (
                <p className="text-ink-3 text-sm">Chưa có bình chọn nào</p>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {polls.polls.map((p) => (
                      <PollCard key={p.id} poll={p} canInteract={canInteract} isAdmin={isAdmin} />
                    ))}
                  </div>
                  <Pager page={pollPage} totalPages={polls.totalPages} onPageChange={setPollPage} />
                </>
              )}
            </div>
          )}
        </>
      )}

      {isAdmin && <CreatePostModal open={showPost} onClose={() => setShowPost(false)} />}
      {isAdmin && <CreatePollModal open={showPoll} onClose={() => setShowPoll(false)} />}
    </section>
  );
}

function BroadcastSkeleton() {
  return (
    <div className="flex flex-col gap-3" data-testid="broadcast-skeleton">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
