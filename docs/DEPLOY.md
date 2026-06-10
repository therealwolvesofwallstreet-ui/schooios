# SchooIOS — Deploy Runbook (P8)

> Tài liệu vận hành. **KHÔNG chứa secret thật** — secret chỉ sống ở Vercel UI + `web/.env.local`
> (gitignored). CI (`.github/workflows/ci.yml`) và Vercel build chỉ **generate + build**.

## Nguyên tắc bất biến

> **Production migration is a MANUAL, OUT-OF-BAND step — KHÔNG bao giờ chạy trong CI hay Vercel build.**

- CI và Vercel (Preview **lẫn** Production) chỉ chạy `prisma generate && next build`.
- KHÔNG có `prisma migrate deploy` trong bất kỳ build command nào (CI, `web/vercel.json`, Vercel UI).
- Lý do: migrate trong build = mọi lần deploy đụng schema prod, không review được, dễ hỏng dữ liệu sống.

## Migration prod — quy trình thủ công

- **Ai:** người vận hành (Backend Lead).
- **Ở đâu:** máy local đã có `DIRECT_URL` của **môi trường đích** trong `web/.env.local` (KHÔNG commit).
- **Lệnh:**
  ```bash
  cd web && npx prisma migrate deploy
  ```
  (dùng `DIRECT_URL` — session pooler cổng **5432**, non-pooled cho DDL/advisory locks.)
- **Khi nào:** SAU khi review file migration mới trong `web/prisma/migrations/`, **TRƯỚC** khi
  promote build dùng schema mới lên prod.

## Môi trường (staging / production)

Mỗi môi trường là **một Supabase project tách biệt**. Khớp ghi chú ROADMAP P1 ("tách staging/prod").

| Env        | DATABASE_URL (pooled, runtime)   | DIRECT_URL (5432, migrate)       | Set ở đâu                  |
|------------|----------------------------------|----------------------------------|----------------------------|
| dev        | Supabase **dev** project         | Supabase **dev** project         | `web/.env.local` (local)   |
| staging    | Supabase **staging** project     | Supabase **staging** project     | Vercel — Preview env       |
| production | Supabase **production** project  | Supabase **production** project  | Vercel — Production env     |

### ⚠ GUARD — chống migrate nhầm DB
Trước mỗi `prisma migrate deploy`, **xác nhận `DIRECT_URL` trỏ ĐÚNG môi trường đích**:
```bash
cd web && node -e "const u=new URL(process.env.DIRECT_URL); console.log('migrate target host =', u.host)"
```
Đối chiếu host in ra với môi trường bạn ĐỊNH migrate (staging vs production). Sai host → DỪNG.

## Vercel

- **Root Directory = `web`** (project nằm trong monorepo subfolder).
- **Build Command** = `prisma generate && next build` (đã đặt ở `web/vercel.json`; KHÔNG migrate).
- **Install Command** = `npm ci` (lockfile-exact, khớp CI để reproducible).
- **Env vars** (set ở Vercel UI cho Preview & Production, KHÔNG commit): `DATABASE_URL`,
  `DIRECT_URL`, `JWT_SECRET` (≥32 ký tự), `SUPABASE_*`.

## Giới hạn của P8 (đọc kỹ)

CI + `scripts/test-p8.sh` chỉ chứng minh: **code build được** (offline, ENV giả) + **không lộ
secret** trong repo. Chúng **CHƯA** chứng minh một lần deploy Vercel thật thành công — việc đó cần
một deploy thật + kiểm tra trên UI. Smoke test runtime (health endpoint, env validation lúc khởi
động, deploy verification trên Preview) thuộc phase **post-launch** — **P9 KHÔNG bao gồm** các mục
này (P9 = permission audit + error states + rate-limit login; health/smoke đã chốt deferred).
