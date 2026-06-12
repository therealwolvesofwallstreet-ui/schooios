"use client";

// Trang TRUNG TÂM nghiệp vụ: hồ sơ sống trên Spine + rail hành động/meta. Desktop = [Spine | rail]
// (rail sticky); mobile stack header→spine→actions (grid-cols-1). States: loading (skeleton "thở") ·
// 404 ĐỒNG NHẤT (serif 1 dòng — không phân biệt không-tồn-tại vs không-quyền) · lỗi tải (điềm tĩnh +
// Thử lại). Quyền hiển thị do từng component con tự quyết (panel/composer null khi không phép).
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import { useSession } from "@/hooks/useSession";
import { useHydrated } from "@/hooks/useHydrated";
import { EASE_EMERGE_BEZIER } from "@/lib/cubic-bezier";
import { CaseHeader } from "./CaseHeader";
import { Spine } from "./Spine";
import { CaseActionPanel } from "./CaseActionPanel";
import { CommentComposer } from "./CommentComposer";
import { AttachmentGallery } from "@/components/attachments/AttachmentGallery";
import { Card } from "@/components/ui/Card";
import { DetailSkeleton, NotFoundState, ErrorState } from "@/components/app/states";
import { formatDateTime } from "@/lib/case-display";
import type { CaseDetail } from "@/lib/api-types";

// Cuộn điện ảnh Lenis (client-only) — nạp lazy, mount sau HYDRATE cho MỌI người (KHÔNG gate prefers-
// reduced-motion — owner "immersive cho mọi người"). SSR/first-paint = cuộn thường (no flash). KHÔNG
// đụng dữ liệu/quyền — chỉ vòng đời smooth-scroll trên window.
const CinematicScroll = dynamic(() => import("@/components/motion/CinematicScroll"), { ssr: false });

export function CaseDetailView({ caseId }: { caseId: string }) {
  const { case: detail, isLoading, isError, notFound, refetch } = useCaseDetail(caseId);
  const { user, role } = useSession();
  // `staticFirst` = pre-hydrate (SSR-safe), KHÔNG prefers-reduced-motion.
  const staticFirst = !useHydrated();

  if (isLoading) return <DetailSkeleton />;
  if (notFound) return <NotFoundState />;
  if (isError || !detail)
    return <ErrorState onRetry={() => void refetch()} message="Không tải được hồ sơ." />;

  // Quyền upload/xem/xóa ảnh (gate server là chân lý; FE chỉ ẩn nút — không giảm bảo mật).
  const canMutate =
    !!user &&
    (user.id === detail.createdById ||
      user.id === detail.assignedToId ||
      role === "ADMIN");
  const canDelete = !!user && (user.id === detail.createdById || role === "ADMIN");

  const content = (
    <div className="mx-auto max-w-5xl py-10">
      {/* Đầu hồ sơ "hiện" lên (Rich tier) — gate reduced-motion; tiêu đề GIỮ Newsreader (font-serif):
          tên case là tiếng Việt tuỳ ý có dấu thanh, Cormorant thiếu glyph → vỡ dấu (quyết định như F3a). */}
      <motion.div
        initial={staticFirst ? false : { opacity: 0, y: 10 }}
        animate={staticFirst ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE_EMERGE_BEZIER }}
      >
        <CaseHeader detail={detail} />
      </motion.div>
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-8">
          <Spine detail={detail} />
          {/* Ảnh đính kèm — phía dưới Spine, trên comment composer. */}
          {user && (
            <AttachmentGallery
              attachments={detail.attachments}
              caseId={detail.id}
              canMutate={canMutate}
              canDelete={canDelete}
              currentUserId={user.id}
            />
          )}
          <CommentComposer caseId={detail.id} />
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <CaseActionPanel detail={detail} />
          <CaseMeta detail={detail} />
        </aside>
      </div>
    </div>
  );

  return staticFirst ? content : <CinematicScroll>{content}</CinematicScroll>;
}

function CaseMeta({ detail }: { detail: CaseDetail }) {
  const rows: Array<[string, string]> = [
    ["Loại", detail.category.name],
    ["Nơi", detail.locationRef ? `${detail.locationRef.code} · ${detail.locationRef.name}` : "—"],
    ["Người báo", detail.createdBy.name],
    ["Phụ trách", detail.assignedTo?.name ?? "Chưa giao"],
    ["Tạo lúc", formatDateTime(detail.createdAt)],
  ];
  return (
    <Card>
      <h2 className="text-ink-3 mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">Hồ sơ</h2>
      <dl className="flex flex-col gap-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-3 shrink-0 text-xs">{label}</dt>
            <dd className="text-ink text-right text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
