CÁCH DÙNG bộ này:
KHÔNG paste Phụ lục A/B/C thành từng tin nhắn rời (làm loãng context + phá cache). Chọn 1 trong 2:
(Khuyến nghị) Tạo 3 file rail TRƯỚC, rồi paste 1 prompt: tự tạo .claudeignore (Phụ lục B), block CLAUDE.md (Phụ lục C), docs/MERGE_MAP.md (Phụ lục A) bằng tay (≈2KB, 2 phút, chỉ docs/config). Sau đó paste DUY NHẤT khối "Prompt v2" — M-1 khi đó chỉ verify rails đã đúng. 
(Một-paste) Để agent tự dựng: paste "Prompt v2" + 3 Phụ lục A/B/C TRONG CÙNG 1 message (kéo cả phần phụ lục vào). M-1 sẽ tạo 3 file từ nội dung đó. Đừng tách lẻ từng phụ lục. Mỗi phase sau đó: /clear → đọc CLAUDE.md + MERGE_MAP.md + API.md + file của phase (xem "Giao thức session"). 
PHỤ LỤC A — Seed docs/MERGE_MAP.md (memory-file ~2KB; M-1 tạo; mọi phase đọc thay vì quét)
Nguồn sự thật chi tiết = docs/API.md. File này là bản đồ NHANH cho merge — đọc trước mỗi phase.
"# MERGE MAP — FE(mock) → BE(API thật, đóng băng tại docs/API.md)

## Role (nguồn = GET /api/auth/me; KHÔNG đoán theo email)
FE student/admin → BE 4 role: STUDENT="Học sinh" · STAFF="Cán bộ" · ADMIN="Ban giám hiệu" · AUDITOR="Kiểm toán"(read-only,/audit)

## Field map — Report(FE) → Case(BE, camelCase)
| FE | BE | Ghi chú |
| id "SOS-xxx" (client-gen) | caseCode (DB-gen "CASE-2026-00001") | BỎ client-gen; dùng caseCode từ response |
| category (free-text, 2 option) | categoryId (FK) | dropdown nạp GET /api/categories |
| location (free-text, 2 option) | locationId? (FK) | dropdown nạp GET /api/locations |
| priority Low/Medium/High | priority LOW/MEDIUM/HIGH/CRITICAL | THÊM CRITICAL |
| isConfidential | isSensitive | checkbox "ẩn danh" → sensitive:true + TODO(ẩn-danh-thật) |
| isEmergency (lúc tạo) | emergency:true (=studentFlaggedEmergency) | cờ chính thức isEmergency chỉ qua PATCH /emergency (STAFF/ADMIN) |
| status VN (3) | CaseStatus enum (7) | map HIỂN THỊ qua lib/case-display.ts; PATCH /status dùng ENUM |
| createdAt (local string) | createdAt (ISO, server) | hiển thị format ở FE |

## Status display (enum → nhãn VN + màu) — case-display.ts (1 chiều)
NEW=Chờ tiếp nhận · TRIAGED=Đã phân loại · ASSIGNED=Đã giao · IN_PROGRESS=Đang xử lý ·
WAITING_FOR_USER=Chờ phản hồi · RESOLVED=Đã giải quyết · CLOSED=Đã đóng.

## Store(FE) → API action
useAuthStore: login→POST /api/auth/login {identifier,password} · hydrate→GET /api/auth/me · logout→POST /api/auth/logout
useReportStore: add→POST /api/cases · list→GET /api/cases · detail→GET /api/cases/[id] · status→PATCH /api/cases/[id]/status · assign→PATCH /assign · emergency→PATCH /emergency · comments→GET/POST /api/cases/[id]/comments
useNotificationStore: GET /api/notifications(+?unreadOnly) · PATCH /api/notifications/read-all
useAuditStore: GET /api/audit (ADMIN/AUDITOR; M1 mới)
dashboard: GET /api/dashboard (ADMIN/AUDITOR; keys: totalCases,newToday,emergencyOpen,unassigned,stale,byStatus,byPriority,byCategory,byLocation,unlocated)
dropdowns: GET /api/categories · GET /api/locations (M1 mới)

## Pages (web/src/app) cần sửa
/ (dashboard) · /report · /report/new · /report/[id] · /notifications · /profile · /audit · +/login +/change-password(mới) · components/layout/Navbar

## Landmine (đọc kỹ)
- proxy.ts cũ chỉ 401-JSON cho /api → M2 mở rộng gác trang + nhánh (api→401 JSON; trang→redirect /login).
- mustChangePassword=true → ép /change-password (đừng khóa chính nó + /logout + /api/auth/*).
- Auth state KHÔNG đọc token (httpOnly) → lấy từ GET /api/auth/me.
- 404 ĐỒNG NHẤT (không 403) cho tài nguyên không thấy. Same-origin → no CORS.
- P9 rate-limit login 10/60s theo (ip+identifier) → test sai-pw dùng identifier RIÊNG.
- react-hot-toast THIẾU trong package.json (đã import) → thêm bản React-19.
- CONTRACT FREEZE: đổi shape/enum/mã lỗi API ⇒ bump version + sửa docs/API.md TRƯỚC." 
"PHỤ LỤC B — .claudeignore đúng (M-1 ghi đè file root hiện đang = web/)
# Chặn RÁC sinh-máy/dependency khỏi mọi tool của Claude (KHÔNG chặn web/ — đó là codebase)
web/node_modules/
web/.next/
web/src/generated/
node_modules/
**/*.tsbuildinfo
web/package-lock.json" 
"PHỤ LỤC C — Block thêm vào CLAUDE.md (M-1, sửa 1 lần; sau đó KHÔNG đụng tới hết merge)
## Token discipline (BẮT BUỘC khi merge FE↔BE)
- KHÔNG "đọc/quét toàn dự án". Dùng "Bản đồ tài liệu & mã nguồn" + đường dẫn cụ thể.
- Rà >3 file → giao subagent, yêu cầu trả TÓM TẮT/BẢNG, KHÔNG dán code.
- Đối chiếu FE↔BE → đọc/ghi docs/MERGE_MAP.md (không tái khám phá).
- Mỗi phase = 1 session sạch (/clear); chỉ next build ở cuối phase; KHÔNG đọc lại file vừa Edit.
- CẤM đọc: node_modules/, web/.next/, web/src/generated/." 

NHIỆM VỤ: Tích hợp Frontend (feature/frontend, UI mock) ↔ Backend (feature/backend, API thật tới P9)
thành 1 app Next 16 chạy thật trên web/. Bạn là full-stack lead cực kỳ kỹ tính.

QUY TẮC TỐI CAO — DERIVE-FROM-REPO: mọi field/endpoint/mã lỗi/version ĐỌC TỪ REPO, KHÔNG đoán.
ĐỌC TRƯỚC khi làm: docs/API.md (HỢP ĐỒNG API ĐÓNG BĂNG — SSOT), CLAUDE.md, docs/DATA_MODEL.md,
docs/ROADMAP.md (entry "MERGE Backend↔Frontend" + landmine), web/AGENTS.md, web/src/proxy.ts,
web/src/lib/{auth,cases,validation,audit,notifications,http-errors}.ts.

=== GUARDRAILS — BẤT BIẾN (vi phạm = hỏng) ===
- Backend invariants giữ NGUYÊN: audit mọi mutation; không trả passwordHash; soft-delete; optimistic-lock
  (updatedAt)→409; 404 đồng nhất chống dò; isEmergency chỉ STAFF/ADMIN flip; rate-limit login/change-pw (P9).
- CONTRACT FREEZE: KHÔNG đổi shape/enum/mã lỗi của API đang có. Nếu FE cần field API chưa có →
  đó là thay đổi BACKEND: bump version + sửa docs/API.md TRƯỚC, rồi mới sửa route. 3 endpoint đọc mới
  ở M1 PHẢI được thêm vào docs/API.md.
- Next 16: CHỈ proxy.ts (CẤM tạo middleware.ts). Prisma 7: import @/generated/prisma/client; CI đã
  prisma generate. Field LUÔN camelCase.
- CẤM tái nhiễm model FE cũ: KHÔNG `isConfidential` (đúng `isSensitive`); KHÔNG status tiếng Việt ở
  tầng DỮ LIỆU (chỉ map nhãn VN ở tầng HIỂN THỊ qua case-display.ts); KHÔNG client-gen case id
  (dùng caseCode từ response).
- KHÔNG commit secrets/.env*/node_modules. Kiến trúc fetch: GIỮ client-fetch (Zustand→/api, "use client");
  KHÔNG chuyển trang sang Server Component gọi Prisma trực tiếp (giữ 1 nguồn authz = API).

=== GIAO THỨC TOKEN (BẮT BUỘC — tiết kiệm context cho merge) ===
- Mỗi phase Mx = 1 SESSION SẠCH: bắt đầu bằng /clear → CHỈ đọc CLAUDE.md + docs/API.md + docs/MERGE_MAP.md
  + đúng các file của phase đó. KHÔNG "đọc/quét toàn dự án", KHÔNG explore lại thứ đã có trong MERGE_MAP.
- Rà >3 file (vd đối chiếu store FE ↔ API) → SPAWN subagent (Explore/Task), yêu cầu trả BẢNG/TÓM TẮT,
  CẤM dán nội dung file vào context chính.
- CẤM đọc node_modules/, web/.next/, web/src/generated/ (đã .claudeignore). Ra lệnh theo ĐƯỜNG DẪN cụ thể
  (dùng "Bản đồ mã nguồn" trong CLAUDE.md), không grep mù cả repo.
- KHÔNG đọc lại file vừa Edit/Write (harness đã xác nhận thành công). Việc cơ học (grep/tsc/test/prisma
  generate) để SCRIPT làm; Claude chỉ đọc PASS/FAIL ngắn.
- Dev-loop trong phase: `npx tsc --noEmit` (nhanh); CHỈ `next build` ở CUỐI phase.
- KHÔNG sửa CLAUDE.md / docs/API.md / docs/MERGE_MAP.md GIỮA phase (giữ prefix cache nóng); cập nhật
  memory CHỈ ở ranh giới phase nếu cần.

=== ROLE MAPPING (nguồn = GET /api/auth/me, KHÔNG đoán theo email) ===
STUDENT→"Học sinh" · STAFF→"Cán bộ" · ADMIN→"Ban giám hiệu" · AUDITOR→"Kiểm toán" (read-only + /audit).
UI gate đúng 4 role theo ma trận §VERIFY.

=== QUYẾT ĐỊNH ĐÃ CHỐT (đừng hỏi lại) ===
- "Ẩn danh" (FE) ≠ ẩn danh thật (schema chưa hỗ trợ) → map checkbox → sensitive:true khi tạo case +
  ghi TODO "anonymous reporting = feature tách, cần schema". KHÔNG thêm cột.
- Status: web/src/lib/case-display.ts 1 chiều enum→{nhãn VN, màu}; đổi status gọi PATCH /status với ENUM thật.
- Khẩn cấp: checkbox HS lúc tạo → body emergency:true (=studentFlaggedEmergency). isEmergency chỉ flip qua
  PATCH /api/cases/[id]/emergency (nút chỉ hiện STAFF/ADMIN).

=== CHECKPOINT (đã chốt): DỪNG sau MỖI phase Mx → báo cáo (output test + commit hash) → CHỜ user duyệt
rồi mới sang phase sau. Mỗi phase: (a) tự viết test, (b) tự chạy, (c) đọc output, (d) tự sửa,
(e) LẶP đến PASS=n FAIL=0. KHÔNG đẩy test cho user. Pass → commit "feat(integration): Mx — …".

────────────────────────────────────────────────────────────────────────
M-1 — DỰNG ĐƯỜNG RAY TOKEN (làm 1 LẦN, TRƯỚC M0; chỉ chạm docs/config, KHÔNG code)
- SỬA web/../.claudeignore (root): BỎ dòng `web/` (đang chặn nhầm cả code); thay bằng chặn rác
  (xem Phụ lục B). Đây là bước quan trọng nhất — không có nó thì grep vẫn đụng file rác.
- Thêm block "## Token discipline" vào CLAUDE.md (Phụ lục C) — sửa DUY NHẤT lần này; sau đó KHÔNG đụng
  CLAUDE.md tới hết merge (giữ cache).
- CONTRACT SANITY-CHECK (SSOT integrity — QUAN TRỌNG): trước khi tin docs/API.md, SPAWN 1 subagent đối
  chiếu API.md với CODE THẬT (danh sách route trong web/src/app/api + enum CaseStatus/Role/mã lỗi +
  shape response). Nếu API.md lệch code → **CODE là sự thật cuối cùng**: sửa docs/API.md cho khớp TRƯỚC,
  rồi mới tạo MERGE_MAP từ API.md. (Nếu API.md/MERGE_MAP lệch code, toàn bộ chiến lược token phản tác
  dụng vì agent bám nhầm contract.)
- Tạo docs/MERGE_MAP.md (Phụ lục A) DERIVE từ API.md đã verify: bảng FE→BE field/endpoint/role/status +
  landmine. MỌI phase sau ĐỌC file ~2KB này thay vì quét lại FE+BE.
- Xác nhận .gitignore phủ node_modules + .env* + src/generated (đã đúng — KHÔNG cần sửa). node_modules
  KHÔNG track trên cả 2 nhánh → M0 KHÔNG cần `git rm --cached` (giữ làm safety no-op).
- M-1 PASS: 3 file rail cập nhật + API.md đã verify-khớp-code; KHÔNG chạm code; tsc vẫn như cũ.
  Commit "chore(merge): token-discipline rails". → CHECKPOINT (chờ duyệt).

M0 — Nhánh + TRÍCH UI AN TOÀN (không mất API)
- git checkout feature/backend && git pull (đảm bảo có P9 + docs/API.md) && git checkout -b feature/integration
- git tag pre-integration
- ⚠ TUYỆT ĐỐI KHÔNG `git checkout feature/frontend -- web/src/app` (frontend KHÔNG có app/api →
  sẽ XÓA toàn bộ route API). Checkout CHỌN LỌC, chỉ các path UI:
    git checkout feature/frontend -- \
      web/src/app/page.tsx web/src/app/globals.css \
      web/src/app/report web/src/app/notifications web/src/app/profile web/src/app/audit \
      web/src/components web/src/store
  (KHÔNG checkout: web/src/app/api, web/src/app/layout.tsx, web/src/proxy.ts, web/src/lib, package.json.)
- layout.tsx: MERGE TAY — giữ layout backend (fonts/metadata) + thêm <Toaster/> (react-hot-toast) +
  provider/nav của FE. KHÔNG đè bằng bản frontend (sẽ mất cấu trúc).
- package.json: HỢP NHẤT TAY — deps backend (prisma,@prisma/adapter-pg,pg,jose,bcryptjs,zod) +
  FE (zustand@^5, lucide-react) + THÊM react-hot-toast (bản hỗ trợ React 19). Giữ scripts backend
  (db:seed…) + engines.node. `npm i` để regen package-lock; commit lock.
- .gitignore phủ node_modules + .env*; nếu lỡ track: git rm -r --cached node_modules.
- VERIFY GIT AN TOÀN — chạy SAU MỖI thao tác checkout/merge (không chỉ cuối M0):
    `git diff --stat pre-integration -- web/src/app/api web/src/proxy.ts web/src/lib` PHẢI RỖNG
    (API routes + proxy + lib KHÔNG bị đụng). `git status` xem CHÍNH XÁC file nào đổi — nếu thấy api/
    hoặc proxy.ts trong danh sách thay đổi → ĐÃ ĐÈ NHẦM, `git checkout pre-integration -- <path>` khôi phục.
- M0 PASS: 2 lệnh VERIFY trên sạch; `cd web && npm i` OK; `npx tsc --noEmit` chạy (CHO PHÉP lỗi type tạm
  ở store, sửa ở M2–M4); `git status` KHÔNG có node_modules. → CHECKPOINT.

M1 — API client + types + 3 endpoint đọc còn thiếu (+ cập nhật API.md)
- web/src/lib/api.ts: fetch wrapper (credentials:'include', JSON, ném ApiError{status,body}; 401→redirect
  /login ở client; KHÔNG nuốt lỗi). web/src/lib/api-types.ts: types MIRROR docs/API.md (ưu tiên tái dùng
  z.infer từ lib/validation.ts + Prisma types; KHÔNG bịa field).
- Thêm route (đúng pattern hiện có: requireUser + role gate + uniform {error}):
    GET /api/categories (isActive; mọi role auth) · GET /api/locations (isActive + building; mọi role auth) ·
    GET /api/audit (ADMIN/AUDITOR only→ khác 403; phân trang offset + tiebreaker {id} như /notifications).
- CẬP NHẬT docs/API.md: thêm 3 endpoint (shape response, role, mã lỗi) — giữ contract là SSOT.
- Verify scripts/test-m1.sh: login admin → 3 endpoint=200 + dữ liệu seeded thật (categories≈11,
  locations≈96); STUDENT GET /api/audit=403; tsc sạch. `bash scripts/test-all.sh m1`. test-p3..p9 GIỮ xanh.

M2 — Auth thật + proxy gác trang
- Rewrite web/src/store/useAuthStore.ts: login(identifier,password)→POST /api/auth/login; hydrate từ
  GET /api/auth/me khi mở app; logout→POST /api/auth/logout; state {id,name,role,mustChangePassword};
  KHÔNG lưu token (cookie httpOnly); BỎ persist localStorage cho auth.
- Pages: web/src/app/login/page.tsx (identifier+password) + web/src/app/change-password/page.tsx.
  me.mustChangePassword=true → ép sang /change-password.
- MỞ RỘNG web/src/proxy.ts (KHÔNG tạo middleware.ts): matcher gồm cả trang (loại /_next, static, favicon,
  *.* asset). LOGIC PHÂN NHÁNH + CHỐNG REDIRECT-LOOP (ghi rõ để khỏi đá vòng):
    * PUBLIC_EXCEPTIONS (luôn cho qua, KHÔNG bao giờ redirect): `/login`, `/api/auth/login`,
      `/api/auth/logout`. → chặn loop "/login đá về /login".
    * path /api/* → trả 401 JSON khi thiếu/sai token (cho fetch; KHÔNG redirect API).
    * path TRANG, CHƯA auth (không thuộc PUBLIC_EXCEPTIONS) → redirect('/login').
    * path TRANG, ĐÃ auth + mustChangePassword=true → redirect('/change-password') TRỪ khi pathname đã là
      `/change-password` (cho qua) + `/api/auth/me|change-password|logout` (cho qua) → chặn loop change-pw.
    * path TRANG, ĐÃ auth, KHÔNG mustChange, đang ở `/login` hoặc `/change-password` → redirect('/') (vào app).
  Kiểm thử thủ công 3 ca loop: (chưa auth → /login: dừng), (mustChange → /change-password: dừng),
  (đã auth vào /login: nhảy '/').
- Verify scripts/test-m2.sh: login STUDENT(sbd)/STAFF/ADMIN/AUDITOR đúng pw→200+cookie; sai pw→401;
  /me→đúng role; mustChangePassword=true → GET trang trong bị chuyển hướng. ⚠ dùng identifier RIÊNG khi
  thử sai pw (P9 rate-limit 10/60s theo ip+identifier → tránh khóa nhầm user thật). test-p3 GIỮ xanh.

M3 — Cases/Report nối API thật + đồng bộ model  ⚠ PHASE NẶNG NHẤT — KHÓA SCOPE
- CHỈ làm end-to-end cho CASES/REPORT. TUYỆT ĐỐI KHÔNG đụng dashboard/audit/notifications (để M4).
- Nếu thấy ngập (đổi store + page + contract + toast cùng lúc) → TÁCH: M3a = useReportStore + report/new
  (create) + report/page (list); M3b = report/[id] (detail + comments + nút status/assign/emergency).
  Mỗi nửa 1 commit + checkpoint.
- Rewrite web/src/store/useReportStore.ts: addReport→POST /api/cases {title,description,categoryId,
  locationId?,priority(enum),emergency,sensitive}; list→GET /api/cases; detail→GET /api/cases/[id].
  BỎ id client (dùng caseCode); BỎ localStorage; BỎ status VN ở store.
- report/new: dropdown category/location nạp từ GET /api/categories|locations (KHÔNG hardcode); priority
  thêm CRITICAL; "ẩn danh"→sensitive; "khẩn cấp"→emergency. Upload ảnh: ẩn nút + TODO (Attachment/Signed
  URL hoãn) trừ khi nối kịp.
- report/page + report/[id]: hiển thị caseCode/status qua case-display.ts; detail nối comments
  (GET/POST /comments) + nút đổi status/assign + flip emergency (CHỈ STAFF/ADMIN) gọi PATCH tương ứng;
  STUDENT không thấy nút mutation.
- Verify scripts/test-m3.sh: STUDENT tạo→201+caseCode; list STUDENT chỉ công khai+của mình; STAFF
  NEW→TRIAGED=200, NEW→CLOSED=400; comment nội bộ STUDENT→403; sensitive case của người khác→404.
  test-p4/p5/p6/p7 GIỮ xanh.

M4 — Notifications + Audit + Dashboard nối API
- useNotificationStore→GET /api/notifications (+?unreadOnly) + PATCH /api/notifications/read-all;
  useAuditStore→GET /api/audit; dashboard page (ADMIN/AUDITOR) → GET /api/dashboard dùng ĐÚNG key thật
  (totalCases,newToday,emergencyOpen,unassigned,stale,byStatus,byPriority,byCategory,byLocation,unlocated).
  STUDENT/STAFF KHÔNG gọi /dashboard (403) → ẩn UI.
- Verify scripts/test-m4.sh: comment/đổi status → notifications recipient +1; read-all→unreadCount=0;
  ADMIN /dashboard=200 đủ key; STUDENT /dashboard=403.

M5 — Parity quyền + hardening + đóng vòng e2e (Playwright)
- Gate UI khớp ma trận §VERIFY; thêm loading/empty/error; bắt 401/403/409/429/503 → toast + hành vi đúng
  (401→/login, 409→"thử lại", 429→"quá nhiều yêu cầu"). Xóa SẠCH fallback mock/localStorage; bỏ mọi
  isConfidential/status-VN ở tầng dữ liệu.
- E2E (BEST-EFFORT, đừng để hạ tầng e2e chặn cả integration): +devDep @playwright/test
  (+ `npx playwright install --with-deps chromium`). web/e2e/smoke.spec.ts: critical path headless trên
  `next dev` + p-fixture: (1) login STUDENT → tạo case → thấy caseCode trong /report; (2) login STAFF →
  đổi status case đó NEW→TRIAGED; (3) login ADMIN → /dashboard render số; (4) logout → vào trang trong bị
  đẩy /login. (Playwright tự dựng/dừng server qua webServer config.)
  ⚠ FALLBACK: nếu `playwright install` thất bại trong môi trường (no-network/sandbox) → KHÔNG block; ghi
  e2e thành TODO chạy tay, và GATE CỨNG lùi về (next build + tsc + curl-matrix + grep-guard). Báo cáo rõ
  e2e đã chạy được hay phải hoãn.
- Verify scripts/test-integration.sh (đóng vòng tổng):
  (1) backend test-p3..p9 GIỮ xanh; (2) test-m1..m4; (3) cd web && npx tsc --noEmit; (4) next build PASS;
  (5) npx playwright test (e2e smoke) PASS — NẾU Playwright cài được; nếu hoãn (fallback) → bỏ qua bước này
     và ghi TODO e2e-thủ-công;
  (6) contract-guard grep: KHÔNG còn 'isConfidential' | status-VN literal ('Chờ tiếp nhận'…) | 'SOS-' |
     'localStorage' (trừ chỗ hợp lệ) trong web/src/{store,app,components}.
  Pass cuối (GATE CỨNG): test-integration.sh exit 0 + next build xanh + grep-guard rỗng
     (+ playwright xanh NẾU chạy được; nếu hoãn thì ghi rõ trong báo cáo).

=== VERIFY — MA TRẬN AUTHZ (UI phải khớp; theo docs/API.md & P9) ===
POST /api/cases: STUDENT/STAFF/ADMIN=201, AUDITOR=403, anon=401.
PATCH assign/status/emergency: ADMIN ok; STAFF theo scope/self; STUDENT/AUDITOR=403; anon=401.
GET /dashboard,/audit: ADMIN/AUDITOR=200; STUDENT/STAFF=403. Tài nguyên không-thấy=404 (KHÔNG 403).

=== ĐẦU RA ===
Mỗi phase: commit "feat(integration): Mx — …" + cập nhật ROADMAP. Báo cáo cuối: output từng test-mx.sh
(PASS=n FAIL=0), next build, playwright, ma trận smoke 4 role, danh sách TODO (ẩn danh thật, upload
Attachment nếu hoãn). Test fail → tự đọc log/tự sửa/chạy lại; chỉ báo user ở checkpoint mỗi phase.

════════════════════════════════════════════════════════════════════════
# INTEGRATION-V2 (§I0–§I7) — wire new UI aa1af15 onto backend main (PHƯƠNG ÁN A)
════════════════════════════════════════════════════════════════════════
> Round 2: the M0–M5 above already merged the OLD frontend. This round grafts the NEW UI super-app
> (`origin/feature/frontend@aa1af15`: feed/mailbox/polls/suggestions + dashboard/report/notifications/
> profile/audit) onto the same frozen backend (P0–P9 + M1–M5 infra). Branch `feature/integration-v2`
> (base `origin/main` = da7f2e9). SSOT contract: docs/API.md (FROZEN). Field/store map: §PHỤ LỤC A above.
> Each phase packet = read this §Ix + MERGE_MAP field-map + the phase's files only (no whole-repo scan).

## Phương án A — scope
- WIRE real (6 areas): auth · report/cases · dashboard · audit · notifications · profile.
- KEEP MOCK (4 pages + 3 stores): feed/mailbox/polls/suggestions + useCommunityStore/useSchoolStore/
  useSuggestionStore. Only add `NEXT_PUBLIC_DEMO=1` "DEMO/LOCAL" banner + thin adapter/area.
  ⛔ NEVER wire to real API / NEVER rewrite these in any phase.

## Guardrails (same invariants as M-series, plus)
- NEVER touch backend: web/src/app/api/*, web/src/lib/* (except store/UI glue), web/prisma/*.
  proxy.ts is the SOLE gate — use as-is (edit only with written reason). NO middleware.ts (Next 16).
- CONTRACT FREEZE: no shape/enum/error-code change. New field ⇒ bump version + edit docs/API.md FIRST.
- No re-infection in WIRED stores: isConfidential→isSensitive; SOS- ids→caseCode; no localStorage/persist
  for server data; Vietnamese status only at DISPLAY layer (case-display.ts).
- 1 LAYER / PHASE. Git safety: no force-push/branch-delete/history-rewrite. No node_modules/.env/secrets.

## Per-phase loop
(a) write scripts/test-Ix.sh (style test-p7.sh: KEY=VALUE fixtures, per-role login, expect_status,
DELTA-count, leak-scan passwordHash/PII) → (b) run → (c) read → (d) fix → (e) loop until Ix: PASS=n FAIL=0
(no loosened assertions). Commit "feat(integration-v2): Ix — …" + update ROADMAP, STOP, report (test output
+ commit hash), await user approval.

### §I0 — Safety & base
Backup tags backup/main-da7f2e9, backup/frontend-aa1af15; branch feature/integration-v2 from origin/main;
create this §Ix section. PASS: branch + tags exist, status clean, no node_modules tracked.

### §I1 — Dep discovery + safe graft
Dep grep (prove): git grep -nE "from ['\"](framer-motion|gsap|@gsap/react|@studio-freight/react-lenis|recharts|react-hot-toast)" aa1af15 -- web/src.
Selective checkout from aa1af15: components store app/globals.css app/layout.tsx app/template.tsx
app/page.tsx app/dashboard app/report app/notifications app/profile app/audit app/feed app/mailbox app/polls
app/suggestions. NEVER checkout: app/api app/login app/change-password proxy.ts lib.
GUARD: git diff --stat backup/main-da7f2e9 -- web/src/app/api web/src/proxy.ts web/src/lib
web/src/app/login web/src/app/change-password MUST be empty. package.json = union(main, 6 UI deps incl.
react-hot-toast ^2.5.2); npm i. PASS: GUARD empty; tsc --noEmit runs (store type errors ok until I2–I4).

### §I2 — Re-wire AUTH
useAuthStore → POST /api/auth/login {identifier,password}, GET /api/auth/me, POST /api/auth/logout; store
{id,name,role,mustChangePassword} 4-role; no token stored (httpOnly). Remove auto-role-by-email,
sessionStorage-mock, persist-auth. AuthGuard → thin UX (read /me, loading, nav by 4-role); REMOVE
sessionStorage("schoolos_session_active") + 2-role auto + router.replace gating (proxy is sole gate). Lift
Navbar/WorldWrapper to 4-role. Keep main /login + /change-password; port aa1af15 / login form into /login;
/ becomes authed home. test-I2: 4-role login 200+cookie; wrong pw 401 (separate identifier — P9 10/60s);
/me role; mustChangePassword blocks inner + redirects /change-password no loop. test-p3 green.

### §I3 — Re-wire REPORT/CASES (may split I3a/I3b)
useReportStore → POST/GET /api/cases, GET /api/cases/[id]. Remove SOS-/localStorage/status-VN. Map
isConfidential→isSensitive; status enum↔VN via case-display.ts; category/location from GET
/api/categories|locations; priority +CRITICAL; HS "khẩn cấp"→emergency flag; flip isEmergency STAFF/ADMIN
only via PATCH /api/cases/[id]/emergency; detail comments GET/POST + status/assign by role; STUDENT no
mutation buttons. Image upload hidden + TODO. test-I3: STUDENT create 201+caseCode; list by role; STUDENT
internal comment 403; other's sensitive 404; NEW→CLOSED 400. test-p4/p5/p7 green.

### §I4 — Re-wire DASHBOARD/AUDIT/NOTIFICATIONS/PROFILE
useNotificationStore → GET /api/notifications (+?unreadOnly) + PATCH read-all. useAuditStore → GET
/api/audit. Dashboard (ADMIN/AUDITOR, recharts) exact keys: totalCases,newToday,emergencyOpen,unassigned,
stale,byStatus,byPriority,byCategory,byLocation,unlocated (byStatus/byPriority use _count; byCategory/
byLocation use count). profile → GET /api/auth/me. STUDENT/STAFF hide dashboard (403). test-I4:
comment/status → recipient notif +1; read-all → unread 0; ADMIN dashboard 200 all keys; STUDENT/STAFF 403.
test-p6/p9 green.

### §I5 — Isolate mock areas + narrow contract-guard
Keep mock stores/pages; add NEXT_PUBLIC_DEMO=1 + "DEMO/LOCAL" banner + thin adapter (1 file/area). Narrow
contract-guard in test-integration.sh to WIRED stores only (auth/report/notification/audit); EXEMPT mock
stores+pages via allowlist + reason comment. PASS: narrowed guard PASS; mock pages show banner.

### §I6 — Close INTEGRATION GATE
Fix test-integration.sh only on REAL syntax error (bash -n scripts/*.sh) — no phantom fixes. Anti-flaky:
per-phase fixture namespace (prefix Ix-/p-) + teardown + explicit single shared next dev (probe first). Loop
to INTEGRATION GATE PASS: test-p3..p9 + test-I2..I4 + tsc --noEmit + next build + narrowed guard, exit 0.

### §I7 — Report & PR
4-role smoke matrix (curl) + each test-Ix output + next build. PR feature/integration-v2 → main (replaces
old UI); keep old branches/tags. Update docs/ROADMAP.md + record backend TODOs for the 4 mock areas
(feed/mailbox/polls/suggestions/school).

## Authz matrix (per docs/API.md & P9) — same as §VERIFY above
POST /api/cases: STUDENT/STAFF/ADMIN=201, AUDITOR=403, anon=401. PATCH assign/status/emergency: ADMIN ok;
STAFF per scope/self; STUDENT/AUDITOR=403; anon=401. GET /dashboard,/audit: ADMIN/AUDITOR=200; STUDENT/
STAFF=403. Resource not visible = 404 (not 403).

## Deploy note
No schema change → prod DB already migrated (P8/P9). Deploy = merge to main, Vercel auto-build; NO
migrate deploy needed.
