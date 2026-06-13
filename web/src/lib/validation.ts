// Zod schema tập trung cho mọi API request (CLAUDE.md: validate mọi input, sai → 400).
import { z } from "zod";
import { CasePriority, CaseStatus } from "@/generated/prisma/client";

export const loginSchema = z.object({
  identifier: z.string().min(1), // email (STAFF/ADMIN) hoặc sbd (STUDENT)
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─────────────────────────── Cases (P4) ───────────────────────────
// emergency = ý định HS (studentFlaggedEmergency); sensitive = escalate-only (xem route).
// caseCode KHÔNG nhận từ client — DB tự sinh.
export const createCaseSchema = z.object({
  // trim trước khi đo độ dài → loại tiêu đề/mô tả toàn khoảng trắng; max chặn input khổng lồ.
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(5000),
  categoryId: z.string().min(1),
  locationId: z.string().min(1).optional(),
  priority: z.nativeEnum(CasePriority).optional(),
  emergency: z.boolean().optional(),
  sensitive: z.boolean().optional(),
});

// Query string → coerce sang số; isEmergency là chuỗi "true"/"false" → bool.
// status: nhận 1 giá trị HOẶC danh sách phẩy (`NEW,TRIAGED`) → CaseStatus[] (additive, tương thích
// ngược: 1 giá trị vẫn cho `{in:[x]}` y hệt cũ). Chuỗi rỗng/giá trị rác → 400 (giữ hành vi cũ).
export const listCasesQuery = z.object({
  status: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
      const allowed = Object.values(CaseStatus) as string[];
      if (parts.length === 0 || parts.some((p) => !allowed.includes(p))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid status filter" });
        return z.NEVER;
      }
      return parts as CaseStatus[];
    }),
  isEmergency: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type ListCasesQuery = z.infer<typeof listCasesQuery>;

// ─────────────────────────── Workflow + Assignment (P5) ───────────────────────────
// assign: chỉ nhận assignedToId; KHÔNG có dueAt (deferred — xem DATA_MODEL.md).
export const assignCaseSchema = z.object({
  // max chặn input khổng lồ (id là cuid ~25 ký tự) — nhất quán với title/description.
  assignedToId: z.string().min(1).max(64),
});

// changeStatus: status là enum thật (nativeEnum loại giá trị rác → 400); reason (tùy chọn) ghi vào history.note.
export const changeStatusSchema = z.object({
  status: z.nativeEnum(CaseStatus),
  reason: z.string().trim().max(1000).optional(),
});

export type AssignCaseInput = z.infer<typeof assignCaseSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

// ─────────────────────────── Comments + Notifications (P6) ───────────────────────────
// createComment: body trim trước khi đo (loại comment toàn khoảng trắng), max chặn input khổng lồ;
//   isInternal mặc định false (STUDENT bị ép false ở route — chỉ STAFF/ADMIN được đặt true).
//   parentId (Update A): reply thread — CHỈ ADMIN; route kiểm tra parent tồn tại+cùng case+không nested.
export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  isInternal: z.boolean().optional().default(false),
  parentId: z.string().min(1).max(64).optional(),
});

// ─────────────────────────── Vote (Update A) ───────────────────────────
// value: 1 (up) | -1 (down). Upsert: PUT /api/cases/[id]/vote.
export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

// listNotifications: coerce query string → số (giống listCasesQuery); unreadOnly "true"/"false" → bool.
export const listNotificationsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuery>;

// ─────────────────────────── Emergency lane (P7) ───────────────────────────
// setEmergency: bật/tắt cờ KHẨN CẤP CHÍNH THỨC (isEmergency) — KHÁC studentFlaggedEmergency
//   (nút HS bấm) và KHÔNG đụng status. reason (tùy chọn) ghi vào audit metadata + message notify.
//   Bắt buộc isEmergency là boolean thật (thiếu/sai kiểu → 400), không dùng default để no-op rõ ràng.
export const setEmergencySchema = z.object({
  isEmergency: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export type SetEmergencyInput = z.infer<typeof setEmergencySchema>;

// ─────────────────────────── Feed Broadcast: Posts + Polls (Update B) ───────────────────────────
// Post: body trim min(1) max(5000). Poll: question trim, options 2–8 (mỗi cái trim 1–200), closesAt ISO?.
// listBroadcastQuery: phân trang page-based dùng chung posts + polls.
export const createPostSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const listBroadcastQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createPollSchema = z.object({
  question: z.string().trim().min(1).max(500),
  // trim từng option, loại rỗng-sau-trim (min(1)); 2–8 phương án; max(200) chống input khổng lồ.
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(8),
  // ISO 8601 (vd new Date().toISOString()); cho phép offset. Quá khứ vẫn hợp lệ (poll đóng ngay).
  closesAt: z.string().datetime({ offset: true }).optional(),
});

export const votePollSchema = z.object({
  // optionId là cuid (~25 ký tự); max(64) nhất quán với assignedToId.
  optionId: z.string().min(1).max(64),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type ListBroadcastQuery = z.infer<typeof listBroadcastQuery>;
export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VotePollInput = z.infer<typeof votePollSchema>;
