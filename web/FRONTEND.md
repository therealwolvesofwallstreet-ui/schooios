# SchooIOS — Frontend / UI Context (Brain)

> Claude đọc file này TRƯỚC mọi task FE. Sự thật contract ở docs/API.md (đóng băng).
> Hướng thẩm mỹ: "Editorial Operations / Lưu khố của những tiếng nói".

## North Star
SchooIOS KHÔNG phải dashboard — nó là LƯU KHỐ SỐNG của tiếng nói một ngôi trường,
vận hành bằng sự chính xác của một thiết chế biên tập.
Điểm tựa: TYPOGRAPHY + KHOẢNG TRỐNG gánh cái đẹp · MÀU gánh ý nghĩa · MOTION gánh sự sống.
Trục: VOICE (học sinh) → SIGNAL (nhân sự) → ARCHIVE (ban giám hiệu).
Sang = tiết chế + chất chữ + hairline. KHÔNG từ trang trí.

## Context Scope (token discipline — BẮT BUỘC)
KHÔNG quét/đọc toàn repo. Backend ĐÃ XONG — chỉ chạm qua HỢP ĐỒNG (docs/API.md), không qua code.
LÀM TRONG: web/src/app/(app|public)/ · web/src/components/ · web/src/hooks/ · web/src/styles/ · web/FRONTEND.md · docs/frontend-roadmap.md
ĐỌC khi cần (shared): docs/API.md (contract SSOT) · docs/DATA_MODEL.md (enum) · web/src/lib/{api,api-types,case-display}.ts · web/src/proxy.ts · web/AGENTS.md · web/prisma/schema.prisma (enum)
CHẶN CỨNG (.claude/settings.local.json → deny Read, KHÔNG đọc được): web/src/app/api/** · web/prisma/migrations/** · web/prisma/seed*.ts · scripts/**
Logic backend = đọc docs/API.md, KHÔNG đọc route handler. (node_modules/.next/generated đã bị .gitignore loại khỏi Grep.)

## Stack FE (đã chốt)
Next 16 App Router (proxy.ts) · React 19 · TS strict · Tailwind v4 (@theme tokens)
TanStack Query (server-state) · Zustand (UI-state) · React Hook Form + Zod (mirror server)
Phosphor icons (Thin/Light 1.5px) · Framer Motion (DOM) + GSAP/R3F (5 spectacle, lazy)
Fonts: Newsreader (serif · free · Vietnamese) · IBM Plex Sans (UI) · IBM Plex Mono (data)
Verify: Playwright (permission-matrix + visual + responsive + a11y)
KHÔNG shadcn để mặc định — rebuild primitives.

## Tokens (xem web/src/styles/tokens.css là nguồn) — vai trò
paper #F6F2EA · paper-raised #FBF8F2 · sunken #EFE9DD
ink #1A1611 · ink-2 #6B6457 · ink-3 #706A5C (darkened cho WCAG AA — xem tokens.css) · line #E4DCCB · line-2 #CFC5B0
signal #D72638 = MÀU BIỂU CẢM DUY NHẤT (voice/now/action) — HIẾM, chịu lực
emergency #9E1B22 = oxblood, CHỈ emergency takeover (khác chất signal)
gold #B8985A = hơi thở "đã ghi nhận/RESOLVED/CLOSED" (cực hiếm)
authority #14202E = nền sâu surface quyền lực (admin/archive)
radius ≤8px · ease-quiet cubic-bezier(.22,.61,.36,1) · ease-emerge cubic-bezier(.16,1,.3,1)

## UI Grammar (mỗi pattern 1 nghĩa, không trùng)
- Status badge: pill viền hairline + label sans + dot. signal=cần-chú-ý · gold=resolved/closed
  · ink=đang-chạy · emergency=khẩn. Label VN từ case-display.ts (1-chiều).
- Priority: trọng lượng border-trái HOẶC tag mono. KHÔNG cầu vồng.
- Signal gutter (queue): cột 4px trái — dot signal=live · gold=touched · trống=ngủ · edge oxblood=khẩn.
- The Spine: timeline dọc 1px, node theo thời gian, append-only "cảm giác khắc". Mono timestamp.
- Internal note: khảm trên sunken + tag mono "NỘI BỘ". STUDENT: node KHÔNG render.
- Empty: serif 1 dòng + khoảng trống + 1 dấu signal. KHÔNG "No data found".
- Skeleton: khối THỞ (opacity pulse). KHÔNG shimmer, KHÔNG spinner.
- Error: ink-dim + dòng mono. 401→redirect · 403→ẩn · 404 đồng nhất · 409→reload · 429/503→Retry-After.
- Permission: action không được phép = KHÔNG render (không hiện-rồi-disable).

## 5 Signature Motifs (giữ + nâng)
1. THE SIGNAL — một dấu đỏ duy nhất = voice/now/action. Hiếm.
2. THE SPINE — timeline dọc hairline (hồ sơ sống).
3. MONO IDs — caseCode/timestamp như serial number tổ chức chuẩn cao.
4. RELEASE BURST — khi HS gửi report (VOICE): dấu đỏ lan → nối đúng người → mono Case ID.
5. SERIF MOMENTS — Serif (Newsreader) chỉ ở khoảnh khắc con người (empty/milestone/lời HS/case-title).

## CONTRACT — MUST NOT (docs/API.md đóng băng)
- KHÔNG đổi tên field/enum/mã lỗi. KHÔNG enforce authz ở FE (server quyết; FE chỉ hiển thị theo role).
- KHÔNG tự sinh id/caseCode. Create dùng `sensitive`/`emergency` (KHÔNG isSensitive/isEmergency).
- KHÔNG isConfidential. KHÔNG gửi enum tiếng Việt. KHÔNG PATCH /status sang ASSIGNED (chỉ /assign).
- KHÔNG đọc/giải mã JWT, KHÔNG Authorization:Bearer. Tin /me mỗi phiên.
- KHÔNG tự sort/paginate (server-driven). 404 ≠ "bị cấm". Retry 409 phải reload case trước.
- KHÔNG invent endpoint. Search = filter /api/cases ở MVP; global text-search (U1) + attachment-upload (U2)
  sẽ BỔ SUNG backend route ở F3 (search pg_trgm · attachment Supabase signed-upload) — tới F3 mới gọi, KHÔNG tự chế FE trước.

## Screen hierarchy
CORE: Case Detail (trung tâm) · Create Report (Raise a Signal) · Dashboard/Home role-aware
CRITICAL: Queue · Emergency Lane · Login/Change-password
SUPPORTING: Audit · Notifications · Comments · Search(filter) · Profile

## Verification (mỗi screen ≥3 vòng)
tsc --noEmit · lint · build · playwright (core/permission/responsive/a11y) · screenshot đối chiếu grammar.
PASS khi FAIL=0 + visual-diff trong ngưỡng + checklist 12 điểm đạt. Mismatch → contract thắng.
Tự kết luận "đủ tốt" — KHÔNG đẩy verify cho người dùng.

@docs/frontend-roadmap.md
@docs/API.md
