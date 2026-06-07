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
- [ ] P2: Prisma schema migrate + seed data

### Core API
- [ ] P3: Auth API — login, logout, /me endpoint
- [ ] P4: Cases API — create, list, get by ID
- [ ] P5: Assignment + Workflow — state machine, assign
- [ ] P6: Comments + Notifications
- [ ] P7: Emergency lane + Dashboard aggregate

### Hardening & Deploy
- [ ] P8: CI/CD GitHub Actions + deploy Vercel staging/prod
- [ ] P9: Permission audit + error states + load test
