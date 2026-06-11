# SchooIOS Frontend — ROADMAP

## Hướng: Editorial Operations · đỏ tín hiệu · hairline-first

## 3 Quyết định đã khóa (F0)
- ① **Font = Newsreader** (free · tiếng Việt đầy đủ · không license) + IBM Plex Sans (UI) + IBM Plex Mono (data). Alt eyeball ở F1: Spectral.
- ② **Search (U1) + Attachment (U2)**: thêm backend route ở **F3** (search pg_trgm · attachment Supabase signed-upload) — KHÔNG block MVP, KHÔNG tự chế FE trước.
- ③ **Phạm vi**: vào F0 → F1 scaffold thật ngay (session execute).

## Experience Principles (North Star cho F2–F6)
`web/FRONTEND.md` là **kim chỉ nam chính tắc** (palette-theo-vai-trò · 3 giọng chữ · motion · UI Grammar · 5 motif).
Tinh thần: typography + khoảng trống gánh cái đẹp · MÀU gánh nghĩa (signal đỏ HIẾM) · motion gánh sự sống ·
hairline-first · permission = KHÔNG render · contract đóng băng. Mọi màn F2+ phải đọc FRONTEND.md trước.

## Tiến độ
### Nền
- [x] F0: Map & Decisions (FRONTEND.md, roadmap, 3 quyết định)
- [x] F1: Foundation — tokens.css (@theme, SSOT màu/typeface/radius/ease) · fonts (IBM Plex Sans/Mono + Newsreader,
  subset 'vietnamese', bỏ Geist) · grain giấy 3% · providers (React Query retry-Retry-After + Zustand Toast, ở (app)) ·
  hooks (useSession 1-nguồn dedupe · usePermissionView + lib/permission-view.ts data-table · useOptimisticMutation 409/400/429/503) ·
  12 primitives token-only (Button/Input/StatusPill+status-theme/Pill/Card/Hairline/Skeleton/EmptyState/Modal/Toast/SignalDot) ·
  AppShell role-aware (Sidebar navy + TopBar) + route groups (app)/(public) · /styleguide · Playwright (desktop 1280 + mobile 390,
  reduced-motion, _fixtures auth-qua-API, foundation.spec screenshot, _probes a11y/permission/responsive · test:e2e + test:e2e:full).
  **Verify**: tsc+lint+build=0 · foundation 10/10 stable ×2 (0 diff) · probes 28/28 · axe 0 serious · smoke green-by-skip ·
  grep hex/--font-geist=0. **A11y fix**: ink-3 #9A9384→#706A5C + button text white (WCAG AA 4.5:1).
  **FREEZE**: tokens + primitive contracts + status-theme/permission-table = HARD; AppShell *layout* = PROVISIONAL (chỉ
  role-nav contract + route-group khoá). Branch rollback `f1-foundation`.

### Core
- [x] F2: Login/Change-pw · Create Report (+VOICE burst) · Case Detail (Spine) · Dashboard role-aware
  - [x] F2-1: Login + Change-password — split biên tập qua `components/auth/AuthSurface` (dùng chung 2 trang) ·
    1 nút đỏ "Bước vào" DUY NHẤT · lỗi = dòng mono ink-dim (KHÔNG đỏ) · auth cookie httpOnly (KHÔNG đọc JWT) ·
    login 200 → redirect (mustChangePassword → `/change-password`, còn lại `landingForRole` → `/`; "theo role"
    sẵn khung, /dashboard ở F2-4) · 401/403-inactive/429(+Retry-After) dịu · Zod mirror inline (newPassword≥6,
    KHÔNG kéo `@/generated/prisma` vào bundle public) · hooks state-thuần (nhóm (public) không mount
    QueryClientProvider) · responsive 390/1280. KHÔNG schema/DB. **Verify**: tsc=0 · build=0 (login/change-password
    prerendered ○) · e2e `auth.spec` 2 pass (render + Zod client + no-crash) / 3 skip (login-flow cần E2E creds —
    môi trường hiện tại không có; không fake PASS). **Audit đối kháng đa-agent (4 lens × skeptic-verify,
    28 agent): 82/100, 0 critical/auth-bypass/PII-leak** — vá hardening (commit hardening): hydration-gate
    (chặn rò credential qua native-GET trước hydrate) · 429 tự mở lại theo Retry-After (hết deadlock) ·
    re-entrancy guard (chặn double-submit) · clear-error-on-edit · aria-describedby/aria-invalid.
    **FROZEN — tag `f2-1-stable`; branch rollback `f2-1-login`.** Hoãn (sang phase sau): proxy↔landingForRole
    chia helper role→path trước F2-4; change-password landing theo role (cần /me) ở F2-4; fixture
    `E2E_FIRSTLOGIN_*` chạy luồng ép-đổi-MK trước F6; (tuỳ chọn) ESLint guard cấm toast/RQ trong (public).
  - [x] F2-2: Create Report (+VOICE burst) — flow MỘT-CÂU-MỘT-MÀN + RELEASE BURST (stage moment #3).
    **F2-2A** (motion SSOT freeze `docs/motion-architecture.md` + burst shell reduced-tier). **F2-2B**
    (form core 4-step, contract `sensitive`/`emergency`, AUDITOR=không-render, 400→field, 201→burst;
    re-audit a11y 28-agent). **F2-2C** (burst 3-tier sau shell: High=R3F GPU point-particles curl-noise
    scatter→converge→caseCode, GSAP CustomEase-token, glow soft-sprite KHÔNG Bloom, `frameloop=demand`,
    dispose; Mid=Canvas 2D rAF; Reduced giữ nguyên. three LAZY-ONLY — `/report/new` ops bundle KHÔNG
    chứa three/shader, §6/§8; tier-detect + ErrorBoundary high→mid; DOM confirmation luôn render +
    focus/`aria-describedby`→caseCode §7; dev preview `/styleguide/burst`). +deps three/@react-three/fiber
    (bỏ postprocessing). **Audit đối kháng 22-agent (6 dim × 2 skeptic): 8 finding → 5 vá** (idle GPU loop→
    demand-loop · 1260ms>trần→1.18s · SR câm caseCode→describedby · styleguide hydration→dynamic ssr:false ·
    resize restart→chốt dims 1 lần), **2 hoãn cosmetic** (fallback desync · slow-net chunk order; §7 nghĩa nguyên).
    **Verify**: tsc 0 · eslint --max-warnings 0 · next build 0 · three-lazy proven. KHÔNG schema/DB.
    **F2-2D (Hardening & Closure)** — re-audit tư duy-ngược (contract>correctness>a11y>perf>polish) → khóa
    findings đường-ghi-dữ-liệu: **(#1)** POST create KHÔNG idempotent bị `mutations.retry` auto-retry trên
    503 (commit-ambiguity qua pooler) → case TRÙNG âm thầm; vá: `useCreateCase` `retry:false` (PATCH giữ
    retry vì optimistic-lock tự an toàn). **(#3)** `parse400` chỉ map 3/4 field → 400 `locationId` (location
    deactivate) rơi câu chung mơ hồ; vá: phủ `locationId`→bước 2 + hiển thị lỗi + recovery (chọn lại/bỏ chọn)
    + fallback message server verbatim. **(#4 resolved, KHÔNG bug)** `sensitive` FE gửi là gợi-ý; server
    escalate-only từ category là chân lý → không thể hạ phân loại (privacy-safe) — thêm comment, KHÔNG đổi
    hành vi. **(SSOT)** gộp control-point ease về 1 nguồn `lib/cubic-bezier` (Framer tuple + GSAP CustomEase +
    mid-tier import chung, hết 3-nơi-lệch); §2 đánh dấu postprocessing GỠ; §3 nói THẬT: fallback chỉ phủ lỗi
    NÉM (chunk/throw), hỏng-WebGL-im-lặng → DOM-only. **Verify**: tsc 0 · eslint 0 · build 0 · three+gsap
    lazy-only · static-assert `retry:false` create + reads/PATCH giữ retry. **RESIDUAL (ngoài FE/F2.2):**
    (a) khử-trùng tuyệt đối khi user TỰ retry sau 503 cần **idempotency key phía server** (backend, không
    đổi được ở FE — hợp đồng đóng băng); (b) listener `webglcontextlost`→Canvas cho hỏng-WebGL-im-lặng.
    **⇒ F2.2 ĐÓNG BĂNG.** UNCERTAIN còn lại: GLSL high-tier chưa kiểm trên GPU thật (hỏng → degrade DOM, nghĩa nguyên).
  - [x] F2-3: Case Detail (Spine) — server-shell→client-View · Spine stagger+reduced-motion · states ĐIỀM TĨNH
    (DetailSkeleton/NotFoundState/ErrorState — F2-4 trích ra `components/app/states.tsx` để dùng chung, hành vi
    bất biến). Commit `6603712`; freeze-tag `f2-3-stable` chờ adversarial audit (quy ước build→audit→freeze+tag).
  - [x] F2-4: Dashboard role-aware (**BASELINE**) — server-shell `(app)/page.tsx`→`HomeView` branch theo role
    (§1.6 fetch-boundary): **AdminHome** (ADMIN/AUDITOR; FILE DUY NHẤT import `useDashboardMetrics` ⇒ STAFF/STUDENT
    **0 call /dashboard** về mặt CẤU TRÚC) · **StaffHome** 2 bucket chia client-side trên union /cases (Vụ của tôi =
    assignedTo=me / Đang chờ nhận = NEW·TRIAGED unassigned) · **StudentHome** "Hoạt động gần đây" (preview client-lọc
    createdById=me — KHÔNG nới list). Số MONO đài-kỷ-niệm + ledger hairline (đọc ĐÚNG `_count` byStatus/byPriority vs
    `count` byCategory/byLocation) + rail loại/nơi — KHÔNG donut/chart-junk; signal đỏ CHỈ cho khẩn. `PulseField` =
    placeholder seam (PulseFieldProps + semantics ĐÓNG BĂNG, dynamic ssr:false) — **bản sống → F4**. Cache chéo-role
    đóng cứng: list queryKey scope theo `user.id` + `queryClient.clear()` lúc logout. ADMIN/AUDITOR vẫn landing `/`
    (dashboard render TẠI home; `landingForRole` giữ nguyên). Ghi `web/FRONTEND.md` §Dashboard metric grammar.
    **RESIDUAL CHẶN tính đúng:** backend **`GET /api/cases?mine`** (server-side ownership filter) CHƯA có → "của tôi"
    chỉ là preview gần-đây, KHÔNG đầy đủ (case cũ ngoài limit không hiện); có route này mới làm "của tôi" ĐÚNG.

### Vận hành — **CURRENT**
- [ ] F3: Queue (signal gutter) · Emergency Lane · Audit · Notifications · Search(filter) · +backend search/attachment route

### Hoàn thiện
- [ ] F4: States (empty/loading/error/permission) + 5 spectacle moment
- [ ] F5: Hardening (permission-matrix · responsive · a11y · edge 409/429/503)
- [ ] F6: Freeze + visual-regression baseline
