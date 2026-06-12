"use client";

// TRANG CHỦ NHÂN SỰ — intent = TRIAGE, không tạo mới. 2 bucket chia CLIENT-SIDE (§1.5) trên union
// server trả: GET /cases (STAFF) = {assignedToId=me} ∪ {status∈NEW,TRIAGED}.
//   • "Vụ của tôi"   = c.assignedToId === me            (việc đang gánh)
//   • "Đang chờ nhận" = c.status∈{NEW,TRIAGED} ∧ assignedToId==null  (có thể self-assign)
// Hai bucket nằm TRỌN trong union → không rò case ngoài quyền. Empty RIÊNG mỗi bucket.
// GIẢ ĐỊNH (đóng băng hôm nay): "đang chờ nhận" = NEW/TRIAGED chưa giao — bám luật self-assign ở
// CLAUDE.md state machine; nếu luật workflow đổi thì cách suy ra bucket này đổi theo. KHÔNG /dashboard.
import { motion, useReducedMotion } from "framer-motion";
import { useCaseList } from "@/hooks/useCaseList";
import { EASE_EMERGE_BEZIER } from "@/lib/cubic-bezier";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/app/states";
import { MiniSpine } from "./MiniSpine";
import type { SessionUser } from "@/hooks/useSession";

export function StaffHome({ user }: { user: SessionUser }) {
  const { cases, isLoading, isError, refetch } = useCaseList(user.id, { limit: 100 });
  const reduced = useReducedMotion() ?? true;

  const mine = cases.filter((c) => c.assignedToId === user.id);
  const waiting = cases.filter(
    (c) => (c.status === "NEW" || c.status === "TRIAGED") && c.assignedToId == null,
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 py-6">
      {/* Header emerge — micro motion (Refined tier), gate reduced-motion. */}
      <motion.header
        className="flex flex-col gap-2"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE_EMERGE_BEZIER }}
      >
        <h1 className="text-ink font-serif text-3xl leading-snug">Bàn điều phối của bạn</h1>
        <p className="text-ink-3 text-sm">Tiếp nhận, phân loại và theo dấu vụ việc.</p>
      </motion.header>

      {isLoading ? (
        <BucketSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <>
          <Bucket
            title="Vụ của tôi"
            testid="bucket-mine"
            cases={mine}
            emptyMessage="Bạn chưa nhận vụ nào."
          />
          <Bucket
            title="Đang chờ nhận"
            testid="bucket-waiting"
            cases={waiting}
            emptyMessage="Không có vụ nào đang chờ."
          />
        </>
      )}
    </div>
  );
}

function Bucket({
  title,
  testid,
  cases,
  emptyMessage,
}: {
  title: string;
  testid: string;
  cases: ReturnType<typeof useCaseList>["cases"];
  emptyMessage: string;
}) {
  return (
    <section className="flex flex-col gap-4" data-testid={testid}>
      <h2 className="text-ink-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase">
        {title}
        <span className="text-ink-3/70">· {cases.length}</span>
      </h2>
      {cases.length === 0 ? (
        <Card>
          <EmptyState message={emptyMessage} />
        </Card>
      ) : (
        <MiniSpine cases={cases} />
      )}
    </section>
  );
}

function BucketSkeleton() {
  return (
    <div className="flex flex-col gap-12">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-4 pl-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-5/6" />
        </div>
      ))}
    </div>
  );
}
