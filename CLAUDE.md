# SchooIOS — Backend/Infra Context
## Overview
- SchooIOS là hệ thống quản lý sự vụ học đường: tiếp nhận, phân loại, điều phối và theo dõi các báo cáo/sự cố trong trường học.
- Role: Backend/Infra Lead (Nhánh: feature/backend)
- MVP 7 ngày, team 2 người
## Tech Stack
- Next.js 16.2.7 + React 19.2.4, App Router (TypeScript strict). LƯU Ý: Next.js 16 có breaking changes so với bản cũ — đọc `web/node_modules/next/dist/docs/` trước khi viết code Next.js.
- ORM: Prisma | DB: Supabase PostgreSQL
- Auth: JWT (jose) | Storage: Supabase Storage
- Deploy: Vercel
## Core Rules — LUÔN TUÂN THỦ
- Input validation: Dùng Zod cho mọi API request.
- Database: Dùng cuid() cho ID, soft delete (deleted_at) cho cases.
- Security: Không bao giờ trả password_hash trong response.
- Audit: Mọi mutation PHẢI ghi AuditLog (immutable).
**Privacy Design:** Model Case BẮT BUỘC có trường `is_sensitive` (Boolean, default: false) để ẩn các vụ việc nhạy cảm.
- **Emergency Hybrid Workflow:** Model Case BẮT BUỘC tách biệt 2 trường: `student_flagged_emergency` (Boolean - ghi nhận việc học sinh bấm nút trên UI) và `is_emergency` (Boolean - cờ chính thức do STAFF/ADMIN/AI duyệt để trigger notification).
## Permissions & State
- ## Permission rules (Public/Transparent Model)
- STUDENT: 
    - Xem tất cả các case (Công khai), **NGOẠI TRỪ các case bị đánh dấu nhạy cảm (`is_sensitive = true`). Case nhạy cảm chỉ người tạo (created_by) và STAFF/ADMIN được xem.**
    - Chỉ được Sửa/Update case do mình tạo (created_by = userId).
    - Không được chỉnh sửa case của người khác.
- STAFF: Xem case assigned_to=mình + case status NEW/TRIAGED. **Được quyền chủ động tự nhận (self-assign) các case đang ở trạng thái NEW/TRIAGED về cho mình xử lý.**
- ADMIN: Xem tất cả. Có toàn quyền điều phối (assign cho người khác).
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
