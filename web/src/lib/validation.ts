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
export const listCasesQuery = z.object({
  status: z.nativeEnum(CaseStatus).optional(),
  isEmergency: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type ListCasesQuery = z.infer<typeof listCasesQuery>;
