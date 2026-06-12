# SchooIOS — Frontend / UI Context (Brain)

> Claude đọc file này TRƯỚC mọi task FE. Sự thật contract ở docs/API.md (đóng băng).
> Hướng thẩm mỹ: **"Warm Immersive Archive / Lưu khố ấm"**.
> SSOT thẩm mỹ (palette/tier/5-moment): `design-vision/DIRECTION-WARM.md` · Execution: `design-vision/PLAYBOOK-WARM.md` · Motion: `docs/motion-architecture.md`.

## North Star
SchooIOS KHÔNG phải dashboard — nó là **LƯU KHỐ ẤM** (warm plaster/relief archive) của tiếng nói
một ngôi trường: bề mặt vôi ấm, ánh sáng dịu, phù điêu hữu cơ; vận hành bằng sự chính xác của một
thiết chế biên tập.
Điểm tựa: TYPOGRAPHY + KHOẢNG TRỐNG gánh cái đẹp · MÀU gánh ý nghĩa · MOTION gánh sự sống.
Trục: VOICE (học sinh) → SIGNAL (nhân sự) → ARCHIVE (ban giám hiệu).
Accent "giọng" DUY NHẤT = **Spiced Wine #743014** (rust-red ấm — KHÔNG phải đỏ tươi/đỏ chói).
Chrome/quyền lực = **Cowhide Cocoa #442D1C** (nâu sẫm — KHÔNG xanh thẫm, KHÔNG đen tuyền).
Sang = tiết chế + chất chữ + hairline + chất liệu vôi-giấy. KHÔNG từ trang trí.

## Context Scope (token discipline — BẮT BUỘC)
KHÔNG quét/đọc toàn repo. Backend ĐÃ XONG — chỉ chạm qua HỢP ĐỒNG (docs/API.md), không qua code.
LÀM TRONG: web/src/app/(app|public)/ · web/src/components/ · web/src/hooks/ · web/src/styles/ · web/FRONTEND.md · docs/frontend-roadmap.md
ĐỌC khi cần (shared): docs/API.md (contract SSOT) · docs/DATA_MODEL.md (enum) · web/src/lib/{api,api-types,case-display}.ts · web/src/proxy.ts · web/AGENTS.md · web/prisma/schema.prisma (enum)
ĐỌC khi cần (thẩm mỹ): design-vision/DIRECTION-WARM.md (law) · design-vision/PLAYBOOK-WARM.md (plan F1–F7) · docs/motion-architecture.md (motion law)
CHẶN CỨNG (.claude/settings.local.json → deny Read, KHÔNG đọc được): web/src/app/api/** · web/prisma/migrations/** · web/prisma/seed*.ts · scripts/**
Logic backend = đọc docs/API.md, KHÔNG đọc route handler. (node_modules/.next/generated đã bị .gitignore loại khỏi Grep.)

## Stack FE (đã chốt)
Next 16 App Router (proxy.ts) · React 19 · TS strict · Tailwind v4 (@theme tokens)
TanStack Query (server-state) · Zustand (UI-state) · React Hook Form + Zod (mirror server)
Phosphor icons (Thin/Light 1.5px) · Framer Motion (DOM) + GSAP/R3F (5 spectacle, lazy)
Fonts: Cormorant Garamond (display/hero ngắn) · Newsreader (`--font-serif` · free · Việt-đủ — VN dài) · IBM Plex Sans (UI) · IBM Plex Mono (data)
  ⚠ LANDMINE: Cormorant KHÔNG đủ dấu tiếng Việt → CHỈ dùng cho hero/wordmark/số ngắn; mọi văn bản Việt dài → Newsreader.
Verify: Playwright (permission-matrix + visual + responsive + a11y)
KHÔNG shadcn để mặc định — rebuild primitives.

## Tokens (xem web/src/styles/tokens.css là nguồn) — BẢNG KHÓA (SSOT cho F1b thực thi)
> Giá trị/tên dưới đây là **bản chốt warm**. F1b flip `tokens.css` đúng theo bảng này. SSOT palette: DIRECTION-WARM.md §Palette · PLAYBOOK-WARM §1.

**Đổi GIÁ TRỊ (giữ tên):**
- `--color-paper #F5F1EA` (Linen — nền chính) · `--color-paper-raised #FBF8F1` (card nổi) · `--color-sunken #EAE3D5` (well/giếng — Khaki)
- `--color-ink #4A342A` (Espresso — text chính, KHÔNG đen) · `--color-ink-2 #7D5A44` (Cocoa — phụ) · `--color-ink-3 #6E5038` (caption, AA-safe)
- `--color-line #E2D9C8` (hairline) · `--color-line-2 #CDBFA6`
- `--color-signal #743014` = **ACCENT DUY NHẤT** (Spiced Wine — voice/now/action, HIẾM) · `--color-signal-hot #9E3A1A` (signal trên depth)
- `--color-gold #C99A4A` (đã-ghi-nhận/RESOLVED/CLOSED, fill `#E8D1A7`) · `--color-emergency #8A2B14` (oxblood — CHỈ emergency takeover)
- `--color-authority #442D1C` (Cowhide — chrome/sidebar/archive surface)

**THÊM mới:** `--color-mute #B2967D` (Camel — trang trí/ornament, **KHÔNG** dùng cho body; AA-unsafe)

**ĐỔI TÊN (rename — F1b grep-replace mechanical):**
- `--color-void/-raised/-sunken` → `--color-depth #442D1C / #553A26 / #36210F` (Cowhide — KHÔNG đen)
- `--color-on-void/-2/-3` → `--color-on-depth #F5F1EA / #E8D1A7 / #B2967D`
- `--color-line-void/-2` → `--color-line-depth rgba(245,241,234,.13) / rgba(245,241,234,.24)`
- `--color-cobalt/-lift` → `--color-link #84592B / --color-link-lift #A87A3E` (Toasted Caramel — KHÔNG xanh)
- `--color-violet` → `--color-rare #9D9167` (Olive Harvest — milestone hiếm)
- `--depth-scrim-void` → `--depth-scrim-depth`

**Font tokens:** `--font-display` → Cormorant Garamond · giữ `--font-serif` (Newsreader) · `--font-sans` (IBM Plex Sans) · `--font-mono` (IBM Plex Mono).

radius ≤8px · ease-quiet cubic-bezier(.22,.61,.36,1) · ease-emerge cubic-bezier(.16,1,.3,1)
Motion SSOT (luật chuyển động — stack/GSAP/R3F/Canvas/reduced-motion/budget/5 spectacle): `docs/motion-architecture.md`

## Immersion Tier (3 cấp — SSOT: DIRECTION-WARM.md)
Mỗi màn thuộc 1 tier; tier quyết định "ngân sách" hiệu ứng được phép.
- **Spectacle** — WebGL stage (R3F, lazy ssr:false): Landing relief · Login Threshold · admin PulseField · ReleaseBurst · Emergency takeover. Cinematic motion CHỈ ở đây.
- **Rich** — DOM + GSAP/Framer + material: dashboards · case-detail Spine · reports · search. Stagger/reveal, KHÔNG cinematic.
- **Refined** — nhanh/tĩnh: queue · audit · notifications · staff dashboard. Micro/standard motion, ưu tiên tốc độ.

## 5 Spectacle Moments (CHỈ 5 — thêm cái thứ 6 ⇒ sửa motion-architecture.md TRƯỚC)
1. **Landing** — phù điêu vôi ấm kiểu Immersive Garden (warm plaster bas-relief, ánh sáng dịu, organic).
2. **Login (Threshold)** — ink-field + wordmark hai-giọng (Schoo·serif + IOS·sans), bước qua ngưỡng.
3. **PulseField** — admin dashboard first-paint stagger + light-sweep ("mạch hệ thống").
4. **ReleaseBurst** — HS gửi report (VOICE): hạt hội tụ → nối đúng người → mono Case ID (connect → resolve).
5. **Emergency** — tempo-shift takeover, ám sắc oxblood-wine.

Supporting grammar (giữ — bổ trợ, KHÔNG phải spectacle): THE SPINE (timeline dọc hairline) · MONO IDs (caseCode/timestamp như serial) · SERIF MOMENTS (Newsreader chỉ ở khoảnh khắc con người: empty/milestone/lời HS/case-title).

## Motion Budget (SSOT: docs/motion-architecture.md)
- **5 verb (ngữ pháp đầy đủ):** Appear · Expand · Connect · Flow · Resolve. KHÔNG chuyển động nếu không thuộc 1 verb.
- **Duration ladder (ms):** micro 120 (hover/focus/toggle) · standard 200 (interaction) · page 280 (chuyển trang/panel) · reveal 320 (emerge/stagger) · **cinematic 600–1200 (CHỈ stage moment)**.
- **Ease:** CHỈ `--ease-quiet` (interactive) + `--ease-emerge` (reveal). KHÔNG spring/bounce/elastic/back.
- **Cinema cap:** cinematic CẤM trên ops surface · WebGL lazy code-split.
- **Reduced-motion = bắt buộc:** CSS collapse ~0ms dưới `prefers-reduced-motion: reduce`; **JS motion (Framer/GSAP) PHẢI tự gác** qua `useReducedMotion()`/`gsap.matchMedia()` (CSS không bắt được JS); `null` (pre-hydration) = coi như reduced; mỗi stage moment có fallback tĩnh đọc được.

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
1. THE SIGNAL — một dấu accent (Spiced Wine) duy nhất = voice/now/action. Hiếm.
2. THE SPINE — timeline dọc hairline (hồ sơ sống).
3. MONO IDs — caseCode/timestamp như serial number tổ chức chuẩn cao.
4. RELEASE BURST — khi HS gửi report (VOICE): hạt accent hội tụ → nối đúng người → mono Case ID.
5. SERIF MOMENTS — Serif (Newsreader) chỉ ở khoảnh khắc con người (empty/milestone/lời HS/case-title).

## Dashboard metric grammar (F2-4 — kế thừa cho "dashboard sống" F4)
- **Số = đài-kỷ-niệm:** chỉ số tổng là số MONO LỚN (`font-mono tabular-nums`, ~text-4xl/5xl) + nhãn mono nhỏ
  uppercase. KHÔNG donut/bar/line/pie — KHÔNG chart-junk. Quan hệ (theo trạng thái/ưu tiên/loại/nơi) =
  **ledger hairline** (hàng + dot vai-trò + số mono phải), KHÔNG đồ thị.
- **Signal HIẾM:** accent (`signal`/`emergency`) CHỈ cho dữ liệu KHẨN đang mở (emergencyOpen>0, CRITICAL). Số
  bình thường = ink. Lỗi tải = ĐIỀM TĨNH (ink-dim, KHÔNG accent) — accent không bao giờ nghĩa "lỗi".
- **First-paint stagger:** node danh sách/mini-spine vào theo `delay = Math.min(index*0.04, 0.4)`, ease-emerge;
  GATE `useReducedMotion() ?? true` → reduced thì render TĨNH (no anim). Số/ledger không cần animate.
- **Đọc đúng KEY DRIFT (đóng băng):** dashboard `byStatus`/`byPriority` = `_count`; `byCategory`/`byLocation` = `count`.
  Đọc phòng thủ `?? []`/`?? 0` → thiếu mảng/field ra EmptyState ô đó, KHÔNG sập trang.
- **Quyền = KHÔNG render:** AUDITOR (read-only) KHÔNG có affordance hành động (không nút mutation). `/dashboard`
  CHỈ ADMIN/AUDITOR — STAFF/STUDENT dựng home từ `/cases`, 0 call `/dashboard` (cấu trúc: hook dashboard chỉ
  sống trong nhánh AdminHome).
- **PulseField = seam:** "mạch hệ thống" có `PulseFieldProps` + ngữ nghĩa ĐÓNG BĂNG; placeholder tĩnh (lưới
  hairline + SignalDot ngủ), parent định kích thước, dynamic ssr:false. F4 thay RUỘT, GIỮ props + luật.

## CONTRACT — MUST NOT (docs/API.md đóng băng)
- KHÔNG đổi tên field/enum/mã lỗi. KHÔNG enforce authz ở FE (server quyết; FE chỉ hiển thị theo role).
- KHÔNG tự sinh id/caseCode. Create dùng `sensitive`/`emergency` (KHÔNG isSensitive/isEmergency).
- KHÔNG isConfidential. KHÔNG gửi enum tiếng Việt. KHÔNG PATCH /status sang ASSIGNED (chỉ /assign).
- KHÔNG đọc/giải mã JWT, KHÔNG Authorization:Bearer. Tin /me mỗi phiên.
- KHÔNG tự sort/paginate (server-driven). 404 ≠ "bị cấm". Retry 409 phải reload case trước.
- KHÔNG invent endpoint. Search = filter /api/cases ở MVP; global text-search (U1) + attachment-upload (U2)
  sẽ BỔ SUNG backend route ở F4 (search pg_trgm · attachment Supabase signed-upload) — tới F4 mới gọi, KHÔNG tự chế FE trước.

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
