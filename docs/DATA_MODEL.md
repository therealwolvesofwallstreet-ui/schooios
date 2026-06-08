# SchooIOS — Data Model (Single Source of Truth)

> Nguồn sự thật cho schema. Trước khi thêm field/model, đối chiếu file này.
> Schema: [`web/prisma/schema.prisma`](../web/prisma/schema.prisma) · Migration: `web/prisma/migrations/`.

## Models (13)
| Model | Vai trò | Field đáng chú ý |
|---|---|---|
| `User` | Tài khoản 4 role | `email?` unique (STAFF/ADMIN), `sbd?` unique (STUDENT đăng nhập bằng SBD), `passwordHash` (không bao giờ trả về), `role`, `dob?`, `gender?`, `admissionYear?`, `isActive` |
| `Case` | Sự vụ (trung tâm) | `caseCode` (auto `CASE-YYYY-00001`), `title`, `description`, `location?` (ghi chú text), `locationId?`→Location, `categoryId`, `priority`, `status`, `isSensitive`, `isEmergency`, `studentFlaggedEmergency`, `createdById`, `assignedToId?`, `resolvedAt?`, `closedAt?`, `deletedAt?` (soft delete) |
| `Category` | Lookup loại sự vụ | `name` unique, `defaultPriority?`, `defaultSensitive`, `isActive` |
| `Comment` | Trao đổi trong case | `body`, `isInternal` (ẩn với STUDENT) |
| `Attachment` | File (Supabase Storage) | `filePath` (private path, dùng Signed URL), `fileSize`, `mimeType` |
| `Notification` | Thông báo người dùng | `userId`, `caseId?`, `type`, `isRead`, `readAt?` |
| `CaseStatusHistory` | Timeline vòng đời (append-only) | `fromStatus?`, `toStatus`, `changedById`, `note?` |
| `AuditLog` | Audit mọi mutation (append-only) | `actorId?`, `action`, `entityType`, `entityId`, `metadata` (JSON `{before, after, ...}`) |
| `RefreshToken` | Session/logout | `tokenHash` unique, `expiresAt`, `revokedAt?` |
| `Building` | Tòa/khối nhà | `code` unique, `name`, `type` (BuildingType), `note?` |
| `Location` | Phòng/khu vực (địa điểm report) | `code` unique, `name`, `buildingId?` (null=khu chung), `floor?`, `type` (LocationType), `isActive` |
| `Class` | Lớp theo niên khóa | `name`, `schoolYear`, `grade?`, `specialization?`, `@@unique([name, schoolYear])` |
| `Enrollment` | Ghi danh HS ↔ lớp (lịch sử theo năm) | `studentId`→User, `classId`→Class, `isActive`, `@@unique([studentId, classId])` |

## Enums
- `Role`: STUDENT, STAFF, ADMIN, AUDITOR
- `CaseStatus`: NEW → TRIAGED → ASSIGNED → IN_PROGRESS → WAITING_FOR_USER → RESOLVED → CLOSED
- `CasePriority`: LOW, MEDIUM, HIGH, CRITICAL
- `NotificationType`: CASE_ASSIGNED, STATUS_CHANGED, COMMENT_ADDED, EMERGENCY_CONFIRMED, CASE_RESOLVED
- `AuditAction`: CREATE, UPDATE, DELETE, ASSIGN, STATUS_CHANGE, LOGIN, LOGOUT, EMERGENCY_FLAG, SENSITIVE_FLAG
- `Gender`: MALE, FEMALE (null = chưa rõ, vd khối 10 nguồn thiếu)
- `BuildingType`: CLASSROOM, SPECIAL, FACILITY, OFFICE, OUTDOOR
- `LocationType`: CLASSROOM, FACILITY, OFFICE, OUTDOOR, OTHER

## Chính sách (đã chốt)
- **ID** = `cuid()`. **Soft delete** là chính (`Case.deletedAt`); FK dùng `Restrict` để không mất dữ liệu khi lỡ hard-delete.
- **Immutable ở tầng DB**: `audit_logs`, `case_status_history` có trigger chặn UPDATE/DELETE (xem `web/prisma/migrations/README.md`).
- **Emergency Hybrid**: `studentFlaggedEmergency` (ý định học sinh) tách `isEmergency` (xác nhận hệ thống/AI).
- **Sensitivity**: `isSensitive` thủ công (STAFF/ADMIN bật); STUDENT không thấy case sensitive (enforce ở service layer).
- **Search**: GIN trigram (`pg_trgm`) trên `cases.title`/`description` cho ILIKE.
- **Index**: composite bám query path (status/assignedTo/createdBy + createdAt; notifications unread; timeline; audit theo actor/action).
- **Audit payload**: `metadata` JSON theo convention `{ before, after, ...context }`, ghi qua **một** helper `recordAudit()` + Zod (P3+).
- **Naming**: model PascalCase, field camelCase, cột/bảng snake_case (`@map`/`@@map`).

## Dữ liệu bootstrap (THẬT — 1 trường)
Nguồn: `docs/data/` (Trường THPT Chuyên Lý Tự Trọng). Nạp bằng `prisma/seed.ts` (`npx prisma db seed`), idempotent:
**11 categories · 12 buildings · 96 locations · 3 ADMIN · 36 classes · 979 students · 979 enrollments.**
- `campus.json` (cơ sở vật chất) + `classes.json` (sĩ số) → **commit**. `students.json` (PII: tên+DOB) → **gitignored**.
- **Case "thật" sinh từ app (P4+), KHÔNG seed.** Data giả test API: `prisma/seed-dev.ts` (dev-only, gắn nhãn `[DEMO]`, KHÔNG vào `migrations.seed`).
- Login: STUDENT bằng `sbd` (mật khẩu mặc định `123456`); STAFF/ADMIN bằng `email` (admin pw từ `SEED_ADMIN_PASSWORD`, fallback `Admin@12345`).
- **Mật khẩu seed chỉ là TẠM (vé đăng nhập lần đầu).** P3 sẽ thêm cờ `User.mustChangePassword` (Boolean, default true cho tài khoản seed; migration **additive**) → đăng nhập lần đầu bị **bắt buộc đổi mật khẩu** trước khi vào hệ thống. Admin/HS tự đặt mật khẩu thật, KHÔNG hardcode trong seed.

## ⛔ Deferred — KHÔNG thêm nếu chưa được chốt lại
- **`schoolId` (multi-trường/tenant)** — retrofit: thêm vào `User` + `Case` (+ Building/Location/Class), đưa vào **leftmost** mọi composite index + filter ở mọi permission check + seed.
- **`dueAt`/SLA + "overdue"** — cần logic SLA mới.
- **Partition/retention/archiving** cho `audit_logs`, `notifications`, `case_status_history` — chỉ cần khi >~1M rows.
- **`before`/`after` thành cột cứng** — đang dùng `metadata` JSON, đủ linh hoạt.
- *(Đã làm, không còn defer: `Location` entity → có Building/Location phân cấp; `Class`/`Enrollment`.)*

## Runtime (Prisma 7)
PrismaClient bắt buộc driver adapter: [`web/src/lib/prisma.ts`](../web/src/lib/prisma.ts) dùng `@prisma/adapter-pg`
(DATABASE_URL pooled) + global `omit: { user: { passwordHash: true } }`. Auth login phải opt-in đọc `passwordHash`.
