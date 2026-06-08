# SchooIOS Backend — ROADMAP

## Mục tiêu
MVP 7 ngày: auth, cases, workflow, emergency, dashboard, deploy.
Một case đi trọn vòng đời không đứt mạch.

## Workflow
1. Đọc `docs/DATA_MODEL.md` (SSOT) + mục phase trong ROADMAP; spec chi tiết đi theo prompt/PR từng phase (KHÔNG dùng docs/tasks/).
2. Implement từng step, verify bằng `bash scripts/test-all.sh <phase>` (build → tsc → prisma validate → test-<phase>.sh).
3. Sau mỗi step pass: commit "feat: [mô tả ngắn]"
4. Cập nhật checkbox ở đây

## Tiến độ

### Nền móng
- [x] P0: Git branch feature/backend tạo và push
- [ ] P1: Supabase — ✅ dev project + credentials (.env.local) + migrate sạch (pooler aws-1). ⏳ Tách staging/prod để dành P8.
- [x] P2: Prisma schema + nền móng dữ liệu THẬT (13 models: +Building/Location/Class/Enrollment; hardening: caseCode, query-path indexes, immutable triggers, pg_trgm; bootstrap THẬT Lý Tự Trọng — 12 buildings/96 locations/11 cat/3 admin/36 classes/979 students; case thật từ app, seed-dev tách riêng). Xem docs/DATA_MODEL.md + docs/CAMPUS.md

### Core API
- [x] P3: Auth API — login (HS bằng SBD, STAFF/ADMIN bằng email), logout, /me, change-password. **Bắt buộc đổi mật khẩu lần đầu** (cờ `mustChangePassword`, default true cho tài khoản seed). JWT (jose) trong 1 httpOnly cookie; proxy.ts gác /api + ép đổi MK. Hardening: pin alg HS256, timing-safe login, chặn đặt lại MK cũ, primitive `requireUser`. Test: `scripts/test-p3.sh` (20/20). Hoãn: rate-limit→P9, RefreshToken→P5.
- [ ] P4: Cases API — create, list, get by ID
- [ ] P5: Assignment + Workflow — state machine, assign
- [ ] P6: Comments + Notifications
- [ ] P7: Emergency lane + Dashboard aggregate (Kích hoạt luồng notify Admin khi isEmergency = true)

### Hardening & Deploy
- [ ] P8: CI/CD GitHub Actions + deploy Vercel staging/prod
- [ ] P9: Permission audit + error states + load test
