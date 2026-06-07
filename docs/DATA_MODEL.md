# SchooIOS — Data Model (Single Source of Truth)

> Nguồn sự thật cho schema. Trước khi thêm field/model, đối chiếu file này.
> Schema: [`web/prisma/schema.prisma`](../web/prisma/schema.prisma) · Migration: `web/prisma/migrations/`.

## Models (9)
| Model | Vai trò | Field đáng chú ý |
|---|---|---|
| `User` | Tài khoản 4 role | `email` unique, `passwordHash` (không bao giờ trả về), `role`, `isActive` |
| `Case` | Sự vụ (trung tâm) | `caseCode` (auto `CASE-YYYY-00001`), `title`, `description`, `location?`, `categoryId`, `priority`, `status`, `isSensitive`, `isEmergency`, `studentFlaggedEmergency`, `createdById`, `assignedToId?`, `resolvedAt?`, `closedAt?`, `deletedAt?` (soft delete) |
| `Category` | Lookup loại sự vụ | `name` unique, `defaultPriority?`, `defaultSensitive`, `isActive` |
| `Comment` | Trao đổi trong case | `body`, `isInternal` (ẩn với STUDENT) |
| `Attachment` | File (Supabase Storage) | `filePath` (private path, dùng Signed URL), `fileSize`, `mimeType` |
| `Notification` | Thông báo người dùng | `userId`, `caseId?`, `type`, `isRead`, `readAt?` |
| `CaseStatusHistory` | Timeline vòng đời (append-only) | `fromStatus?`, `toStatus`, `changedById`, `note?` |
| `AuditLog` | Audit mọi mutation (append-only) | `actorId?`, `action`, `entityType`, `entityId`, `metadata` (JSON `{before, after, ...}`) |
| `RefreshToken` | Session/logout | `tokenHash` unique, `expiresAt`, `revokedAt?` |

## Enums
- `Role`: STUDENT, STAFF, ADMIN, AUDITOR
- `CaseStatus`: NEW → TRIAGED → ASSIGNED → IN_PROGRESS → WAITING_FOR_USER → RESOLVED → CLOSED
- `CasePriority`: LOW, MEDIUM, HIGH, CRITICAL
- `NotificationType`: CASE_ASSIGNED, STATUS_CHANGED, COMMENT_ADDED, EMERGENCY_CONFIRMED, CASE_RESOLVED
- `AuditAction`: CREATE, UPDATE, DELETE, ASSIGN, STATUS_CHANGE, LOGIN, LOGOUT, EMERGENCY_FLAG, SENSITIVE_FLAG

## Chính sách (đã chốt)
- **ID** = `cuid()`. **Soft delete** là chính (`Case.deletedAt`); FK dùng `Restrict` để không mất dữ liệu khi lỡ hard-delete.
- **Immutable ở tầng DB**: `audit_logs`, `case_status_history` có trigger chặn UPDATE/DELETE (xem `web/prisma/migrations/README.md`).
- **Emergency Hybrid**: `studentFlaggedEmergency` (ý định học sinh) tách `isEmergency` (xác nhận hệ thống/AI).
- **Sensitivity**: `isSensitive` thủ công (STAFF/ADMIN bật); STUDENT không thấy case sensitive (enforce ở service layer).
- **Search**: GIN trigram (`pg_trgm`) trên `cases.title`/`description` cho ILIKE.
- **Index**: composite bám query path (status/assignedTo/createdBy + createdAt; notifications unread; timeline; audit theo actor/action).
- **Audit payload**: `metadata` JSON theo convention `{ before, after, ...context }`, ghi qua **một** helper `recordAudit()` + Zod (P3+).
- **Naming**: model PascalCase, field camelCase, cột/bảng snake_case (`@map`/`@@map`).

## ⛔ Deferred — KHÔNG thêm nếu chưa được chốt lại
Các mục dưới đây **cố ý chưa làm** cho MVP 7 ngày. Đừng để prompt/critique cũ kéo lại:
- **`schoolId` (multi-trường/tenant)** — retrofit: thêm vào `User` + `Case`, đưa vào **leftmost** mọi composite index + filter ở mọi permission check + seed.
- **`Location` entity** — hiện dùng `Case.location` free-text; chỉ tách bảng khi cần thống kê theo địa điểm.
- **`dueAt`/SLA + "overdue"** — cần logic SLA mới.
- **Partition/retention/archiving** cho `audit_logs`, `notifications`, `case_status_history` — chỉ cần khi >~1M rows.
- **`before`/`after` thành cột cứng** — đang dùng `metadata` JSON, đủ linh hoạt.

## Runtime (Prisma 7)
PrismaClient bắt buộc driver adapter: [`web/src/lib/prisma.ts`](../web/src/lib/prisma.ts) dùng `@prisma/adapter-pg`
(DATABASE_URL pooled) + global `omit: { user: { passwordHash: true } }`. Auth login phải opt-in đọc `passwordHash`.
