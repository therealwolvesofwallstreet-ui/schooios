# SchooIOS — Backend/Infra Context
## Overview
- SchooIOS là hệ thống quản lý sự vụ học đường: tiếp nhận, phân loại, điều phối và theo dõi các báo cáo/sự cố trong trường học.
- Role: Backend/Infra Lead (Nhánh: feature/backend)
- MVP 7 ngày, team 2 người
## Tech Stack
- Next.js 14 App Router (TypeScript strict)
- ORM: Prisma | DB: Supabase PostgreSQL
- Auth: JWT (jose) | Storage: Supabase Storage
- Deploy: Vercel
## Core Rules — LUÔN TUÂN THỦ
- Input validation: Dùng Zod cho mọi API request.
- Database: Dùng cuid() cho ID, soft delete (deleted_at) cho cases.
- Security: Không bao giờ trả password_hash trong response.
- Audit: Mọi mutation PHẢI ghi AuditLog (immutable).
## Permissions & State
- ## Permission rules (Public/Transparent Model)
- STUDENT: 
    - Xem tất cả các case (Công khai).
    - Chỉ được Sửa/Update case do mình tạo (created_by = userId).
    - Không được chỉnh sửa case của người khác.
- STAFF: Xem case assigned_to=mình + case status NEW/TRIAGED (tất cả).
- ADMIN: Xem tất cả.
- AUDITOR: Read-only toàn bộ.
- State: NEW → TRIAGED → ASSIGNED → IN_PROGRESS → WAITING_FOR_USER → RESOLVED → CLOSED.
## Verification Workflow
- Sau mỗi route/feature: chạy `npx tsc --noEmit` và kiểm tra `scripts/test-all.sh`.
- Commit sau mỗi step nhỏ thành công.
## Routing
- web/src/app/api/ — API routes
- web/src/lib/ — logic (prisma, jwt, helpers)
- web/prisma/ — schema, migrations
- docs/tasks/ — task files chi tiết
@docs/ROADMAP.md
