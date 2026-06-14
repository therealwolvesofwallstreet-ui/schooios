// Helper quyền xem case dùng chung cho list + detail (CLAUDE.md: Public/Transparent Model).
// Base luôn lọc soft-delete (deletedAt=null). Mỗi role ghép thêm điều kiện:
//   ADMIN/AUDITOR → xem tất cả (gồm nhạy cảm);
//   STUDENT → công khai (không nhạy cảm) ∪ case của mình (kể cả nhạy cảm của mình);
//   STAFF → (case được giao ∪ NEW/TRIAGED) GIAO VỚI sensitivity-gate.
// Update C — sensitivity-gate (BẤT BIẾN): case nhạy cảm CHỈ hiện với ADMIN/AUDITOR + chính người
//   tạo (createdById==viewer). STAFF KHÔNG còn thấy case nhạy cảm dù được giao (siết so với trước).
import type { Prisma, Role } from "@/generated/prisma/client";
import { CaseStatus } from "@/generated/prisma/client";

export function caseWhereForRole(p: { sub: string; role: Role }): Prisma.CaseWhereInput {
  const base: Prisma.CaseWhereInput = { deletedAt: null };
  // Sensitivity-gate Update C: thấy nếu KHÔNG nhạy cảm HOẶC chính mình tạo.
  const sensitivityGate: Prisma.CaseWhereInput = {
    OR: [{ isSensitive: false }, { createdById: p.sub }],
  };
  switch (p.role) {
    case "ADMIN":
    case "AUDITOR":
      return base; // thấy tất, gồm nhạy cảm
    case "STAFF":
      // (work-scope) AND (sensitivity-gate) → nhạy cảm bị loại khỏi tầm STAFF trừ case của chính mình.
      return {
        ...base,
        AND: [
          { OR: [{ assignedToId: p.sub }, { status: { in: [CaseStatus.NEW, CaseStatus.TRIAGED] } }] },
          sensitivityGate,
        ],
      };
    case "STUDENT":
    default:
      // công khai ∪ của-mình (== sensitivity-gate; STUDENT không có work-scope riêng).
      return { ...base, ...sensitivityGate };
  }
}

// ───────────────────────── Update C: mask danh tính ẩn danh (tập trung 1 nơi) ─────────────────────────
// Sentinel khi che người tạo case ẩn danh. role=STUDENT để KHÔNG lộ vai trò thật của người báo.
export const ANONYMOUS_CREATOR_ID = "anonymous";
const ANONYMOUS_CREATOR = { id: ANONYMOUS_CREATOR_ID, name: "Ẩn danh", role: "STUDENT" as Role };

// Viewer được thấy danh tính THẬT của người tạo? ADMIN/AUDITOR + chính người tạo (creator).
function canSeeIdentity(viewer: { sub: string; role: Role }, createdById: string): boolean {
  return viewer.role === "ADMIN" || viewer.role === "AUDITOR" || createdById === viewer.sub;
}

type CreatorRef = { id: string; name: string; role: Role };
type MaskableCase = { isAnonymous: boolean; createdById: string; createdBy: CreatorRef };
type CommentAuthorRef = { authorId: string; author: CreatorRef };

// Mask danh tính người tạo của 1 case ẩn danh khi viewer không được phép. Trả case MỚI (không mutate).
// MỌI endpoint trả case PHẢI đi qua hàm này (list/detail/lane/mutation-response).
export function maskCaseIdentity<T extends MaskableCase>(
  c: T,
  viewer: { sub: string; role: Role },
): T {
  if (!c.isAnonymous || canSeeIdentity(viewer, c.createdById)) return c;
  return { ...c, createdById: ANONYMOUS_CREATOR_ID, createdBy: { ...ANONYMOUS_CREATOR } } as T;
}

export function maskCases<T extends MaskableCase>(
  cases: T[],
  viewer: { sub: string; role: Role },
): T[] {
  return cases.map((c) => maskCaseIdentity(c, viewer));
}

// Mask danh tính trong 1 mảng "actor entries" (comment/statusHistory) khi entry do CHÍNH creator tạo.
// idKey = field id (authorId/changedById); objKey = field object (author/changedBy) shape CreatorRef.
function maskActorEntries<E>(entries: E[], idKey: keyof E, objKey: keyof E, realCreatorId: string): E[] {
  return entries.map((e) =>
    (e[idKey] as unknown as string) === realCreatorId
      ? ({ ...e, [idKey]: ANONYMOUS_CREATOR_ID, [objKey]: { ...ANONYMOUS_CREATOR } } as E)
      : e,
  );
}

// Mask author của comment do CHÍNH người tạo case ẩn danh viết (chống de-anon qua comment.author).
// Dùng cho GET /comments (ngoài detail). ctx = {isAnonymous, createdById} của CASE.
export function maskCommentAuthors<T extends CommentAuthorRef>(
  comments: T[],
  ctx: { isAnonymous: boolean; createdById: string },
  viewer: { sub: string; role: Role },
): T[] {
  if (!ctx.isAnonymous || canSeeIdentity(viewer, ctx.createdById)) return comments;
  return maskActorEntries(comments, "authorId", "author", ctx.createdById);
}

// Mask 1 case detail trong 1 lượt — che danh tính người tạo ở MỌI vector lộ trên detail:
//   createdBy + comment.author (creator viết) + statusHistory.changedBy (entry NEW do creator tạo)
//   + attachment.uploadedBy (file creator tải lên). KHÔNG đụng assignedTo (= người XỬ LÝ, không phải
//   người báo — hiển thị handler là đúng ngữ nghĩa, không phải rò danh tính reporter).
export function maskCaseDetail<
  T extends MaskableCase & {
    comments: CommentAuthorRef[];
    statusHistory: { changedById: string; changedBy: CreatorRef }[];
    attachments: { uploadedBy: { id: string; name: string } | null }[];
  },
>(c: T, viewer: { sub: string; role: Role }): T {
  if (!c.isAnonymous || canSeeIdentity(viewer, c.createdById)) return c;
  const real = c.createdById;
  return {
    ...c,
    createdById: ANONYMOUS_CREATOR_ID,
    createdBy: { ...ANONYMOUS_CREATOR },
    comments: maskActorEntries(c.comments, "authorId", "author", real),
    statusHistory: maskActorEntries(c.statusHistory, "changedById", "changedBy", real),
    attachments: c.attachments.map((a) =>
      a.uploadedBy && a.uploadedBy.id === real
        ? { ...a, uploadedBy: { id: ANONYMOUS_CREATOR_ID, name: "Ẩn danh" } }
        : a,
    ),
  } as T;
}

// Include chuẩn cho detail (1 case đầy đủ). comments lọc isInternal ở tầng route theo role.
export const caseDetailInclude = {
  category: true,
  locationRef: true,
  createdBy: { select: { id: true, name: true, role: true } },
  assignedTo: { select: { id: true, name: true } },
  // KHÔNG select filePath (private storage — truy cập qua Signed URL ở P6, không lộ đường dẫn).
  attachments: {
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
  },
  // Kèm người đổi (parity với comments.author) → timeline hữu dụng, không chỉ cuid trơ.
  statusHistory: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], // id tiebreaker → thứ tự tất định khi trùng createdAt

    include: { changedBy: { select: { id: true, name: true, role: true } } },
  },
} satisfies Prisma.CaseInclude;

// Include TỐI THIỂU cho response sau mutation (assign/status P5): đủ cho client cập nhật UI,
// nhẹ hơn caseDetailInclude (không kéo attachments/statusHistory/comments). KHÔNG lộ passwordHash
// (User omit toàn cục + chỉ select id/name/role). Dùng include → trả kèm mọi scalar (status,
// assignedToId, resolvedAt, closedAt…) để test/UI đọc trực tiếp.
export const caseMutationInclude = {
  category: true,
  createdBy: { select: { id: true, name: true, role: true } },
  assignedTo: { select: { id: true, name: true, role: true } },
} satisfies Prisma.CaseInclude;
