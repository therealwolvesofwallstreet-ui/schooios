// Helper quyền xem case dùng chung cho list + detail (CLAUDE.md: Public/Transparent Model).
// Base luôn lọc soft-delete (deletedAt=null). Mỗi role ghép thêm điều kiện:
//   ADMIN/AUDITOR → xem tất cả; STUDENT → công khai (không sensitive) + case của mình;
//   STAFF → case được giao (assignedToId) + case status NEW/TRIAGED.
import type { Prisma, Role } from "@/generated/prisma/client";
import { CaseStatus } from "@/generated/prisma/client";

export function caseWhereForRole(p: { sub: string; role: Role }): Prisma.CaseWhereInput {
  const base: Prisma.CaseWhereInput = { deletedAt: null };
  switch (p.role) {
    case "ADMIN":
    case "AUDITOR":
      return base;
    case "STAFF":
      return {
        ...base,
        OR: [{ assignedToId: p.sub }, { status: { in: [CaseStatus.NEW, CaseStatus.TRIAGED] } }],
      };
    case "STUDENT":
    default:
      return { ...base, OR: [{ isSensitive: false }, { createdById: p.sub }] };
  }
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
