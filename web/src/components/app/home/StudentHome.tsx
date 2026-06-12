"use client";

// TRANG CHỦ HỌC SINH — lời mời cất tiếng nói + xem lại hoạt động GẦN ĐÂY của mình.
// DATA SEMANTICS (§1.5): GET /cases (server-lọc) trả {isSensitive=false} ∪ {createdById=me}, sắp mới→cũ.
//  "Của tôi" = items.filter(createdById === me) trên union đó. KHÔNG render tập công khai như "của tôi".
//  ⚠ KHÔNG có param ?mine server-side → đây là PREVIEW "hoạt động gần đây" (limit nhỏ), KHÔNG phải danh
//    sách ĐẦY ĐỦ: case CỦA TÔI cũ hơn có thể nằm ngoài limit. Vì vậy nhãn = "Hoạt động gần đây" và
//    empty KHÔNG nói "bạn chưa từng báo cáo" (sẽ là lời nói dối) mà nói "chưa có hoạt động gần đây".
//    RESIDUAL CHẶN tính đúng: backend GET /api/cases?mine (xem ROADMAP) → khi có mới làm "của tôi" đủ.
//  KHÔNG chart, KHÔNG /dashboard.
import Link from "next/link";
import { Fragment } from "react";
import { motion } from "framer-motion";
import { useCaseList } from "@/hooks/useCaseList";
import { useHydrated } from "@/hooks/useHydrated";
import { EASE_EMERGE_BEZIER } from "@/lib/cubic-bezier";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/app/states";
import { MiniSpine } from "./MiniSpine";
import type { SessionUser } from "@/hooks/useSession";

const PREVIEW_LIMIT = 6;

// Hero "cất tiếng nói" — chữ HIỆN theo từng từ (reveal). Gate theo HYDRATE (KHÔNG prefers-reduced-motion
// — owner "immersive cho mọi người"): SSR/first-paint render TĨNH (hiện rõ, không flash/ẩn), sau hydrate
// thì reveal cho MỌI người. Chữ Việt GIỮ Newsreader (font-serif) — Cormorant thiếu dấu thanh.
const HERO_TEXT = "Tiếng nói của bạn rất quan trọng.";
const HERO_WORDS = HERO_TEXT.split(" ");

function KineticHero() {
  const staticFirst = !useHydrated();
  const className = "text-ink max-w-xl font-serif text-3xl leading-snug md:text-4xl";
  if (staticFirst) {
    return <h1 className={className}>{HERO_TEXT}</h1>;
  }
  return (
    <motion.h1
      className={className}
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.05 }}
    >
      {HERO_WORDS.map((word, i) => (
        <Fragment key={i}>
          <motion.span
            className="inline-block"
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.4, ease: EASE_EMERGE_BEZIER }}
          >
            {word}
          </motion.span>
          {i < HERO_WORDS.length - 1 ? " " : null}
        </Fragment>
      ))}
    </motion.h1>
  );
}

export function StudentHome({ user }: { user: SessionUser }) {
  const { cases, isLoading, isError, refetch } = useCaseList(user.id, { limit: 100 });
  // Lọc CLIENT-SIDE: chỉ case do CHÍNH mình tạo (trên union đã-lọc server) → cắt lấy preview gần nhất.
  const mine = cases.filter((c) => c.createdById === user.id).slice(0, PREVIEW_LIMIT);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 py-6">
      <header className="flex flex-col items-start gap-5">
        <KineticHero />
        <Link href="/report/new">
          <Button variant="primary" size="md">
            Cất một tiếng nói
          </Button>
        </Link>
      </header>

      <section className="flex flex-col gap-4" data-testid="student-recent">
        <h2 className="text-ink-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          Hoạt động gần đây của bạn
        </h2>
        {isLoading ? (
          <RecentSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : mine.length === 0 ? (
          <Card>
            <EmptyState
              message="Chưa có hoạt động gần đây."
              action={
                <Link href="/report/new">
                  <Button variant="secondary" size="sm">
                    Cất một tiếng nói
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <MiniSpine cases={mine} />
        )}
      </section>
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div className="flex flex-col gap-4 pl-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-5/6" />
      <Skeleton className="h-12 w-4/6" />
    </div>
  );
}
