// Zod schema tập trung cho mọi API auth request (CLAUDE.md: validate mọi input, sai → 400).
import { z } from "zod";

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
