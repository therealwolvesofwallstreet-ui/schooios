# SchooIOS — API Contract (Backend ↔ Frontend)

> **Mục đích:** hợp đồng API ổn định để Frontend build mà KHÔNG phải đọc route source, và để bắt
> drift (đổi shape/mã lỗi ⇒ sửa file này TRƯỚC). Nguồn sự thật shape: `web/src/app/api/**` +
> `web/src/lib/cases.ts` (include). Model dữ liệu: `docs/DATA_MODEL.md`. Trạng thái khi viết: P3–P9.

## Tổng quan

- **Base URL:** same-origin (Next.js App Router phục vụ cả FE lẫn API ở cùng host) → **KHÔNG CORS**.
- **Định dạng:** JSON. Request body `Content-Type: application/json`.
- **Auth:** JWT trong **cookie httpOnly** tên `token` (7 ngày; `secure` chỉ ở prod; `sameSite=lax`; `path=/`).
  - FE **không đọc được** JWT (httpOnly) → lấy trạng thái người dùng qua `GET /api/auth/me`.
  - `fetch` cùng-origin tự gửi cookie; nếu gọi chéo origin phải `credentials: "include"`.
- **Gатe:** `proxy.ts` chặn `/api/*` (trừ `login`,`logout`) → **401** nếu thiếu/sai token; **403
  `MUST_CHANGE_PASSWORD`** nếu user phải đổi mật khẩu lần đầu (chỉ cho qua `me`,`change-password`,`logout`).

## Error envelope (đồng nhất mọi route)

```jsonc
{ "error": "string",          // LUÔN có khi lỗi
  "code": "MUST_CHANGE_PASSWORD", // tùy chọn (hiện chỉ proxy dùng)
  "details": [ /* Zod issues */ ] } // chỉ khi 400 do validate
```

| Code | Ý nghĩa | FE nên làm |
|---|---|---|
| 400 | JSON hỏng / Zod fail (kèm `details`) | hiện lỗi field từ `details` |
| 401 | chưa đăng nhập / token sai | redirect `/login` |
| 403 | sai vai trò/scope · hoặc `code=MUST_CHANGE_PASSWORD` | ẩn action · hoặc route tới đổi-MK |
| 404 | không thấy tài nguyên (đồng nhất — KHÔNG phân biệt "không tồn tại" vs "không có quyền") | "không tìm thấy" |
| 405 | sai method | bug FE |
| 409 | optimistic-lock / transition sai (ai đó vừa đổi) | reload + báo "thử lại" |
| 429 | rate-limit login/đổi-MK (kèm header `Retry-After` giây) | chờ `Retry-After` |
| 503 | DB bận/timeout (kèm `Retry-After`) | retry sau |
| 500 | lỗi bất ngờ | "có lỗi xảy ra" |

## Vai trò & tầm nhìn (tóm tắt — chi tiết: CLAUDE.md)

- **STUDENT**: xem case công khai (`isSensitive=false`) + case mình tạo. Tạo case + comment công khai.
- **STAFF**: xem case được giao + status NEW/TRIAGED. Self-assign NEW/TRIAGED. Comment nội bộ. Flip emergency (trong tầm).
- **ADMIN**: toàn quyền. **AUDITOR**: read-only (mọi mutation → 403). Dashboard chỉ ADMIN/AUDITOR.

---

## Contract Freeze Rules

Hợp đồng này **ĐÓNG BĂNG**. Frontend ĐƯỢC PHÉP dựa vào (sẽ KHÔNG đổi nếu không bump version + sửa file
này TRƯỚC): **tên field** trong shape, **giá trị enum** (chuỗi), **ngữ nghĩa mã lỗi**, và **error envelope**.
Đổi bất kỳ thứ nào ở trên = breaking change, phải cập nhật doc này trước rồi báo FE.

### Frontend MUST NOT (giả định BỊ CẤM — nguồn bug integration)

| ❌ KHÔNG được | ✅ Đúng phải là | Vì sao |
|---|---|---|
| Tự sinh / gửi `id` hoặc `caseCode` khi tạo case | Để trống — DB sinh `id`=cuid, `caseCode`=`CASE-YYYY-00001` | `createCaseSchema` KHÔNG nhận 2 field này; gửi lên bị bỏ qua |
| Gửi `isSensitive` / `isEmergency` khi **tạo** case | Gửi `sensitive` / `emergency` (tên request KHÁC response) | request: `sensitive`,`emergency`; response: `isSensitive`,`isEmergency`,`studentFlaggedEmergency` |
| Coi `isEmergency` = "học sinh bấm khẩn cấp" | `studentFlaggedEmergency` = ý định HS; `isEmergency` = cờ CHÍNH THỨC do STAFF/ADMIN duyệt | Emergency Hybrid (2 cờ tách biệt) |
| Dùng field `isConfidential` (KHÔNG tồn tại) | Field thật là `isSensitive` | sai tên → undefined, lọc nhầm |
| Suy ra role/quyền từ email/sbd, hay tự enforce authz làm rào chắn | Đọc `user.role`; mọi check FE chỉ là UX — **server là nguồn quyền duy nhất** | login bằng email/sbd KHÔNG quyết định role |
| Gửi giá trị enum tiếng Việt / tự chế (vd `"Mới"`, `"đang xử lý"`) | Đúng chuỗi enum: status `NEW·TRIAGED·ASSIGNED·IN_PROGRESS·WAITING_FOR_USER·RESOLVED·CLOSED`; priority `LOW·MEDIUM·HIGH·CRITICAL`; role `STUDENT·STAFF·ADMIN·AUDITOR` | sai enum → **400**; nhãn tiếng Việt là việc hiển thị của FE |
| PATCH `/status` sang `ASSIGNED` | `ASSIGNED` CHỈ sinh qua `/assign` | `/status` → ASSIGNED = **400** transition sai |
| Đọc/giải mã JWT, hay gửi `Authorization: Bearer` | Auth bằng **cookie httpOnly**; lấy user qua `GET /api/auth/me` | JWT httpOnly → JS không đọc được; API không đọc header Bearer |
| Cache role / `mustChangePassword` từ login cũ qua các thay đổi trạng thái | Tin `/me` (server re-check `isActive`+role+flag từ DB mỗi request) | vô hiệu hóa / đổi role có hiệu lực ngay ở request kế |
| Coi **404** là "tồn tại nhưng bị cấm" → dò tài nguyên | 404 ĐỒNG NHẤT (không-thấy = không-tồn-tại) | anti-enumeration cố ý |
| Retry **409** mà không reload | Reload case (lấy `updatedAt` mới) rồi mới PATCH lại | optimistic-lock theo `updatedAt` |
| Tự sắp xếp/ghép trang theo `createdAt` phía FE | Tin thứ tự server (sort `(createdAt desc, id desc)`); phân trang là của server | tie `createdAt` → FE tự sort sẽ lệch trang |
| Mong `filePath` của attachment, hay tự build URL file | Chỉ nhận metadata (`fileName,fileSize,mimeType`); truy cập file qua Signed URL (sau) | `filePath` private, KHÔNG bao giờ trả |
| Trông đợi dashboard hợp nhất `_count` vs `count` | Đọc đúng key theo từng mảng (xem mục Dashboard) | bất nhất CÓ CHỦ Ý ở phase này — đã đóng băng |
| Thiết kế FE dựa trên rate-limiter là global/bền | Limiter là **dev-grade per-instance** (login/đổi-MK); chỉ xử lý **429** + `Retry-After` | reset khi cold-start; prod sẽ thay Redis/KV |
| Gửi `limit` > 100 hay `page` < 1 | `limit` 1–100 (mặc định 20), `page` ≥ 1 | ngoài biên → **400** |

> Nguyên tắc gốc: **server là nguồn sự thật cho id, quyền, trạng thái, thứ tự, và tầm nhìn.** FE chỉ
> trình bày; mọi suy luận lặp lại logic server (sinh id, đoán quyền, tự lọc nhạy cảm, tự sort phân trang)
> là điểm rạn integration — nếu cần, hỏi server (`/me`, GET lại), đừng đoán.

---

## Auth — `/api/auth/*`

| Method · Path | Auth | Request body | OK (2xx) | Lỗi |
|---|---|---|---|---|
| POST `/login` | public | `{ identifier, password }` (sbd cho STUDENT, email cho STAFF/ADMIN) | 200 `{ user }` + set cookie | 400 · 401 `Invalid credentials` (đồng nhất) · 403 `Account is inactive` · 429 |
| POST `/logout` | public | – | 200 `{ success: true }` + clear cookie | – |
| GET `/me` | cookie | – | 200 `{ user }` | 401 (+clear cookie) |
| POST `/change-password` | cookie | `{ currentPassword, newPassword (≥6) }` | 200 `{ success: true }` + cookie mới | 400 (sai/zod/trùng MK cũ) · 401 (sai current) · 429 |

## Cases — `/api/cases`

| Method · Path | Auth/Role | Request | OK | Lỗi |
|---|---|---|---|---|
| POST `/api/cases` | mọi role trừ AUDITOR | `{ title(5–200), description(10–5000), categoryId, locationId?, priority?, emergency?, sensitive? }` | 201 `{ case }` | 400 (json/zod/category·location sai) · 401 · 403 (AUDITOR) |
| GET `/api/cases` | mọi role | query `?status&isEmergency(true/false)&mine(true)&page(≥1)&limit(1–100,def20)` — `status` nhận **1 giá trị** (`NEW`) **hoặc danh sách phẩy** (`NEW,TRIAGED`); `mine=true` → CHỈ case do chính user tạo (`createdById`, **AND** tầm-nhìn role → KHÔNG nới quyền); tương thích ngược (thiếu param = như cũ) | 200 `{ cases[], total, page, totalPages }` | 400 (query/status rác) · 401 |
| GET `/api/cases/[id]` | mọi role (lọc theo tầm nhìn) | – | 200 `{ case }` (detail đầy đủ) | 401 · 404 |
| PATCH `/api/cases/[id]/assign` | ADMIN / STAFF(self, NEW·TRIAGED) | `{ assignedToId }` | 200 `{ case }` | 400 · 401 · 403 · 404 · 409 · 503 |
| PATCH `/api/cases/[id]/status` | ADMIN / STAFF(scope) | `{ status, reason? }` | 200 `{ case }` | 400 (transition sai) · 401 · 403 · 404 · 409 · 503 |
| PATCH `/api/cases/[id]/emergency` | ADMIN / STAFF(scope) | `{ isEmergency, reason? }` | 200 `{ case }` | 400 · 401 · 403 · 404 · 409 · 503 |
| GET `/api/cases/emergency` | ADMIN/STAFF/AUDITOR (STUDENT 403) | query `?activeOnly=true` | 200 `{ cases[], total }` | 401 · 403 (STUDENT) · 503 |

- `status` ∈ `NEW→TRIAGED→ASSIGNED→IN_PROGRESS→WAITING_FOR_USER→RESOLVED→CLOSED`. `ASSIGNED` **chỉ** sinh qua `/assign`, không qua `/status`.
- Để chống ghi-đè đồng thời: nếu nhận **409**, reload case rồi thử lại (server dùng optimistic-lock theo `updatedAt`).

## Comments — `/api/cases/[id]/comments`

| Method | Auth | Request | OK | Lỗi |
|---|---|---|---|---|
| POST | mọi role thấy case, trừ AUDITOR; `isInternal=true` chỉ STAFF/ADMIN | `{ body(1–5000), isInternal? }` | 201 `{ comment }` (kèm `author`) | 400 · 401 · 403 (AUDITOR / STUDENT đặt internal) · 404 · 503 |
| GET | mọi role thấy case | – | 200 `{ comments[] }` (STUDENT **không** thấy `isInternal`) | 401 · 404 |

## Attachments — 3-step signed-upload (F6 Đợt 2 — additive, KHÔNG đổi contract cũ)

> **Kiến trúc:** client KHÔNG upload qua Next.js (giới hạn 4.5 MB). Thay vào đó: **sign** (BE cấp signed-upload URL) → **PUT** (client PUT bytes thẳng lên Supabase Storage) → **commit** (BE verify + ghi DB). filePath KHÔNG BAO GIỜ ra FE.

| Method · Path | Auth/Role | Request | OK | Lỗi |
|---|---|---|---|---|
| POST `/api/cases/[id]/attachments/sign` | mọi role **trừ AUDITOR**; phải là creator/assignee/ADMIN | `{ fileName(1–200), mimeType∈[image/jpeg,image/png,image/webp], fileSize(1–8MB) }` | 200 `{ uploadUrl, path }` — `uploadUrl` = Supabase signed PUT URL (PUT bytes thẳng, TTL 10 phút); `path` = storage path gửi lên commit | 400 (zod/mime/size) · 401 · 403 (AUDITOR · không phải creator/assignee/ADMIN) · 404 (case không thấy) · 503 (storage) |
| POST `/api/cases/[id]/attachments/commit` | mọi role **trừ AUDITOR**; phải là creator/assignee/ADMIN | `{ path }` — path nhận từ sign | 201 `{ attachment }` (shape đầy đủ, xem dưới) | 400 (path lệch prefix · object không tồn tại · MIME thực tế sai · kích thước thực tế > MAX) · 401 · 403 · 404 · 503 · 500 |
| GET `/api/attachments/[id]/view` | mọi role **kể cả AUDITOR** (visibility theo tầm nhìn case) | – | 200 `{ url, expiresAt }` — signed download URL (TTL từ env, mặc định 1 giờ); **KHÔNG** phơi `filePath` | 401 · 404 (attachment không thấy / case không có quyền — đồng nhất) · 503 |
| DELETE `/api/cases/[id]/attachments/[attId]` | mọi role **trừ AUDITOR**; chỉ **creator (của case) hoặc ADMIN** | – | 200 `{ deleted: true }` | 401 · 403 · 404 · 503 |

**Attachment shape (commit 201 / case detail `attachments[]`):**
```jsonc
{ "id": "cuid", "fileName": "photo.jpg", "fileSize": 12345, "mimeType": "image/jpeg",
  "createdAt": "ISO", "uploadedBy": { "id": "cuid", "name": "Nguyễn Văn A" } }
// KHÔNG có filePath — private, không bao giờ ra FE
```

**Luồng upload phía FE:**
1. `POST sign` → nhận `{ uploadUrl, path }`
2. `fetch(uploadUrl, { method:"PUT", body: blob, headers:{"Content-Type": mimeType} })` — PUT THẲNG lên Supabase, bypass Next.js
3. `POST commit` với `{ path }` → nhận `{ attachment }` — add vào cache, refresh gallery

**Luồng xem ảnh phía FE:**
- Gọi `GET /api/attachments/[id]/view` → nhận `{ url, expiresAt }` — dùng `url` làm `src` trực tiếp
- Cache `url` trong session Map; re-fetch khi còn < 5 phút là hết hạn

**Bảo mật:**
- MIME check 2 lớp: client pre-check (Zod enum) + server magic-byte sniff (Range GET 12 bytes)
- Path prefix enforced server-side: `attachments/${caseId}/` — commit reject path lệch prefix
- `image/svg+xml` bị chặn (XSS)
- Bucket PRIVATE — 0 public URL; mọi truy cập qua signed URL server-cấp

## Dashboard — `GET /api/dashboard` (ADMIN/AUDITOR; STAFF·STUDENT → 403)

```jsonc
{ "totalCases": n, "newToday": n, "emergencyOpen": n, "unassigned": n, "stale": n,
  "byStatus":   [{ "status": "NEW", "_count": n }, ...],     // ⚠ key `_count`
  "byPriority": [{ "priority": "HIGH", "_count": n }, ...],   // ⚠ key `_count`
  "byCategory": [{ "categoryId": "..", "name": "..", "count": n }, ...],  // ⚠ key `count`
  "byLocation": [{ "locationId": "..", "code": "..", "name": "..", "count": n }, ...],
  "unlocated": n }
```
> ⚠ **Lưu ý drift:** `byStatus`/`byPriority` trả `_count` (raw groupBy) còn `byCategory`/`byLocation` trả `count`. FE đọc đúng key theo từng mảng. Bất biến: Σ`byStatus._count` = Σ`byPriority._count` = `totalCases`; Σ`byLocation.count` + `unlocated` = `totalCases`.

## Notifications — `/api/notifications`

| Method · Path | Request | OK |
|---|---|---|
| GET `/api/notifications` | `?page&limit&unreadOnly(true/false)` | 200 `{ notifications[], unreadCount, total, page, totalPages }` |
| PATCH `/api/notifications/read-all` | – | 200 `{ success: true, updated: n }` |

## Lookups & Audit (M1 — thêm cho FE merge; additive, KHÔNG đổi contract cũ)

| Method · Path | Auth/Role | Request | OK | Lỗi |
|---|---|---|---|---|
| GET `/api/categories` | mọi role đã đăng nhập | – | 200 `{ categories[] }` | 401 · 503 |
| GET `/api/locations` | mọi role đã đăng nhập | – | 200 `{ locations[] }` | 401 · 503 |
| GET `/api/audit` | **CHỈ ADMIN/AUDITOR** (role khác → 403) | `?page&limit(1–100)&entityType?&entityId?` | 200 `{ logs[], total, page, totalPages }` | 400 · 401 · 403 · 503 |
| GET `/api/users` | **CHỈ ADMIN** (role khác → 403) | `?role∈{STAFF,ADMIN}(def STAFF)&page(≥1)&limit(1–100,def50)` | 200 `{ users[], total, page, totalPages }` | 400 (role rác/STUDENT/AUDITOR · limit ngoài biên) · 401 · 403 · 503 |

**Category (lookup item)** — `{ id, name, description|null, defaultPriority|null, defaultSensitive }` (chỉ `isActive=true`, sắp theo `name`). Dùng nạp dropdown form tạo case.
**Location (lookup item)** — `{ id, code, name, floor|null, type, buildingId|null, building{id,code,name}|null }` (chỉ `isActive=true`, sắp theo `code`). Dùng nạp dropdown form tạo case.
**AuditLog (list item)** — `{ id, action, entityType, entityId, metadata, createdAt, actorId|null, actor{id,name,role}|null }` (append-only/immutable; mới nhất trước, tiebreaker `id` cho paging tất định; KHÔNG phơi PII ngoài `{id,name,role}` của actor).
**User (assignable)** — `{ id, name, role }` · 0 PII (KHÔNG email/sbd/dob/passwordHash) · chỉ `isActive=true` · sắp `(name asc, id asc)` tất định · dùng nạp picker giao việc + cân tải ADMIN.

---

## Object shapes (chỉ field FE nhận)

**User** (login `{user}`, me `{user}`) — **KHÔNG có `passwordHash`** (omit toàn cục):
`{ id, email|null, sbd|null, name, role, dob|null, gender|null, admissionYear|null, isActive, mustChangePassword, createdAt, updatedAt }`
> ⚠ Đây là dữ liệu **của chính người gọi** (PII riêng) — hợp lệ. KHÔNG có endpoint trả PII của user khác (mọi quan hệ chỉ phơi `{id,name,role}`).

**Case (list item)** — `{ ...scalars, category{id,name}, locationRef{id,code,name}|null, createdBy{id,name,role}, assignedTo{id,name}|null }`. Scalars: `id, caseCode, title, description, location|null, locationId|null, categoryId, priority, status, isSensitive, isEmergency, studentFlaggedEmergency, createdById, assignedToId|null, resolvedAt|null, closedAt|null, createdAt, updatedAt` (KHÔNG `deletedAt` — case xóa mềm không bao giờ ra ngoài).

**Case (detail, GET [id])** — như trên + `category`(đầy đủ), `attachments[]{id,fileName,fileSize,mimeType,createdAt,uploadedBy{id,name}}` (**KHÔNG `filePath`** — Signed URL qua `GET /api/attachments/[id]/view`), `statusHistory[]{...,changedBy{id,name,role}}`, `comments[]{...,author{id,name,role}}` (STUDENT lọc internal).

**Case (mutation response, assign/status/emergency)** — scalars đầy đủ + `category`, `createdBy{id,name,role}`, `assignedTo{id,name,role}|null` (gọn hơn detail).

**Case (POST create, 201)** — trả CÙNG shape **list item** (đã enrich `category{id,name}`, `locationRef{id,code,name}|null`, `createdBy{id,name,role}`, `assignedTo|null`) → FE không cần refetch để hiển thị ngay.

**Comment** — `{ id, caseId, authorId, body, isInternal, createdAt, author{id,name,role} }`.

**Notification** — `{ id, userId, caseId|null, type, message, isRead, readAt|null, createdAt, case{id,caseCode}|null }`.

---

## Frontend integration notes / landmine (ĐÃ tích hợp M0–M5 — mô tả hành vi HIỆN TẠI)

1. **Proxy gác CẢ `/api/*` LẪN trang** (`web/src/proxy.ts`, dual `config.matcher = ["/api/:path*", "/((?!api/|_next/...|...\\.[^/]+$).*)"]`). API: 401 JSON khi thiếu/sai token, 403 `MUST_CHANGE_PASSWORD` khi cần đổi MK. Trang: chưa-đăng-nhập → redirect `/login`; `mustChangePassword` → redirect `/change-password`; đã-đăng-nhập vào `/login` → `/`. Trang `/login` + `/change-password` **đã tồn tại**; chống redirect-loop bằng special-case 2 path này. FE **KHÔNG** tự dựng client-guard trùng lặp.
2. **Luồng ép-đổi-mật-khẩu:** sau login nếu `user.mustChangePassword=true`, proxy chặn mọi `/api/*` khác (403 `MUST_CHANGE_PASSWORD`) → FE phải route tới trang đổi MK ngay.
3. **Auth state:** cookie httpOnly → FE không đọc JWT. Lấy user qua `GET /api/auth/me` (401 = chưa đăng nhập). Sau `login`/`change-password` cookie tự cập nhật; sau `logout` cookie bị xóa.
4. **Xử lý lỗi đồng nhất:** viết 1 fetch-wrapper map status→hành vi theo bảng Error envelope (đặc biệt 401→login, 403/`MUST_CHANGE_PASSWORD`→đổi-MK, 409→reload+retry, 429/503→backoff theo `Retry-After`).
5. **404 đồng nhất:** không tồn tại và không-có-quyền đều 404 — FE không suy ra sự tồn tại tài nguyên.
6. **Same-origin:** không cần CORS; build & deploy chung (Vercel Root Directory = `web`, xem `docs/DEPLOY.md`).
7. **Dashboard key drift** (`_count` vs `count`) và **rate-limit dev-grade single-instance** — xem ghi chú ⚠ ở trên / `web/src/lib/ratelimit.ts`.
