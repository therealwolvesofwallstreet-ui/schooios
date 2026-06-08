# SchooIOS Backend — ROADMAP

## Mục tiêu
MVP 7 ngày: auth, cases, workflow, emergency, dashboard, deploy.
Một case đi trọn vòng đời không đứt mạch.

## Workflow
1. Đọc task file trong docs/tasks/
2. Implement từng step, test bằng curl
3. Sau mỗi step pass: commit "feat: [mô tả ngắn]"
4. Cập nhật checkbox ở đây

## Tiến độ

### Nền móng
- [ ] P0: Git branch feature/backend tạo và push
- [ ] P1: Supabase — tạo staging + prod project, lấy credentials
- [x] P2: Prisma schema + nền móng dữ liệu THẬT (13 models: +Building/Location/Class/Enrollment; hardening: caseCode, query-path indexes, immutable triggers, pg_trgm; bootstrap THẬT Lý Tự Trọng — 12 buildings/96 locations/11 cat/3 admin/36 classes/979 students; case thật từ app, seed-dev tách riêng). Xem docs/DATA_MODEL.md + docs/CAMPUS.md

### Core API
- [ ] P3: Auth API — login (HS bằng SBD, STAFF/ADMIN bằng email), logout, /me. **Bắt buộc đổi mật khẩu lần đầu** (cờ `mustChangePassword`, default true cho tài khoản seed): mật khẩu seed chỉ là tạm, admin/HS tự đặt sau lần đăng nhập đầu.
- [ ] P4: Cases API — create, list, get by ID
- [ ] P5: Assignment + Workflow — state machine, assign
- [ ] P6: Comments + Notifications
- [ ] P7: Emergency lane + Dashboard aggregate (Kích hoạt luồng notify Admin khi is_emergency = true)

### Hardening & Deploy
- [ ] P8: CI/CD GitHub Actions + deploy Vercel staging/prod
- [ ] P9: Permission audit + error states + load test
