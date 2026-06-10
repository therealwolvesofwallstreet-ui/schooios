# SchooIOS — Backend/Infra Context (Brain)

> Bộ não tinh gọn: chỉ **bất biến + con trỏ**. Sự thật schema ở `docs/DATA_MODEL.md`
> (SSOT — auto-import cuối file). Dữ liệu trường: `docs/CAMPUS.md`. Tiến độ: `docs/ROADMAP.md`.

## Overview
- SchooIOS: hệ thống quản lý sự vụ học đường — tiếp nhận, phân loại, điều phối, theo dõi
  báo cáo/sự cố trong trường.
- Role: Backend/Infra Lead (nhánh `feature/backend`). MVP 7 ngày, team 2 người.
- Dữ liệu THẬT đã nạp (Trường THPT Chuyên Lý Tự Trọng): 12 building · 96 location · 11
  category · 36 class · 979 student · 3 ADMIN. **Case là dữ liệu SỐNG, sinh từ app (P4+),
  KHÔNG seed.**

## Tech Stack
- **Next.js 16.2.7 + React 19.2.4**, App Router, TS strict. ⚠ Next 16 nhiều breaking change
  — đọc `web/AGENTS.md` + `web/node_modules/next/dist/docs/` TRƯỚC khi viết code Next. Heed
  deprecation notices.
- **Prisma 7 + Supabase PostgreSQL.** Bắt buộc driver adapter `@prisma/adapter-pg` (đã cấu
  hình ở `web/src/lib/prisma.ts` — singleton, KHÔNG tạo lại/ghi đè). Import types/enum/client
  TỪ `@/generated/prisma/client` (KHÔNG phải `@prisma/client`).
- **Auth:** JWT bằng `jose`. **Storage:** Supabase Storage (Attachment dùng `filePath`
  private + Signed URL). **Deploy:** Vercel.

## Core Rules — LUÔN TUÂN THỦ
- **Validation:** Zod cho MỌI API request. Sai → 400.
- **ID & xóa:** `cuid()` cho ID; soft delete (`Case.deletedAt`) cho case.
- **Mật khẩu:** KHÔNG BAO GIỜ trả `passwordHash`. `prisma.ts` đã `omit` toàn cục — chỉ
  login/đổi mật khẩu mới opt-in `omit: { passwordHash: false }` khi cần so khớp.
- **Audit:** mọi mutation + login/logout PHẢI ghi `AuditLog` (immutable — DB trigger chặn
  UPDATE/DELETE) qua MỘT helper `recordAudit()`; `metadata` JSON `{ before, after, ...context }`.
- **Privacy:** `Case.isSensitive` (default false) ẩn vụ nhạy cảm khỏi STUDENT khác (enforce
  ở service layer).
- **Emergency Hybrid:** tách `Case.studentFlaggedEmergency` (HS bấm nút trên UI) vs
  `Case.isEmergency` (cờ chính thức do STAFF/ADMIN/AI duyệt → trigger notify).
- **Naming:** model PascalCase · field camelCase · cột/bảng snake_case (`@map`/`@@map`).
  Trong code TS/Prisma LUÔN dùng camelCase (`isSensitive`, `createdById`, `passwordHash`),
  KHÔNG dùng tên cột snake_case.

## Permissions (Public/Transparent Model)
- **STUDENT:** xem mọi case CÔNG KHAI, TRỪ case `isSensitive=true` (chỉ `createdById` +
  STAFF/ADMIN thấy). Chỉ sửa case do mình tạo (`createdById = userId`).
- **STAFF:** xem case `assignedToId=mình` + case status NEW/TRIAGED. Được **self-assign**
  case NEW/TRIAGED.
- **ADMIN:** xem tất cả; toàn quyền điều phối (assign cho người khác).
- **AUDITOR:** read-only toàn bộ.
- **State:** NEW → TRIAGED → ASSIGNED → IN_PROGRESS → WAITING_FOR_USER → RESOLVED → CLOSED.

## Verification Workflow
- Sau mỗi route/feature: `npx tsc --noEmit` rồi `bash scripts/test-all.sh [phase]`
  (harness: build → tsc → prisma validate → `test-<phase>.sh`).
- ⚠ Đừng để `npm run dev` chạy song song lúc `test-all.sh` build (tranh chấp `.next`).
- Commit sau mỗi step nhỏ pass.

## Bản đồ tài liệu & mã nguồn
- `docs/DATA_MODEL.md` — **SSOT schema** (13 model, enum, policy, bootstrap, runtime Prisma 7,
  deferred). Sửa schema ⇒ sửa file này TRƯỚC.
- `docs/CAMPUS.md` — dữ liệu trường thật (login model, location, category, admin, lớp/HS).
- `docs/ROADMAP.md` — tiến độ P0→P9 · `web/AGENTS.md` — landmine Next 16.
- `web/src/app/api/` route · `web/src/lib/` logic (prisma, jwt, audit, validation) ·
  `web/prisma/` schema+migration.

## Token discipline (BẮT BUỘC khi merge FE↔BE)
- KHÔNG "đọc/quét toàn dự án". Dùng "Bản đồ tài liệu & mã nguồn" + đường dẫn cụ thể.
- Rà >3 file → giao subagent, yêu cầu trả TÓM TẮT/BẢNG, KHÔNG dán code.
- Đối chiếu FE↔BE → đọc/ghi docs/MERGE_MAP.md (không tái khám phá).
- Mỗi phase = 1 session sạch (/clear); chỉ next build ở cuối phase; KHÔNG đọc lại file vừa Edit.
- CẤM đọc: node_modules/, web/.next/, web/src/generated/.

@docs/ROADMAP.md
@docs/DATA_MODEL.md
