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
- [x] P4: Cases API — POST create + GET list + GET detail. Quyền theo role (Public/Transparent: HS thấy công khai + case của mình; STAFF thấy assigned + NEW/TRIAGED; ADMIN/AUDITOR thấy tất; AUDITOR không tạo). caseCode DB tự sinh; Emergency Hybrid (chỉ `studentFlaggedEmergency`, `isEmergency` luôn false → P7); sensitivity escalate-only từ category; detail `findFirst`+roleWhere → 404 chống enumeration; comment `isInternal` ẩn với HS; `attachments` ẩn `filePath` (Signed URL→P6); audit CREATE qua `recordAudit`; `requireUser` (re-check isActive). Helper `caseWhereForRole`. Test: `scripts/test-p4.sh` (35/35). Hoãn: update/assign→P5.
- [x] P5: Assignment + Workflow — PATCH `assign` + PATCH `status`. State machine 7 trạng thái (`web/src/lib/workflow.ts`: `ALLOWED_TRANSITIONS`/`canTransition`/`statusSideEffects`); ASSIGNED CHỈ sinh qua `assign`; STAFF self-assign NEW/TRIAGED, ADMIN điều phối; reassign GIỮ status (không lùi). Nguyên tử trong 1 `$transaction` (update + statusHistory + auditLog + notification); chống race bằng **optimistic-lock theo `updatedAt`** (version) → 409. Mã lỗi 401/400/403/404/409 + **503**(P2028/P2024→Retry-After, `lib/http-errors.ts`)/500. Audit kèm `clientMeta`; no-op reassign short-circuit; re-read sau commit. Test: `scripts/test-p5.sh` (62/62 — gồm cross-endpoint, interleaving TẤT ĐỊNH qua hook `lib/test-hooks.ts` gated `P5_TEST_HOOKS`, lockcheck, mutation-proven). Hoãn: cột `version` Int (cần migration), CF-6 re-validate authz trong tx, retention audit/history→P9.
- [x] P6: Comments + Notifications — POST/GET comment cho 1 case + GET notifications của tôi (phân trang, `unreadOnly`) + PATCH `read-all`. **Quyền XEM case = quyền BÌNH LUẬN** (qua `caseWhereForRole`, không thấy→404 đồng nhất chống dò); comment NỘI BỘ (`isInternal`) chỉ STAFF/ADMIN tạo, khi notify **LOẠI recipient role=STUDENT** (chống rò rỉ); notify = createdBy+assignedTo trừ commenter (dedupe). Comment+audit(CREATE/"Comment")+notify nguyên tử 1 `$transaction` (`lib/notifications.ts::createNotification(input, tx)`). GET notifications đọc **snapshot nhất quán** bằng `$transaction([...], {isolationLevel: RepeatableRead})` (read-only → không 40001); `read-all` KHÔNG audit (chủ ý). Hardening: `classifyMutationError`→503+Retry-After cho mọi route chạm DB; POST comment trả kèm `author` (parity GET). Test: `scripts/test-p6.sh` (34/34). Hoãn: phân trang comment (thread hiển thị toàn bộ — đúng UX), i18n message→sau.
- [x] P7: Emergency lane + Dashboard aggregate — PATCH `cases/[id]/emergency` (flip `isEmergency` chính thức, KHÁC `studentFlaggedEmergency`; KHÔNG đụng status) + GET `cases/emergency` (lane) + GET `dashboard`. KHÔNG schema migration (`AuditAction.EMERGENCY_FLAG` + `NotificationType.EMERGENCY_CONFIRMED` có sẵn). **Flip nguyên tử** 1 `$transaction` + optimistic-lock `updatedAt`→409; no-op (giá trị không đổi) KHÔNG audit/notify; **chỉ false→true mới notify** (mọi ADMIN active + assignee TRỪ actor); de-escalate chỉ audit. **Lane** bỏ scope STAFF cho case CÔNG KHAI (mọi STAFF/ADMIN/AUDITOR thấy hết) NHƯNG case NHẠY CẢM chỉ ADMIN/AUDITOR + assignee (`OR:[{isSensitive:false},{assignedToId:me}]`); `?activeOnly=true` loại RESOLVED/CLOSED. **Dashboard** count/groupBy THUẦN CODE trong 1 `$transaction` RepeatableRead (Σ byStatus==total sanity); **'stale' thay 'overdue'** (mở ∧ createdAt<now-7d, dueAt deferred); byCategory/byLocation enrich tên (FK Restrict→name không null); avgResolutionHours bỏ. Mã lỗi 401/400/403/404/409/503/500. Hardening sau adversarial-review (workflow 24-agent): vá no-op TOCTOU (re-fetch `findFirst`+`caseWhereForRole`→404), thêm `maybeTestDelay`→test 409 TẤT ĐỊNH. Test: `scripts/test-p7.sh` (66/66 — gồm 401×3, bất biến status/studentFlagged, audit-metadata, ADMIN-actor loại + admin2 nhận, soft-deleted loại, sensitivity gate, optimistic-lock 409). Hoãn: 503-test (mapping dùng chung đã proven P5/P6), lane pagination (emergency hiếm + indexed)→sau.

### Hardening & Deploy
- [ ] P8: CI/CD GitHub Actions + deploy Vercel staging/prod
- [ ] P9: Permission audit + error states + load test
