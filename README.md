# SchooIOS

Hệ thống quản lý sự vụ học đường: tiếp nhận, phân loại, điều phối và theo dõi các báo cáo/sự cố trong trường học. Tầm nhìn liên trường; giai đoạn hiện tại tập trung triển khai cụ thể cho **một trường** (Trường THPT Chuyên Lý Tự Trọng, Cần Thơ).

## Tech stack
- **Next.js 16** (App Router, TypeScript strict) · **React 19**
- **Prisma 7** + driver adapter (`@prisma/adapter-pg`) · **Supabase PostgreSQL**
- Auth: JWT (`jose`) · Storage: Supabase Storage · Deploy: Vercel

## Cấu trúc repo (monorepo)
```
web/                  # Ứng dụng Next.js
  prisma/             # schema.prisma, migrations/, seed.ts (bootstrap thật), seed-dev.ts (data giả)
  src/lib/prisma.ts   # PrismaClient singleton (adapter + omit passwordHash)
  src/app/            # App Router
docs/                 # DATA_MODEL.md (source of truth), CAMPUS.md, SCHEMA_SUGGESTIONS.md, ROADMAP.md
  data/               # campus.json, classes.json (commit) · students.json (PII, gitignored)
scripts/test-all.sh   # Verification tổng: build + tsc + prisma validate
```

## Bắt đầu (backend)
1. **Cài đặt:** `cd web && npm install`
2. **Biến môi trường:** copy `web/.env.example` → `web/.env.local`, điền chuỗi kết nối Supabase (xem hướng dẫn pooler trong file) + `JWT_SECRET` + `SEED_ADMIN_PASSWORD`.
3. **Migrate:** `cd web && npx prisma migrate dev` (dùng `DIRECT_URL` — session pooler).
4. **Seed dữ liệu thật:** `npx prisma db seed` → nạp khung trường (categories, buildings, locations, classes, admins, students).
5. **(Tuỳ chọn) Data giả test API:** `npx tsx prisma/seed-dev.ts` — CHỈ chạy ở môi trường dev.

## Mô hình dữ liệu (tóm tắt)
13 models — chi tiết & chính sách trong [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md):
- **Người dùng & lớp:** `User` (STUDENT login bằng `sbd`, STAFF/ADMIN bằng `email`), `Class`, `Enrollment`
- **Sự vụ:** `Case` (caseCode tự sinh, soft delete, emergency Hybrid, isSensitive), `Comment`, `Attachment`, `Notification`, `CaseStatusHistory`
- **Khuôn viên:** `Building`, `Location` (địa điểm report có cấu trúc)
- **Hạ tầng:** `AuditLog` (immutable), `RefreshToken`

**Nguyên tắc dữ liệu:** dữ liệu khung trường là THẬT (nạp từ `docs/data/`); **sự vụ thật sinh ra từ app khi sử dụng**, không seed. Dữ liệu cá nhân học sinh (`students.json`) **không commit** (PII).

## Verify
```
bash scripts/test-all.sh      # build + tsc --noEmit + prisma validate
```

## Tiến độ
Xem [`docs/ROADMAP.md`](docs/ROADMAP.md). Hiện tại: **P2 (schema + nền móng dữ liệu) hoàn tất**; tiếp theo P3 (Auth API).
