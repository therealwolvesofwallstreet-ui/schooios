# SchooIOS — PLAYBOOK v3 "Warm Immersive Archive"  ·  F1–F7

> **Playbook thực thi tổng hợp** cho hướng đã LOCK ở [`DIRECTION-WARM.md`](./DIRECTION-WARM.md) (chốt 2026-06-12).
> SSOT tiến độ FE immersive. **THAY HẲN** (đã xóa cleanup 2026-06-12) playbook dark cũ + plan dark `~/.claude/plans/...warm-journal.md`.
> Doctrine màu/chất liệu = `DIRECTION-WARM.md`. Hợp đồng API (KHÔNG đụng) = `docs/API.md`.
> **Mỗi phase F = 1 context sạch.** `/clear` giữa các phase; commit + tag trước khi clear. Resume = "continue F1" (rồi F2…F7). Mỗi phase tự đủ: đọc playbook này + `DIRECTION-WARM.md` + đường dẫn cụ thể trong phase, KHÔNG quét toàn dự án.

---

## 0. Không làm lại từ đầu — sổ Giữ / Sơn lại / Mới

| | Nội dung | Đụng? |
|---|---|---|
| 🟢 **GIỮ** | Backend P0–P9 (deployed, API đóng băng) · tầng dữ liệu FE: `lib/api.ts`, `api-types`, toàn bộ `hooks/`, `store/toast`, `proxy`, `validation`, `spine`/`workflow`/`case-display` · **logic + a11y** mọi component đã build (UI primitives, AppShell, HomeView role-gating, CaseDetailView states, Spine, ChoiceList, ReleaseBurst) · hạ tầng `components/motion/stage/*` (Stage 3-tier color-agnostic), R3F/three/GSAP · rig verify (e2e + `.verify`) | **0** |
| 🟡 **SƠN LẠI** (chỉ phần nhìn) | `tokens.css` (giá trị màu + 1 font) · shader Threshold/ReleaseBurst (dark→warm) · `globals.css` grain · `/styleguide` · primitives + className "lớp áo" từng màn (markup/logic giữ) · 4 doc design-brain | phần nhìn |
| 🔵 **MỚI** | **Landing** phù điêu IG-grade + cuộn→login (F2) · các màn **operational** (notifications/audit/emergency-lane/queue/search — F4), *vốn vẫn phải xây dù không immersive* | net-new |

Tỷ lệ thô: **~70% giữ · ~20% sơn lại · ~10% mới.** Ứng dụng đứng nguyên; chỉ đổi *ngôn ngữ thị giác* + thêm Landing + dựng các màn ops còn thiếu.

### 0.1 — Ánh xạ playbook CŨ (dark F0–F6) → WARM (F1–F7)

> **KHÔNG quay lại playbook cũ** (đã xóa 2026-06-12). Mọi việc đã gộp vào F1–F7 dưới đây.

| Old (dark) | → WARM | Khác biệt chính |
|---|---|---|
| F0 Map + F1 Nền | **F1 Nền Warm** | thêm rename token + Cormorant + chữ Việt + AA |
| F2 Core (login) | **F2 Threshold** | + Landing MỚI + cuộn→login (bản cũ không có) |
| F2 Core (report/case-detail/dashboard) | **F3 Core surfaces** | re-skin (đã build sẵn), không build mới |
| F3 Operational | **F4 Operational** | dựng warm-native ngay (không build dark rồi sơn lại) |
| F4 States+Motion | **F5 States·Motion** | giữ riêng |
| F5 Hardening | **F6 Hardening** | giữ riêng |
| F6 Freeze | **F7 Freeze + Verify** | + audit→score vs IG trên màn hero |

---

## 1. Token role-mapping (warm) — bảng thực thi cho F1

Nguồn màu chính thức (DIRECTION-WARM §Palette): **Eliza** `Linen #F5F1EA · Khaki #D7C9B8 · Camel #B2967D · Cocoa #7D5A44 · Espresso #4A342A` + **createmor** `Golden Batter #E8D1A7 · Toasted Caramel #84592B · Spiced Wine #743014 · Olive Harvest #9D9167 · Cowhide Cocoa #442D1C`. **KHÔNG đen. KHÔNG đỏ tươi #d72638.**

**Đổi giá trị (giữ tên):**

| Token | Cũ (dark) | → Mới (warm) | Vai trò |
|---|---|---|---|
| `--color-paper` | #f4f0e8 | `#F5F1EA` | nền chính (Linen) |
| `--color-paper-raised` | #fbf8f1 | `#FBF8F1` | card nổi |
| `--color-sunken` | #eae3d5 | `#EAE3D5` | well/lõm (Khaki) |
| `--color-ink` | #17140f | `#4A342A` | text chính (Espresso — KHÔNG near-black) |
| `--color-ink-2` | #574f43 | `#7D5A44` | text phụ (Cocoa) |
| `--color-ink-3` | #6e665a | `#6E5038` | caption **AA-safe** (cocoa sâu) |
| `--color-mute` *(mới)* | — | `#B2967D` | placeholder/trang trí (Camel — **KHÔNG** dùng cho body, fail AA) |
| `--color-line` | #e2d9c8 | `#E2D9C8` | hairline |
| `--color-line-2` | #cdc2ac | `#CDBFA6` | hairline đậm |
| `--color-signal` | #d72638 | `#743014` | **TIẾNG NÓI / CTA duy nhất** (Spiced Wine) |
| `--color-signal-hot` | #f23142 | `#9E3A1A` | signal trên nền depth (sáng hơn) |
| `--color-gold` | #d2a53f | `#C99A4A` (fill `#E8D1A7`) | resolved/acknowledged |
| `--color-emergency` | #9e1b22 | `#8A2B14` | oxblood-wine (khác voice, chỉ emergency) |
| `--color-authority` | #14202e | `#442D1C` | chrome/sidebar (Cowhide — **KHÔNG navy**) |

**Đổi TÊN (rename cơ học toàn repo ở F1 — tên cũ gây hiểu nhầm trong thế giới warm):**

| Tên cũ | → Tên mới | Mới (warm) | Vai trò |
|---|---|---|---|
| `--color-void` / `-raised` / `-sunken` | `--color-depth*` | `#442D1C` / `#553A26` / `#36210F` | depth điện ảnh (Cowhide/Espresso, không đen) |
| `--color-on-void*` | `--color-on-depth*` | `#F5F1EA` / `#E8D1A7` / `#B2967D` | text trên depth |
| `--color-line-void*` | `--color-line-depth*` | `rgba(245,241,234,.13)` / `.24` | hairline trên depth |
| `--color-cobalt*` | `--color-link*` | `#84592B` (lift `#A87A3E`) | system/link/focus (Toasted Caramel — thay xanh) |
| `--color-violet` | `--color-rare` | `#9D9167` | milestone/delight hiếm (Olive Harvest) |

**Font (layout.tsx, next/font):** `--font-display` Fraunces → **Cormorant Garamond** (ital + 400/500/600). Giữ `--font-sans` IBM Plex Sans, `--font-mono` IBM Plex Mono. **Giữ Newsreader** làm `--font-serif` (fallback chữ Việt — xem Landmine VN). Easing/radius/grain: giữ cấu trúc; grain → tông plaster ấm (tint Linen).

---

## 2. Bậc immersion theo bề mặt (DIRECTION-WARM §tiers)

| Bậc | Bề mặt | Phase |
|---|---|---|
| **Spectacle** (WebGL hero) | **Landing relief** · Login Threshold · Admin dashboard PulseField · ReleaseBurst · Emergency takeover | F2, F3, F4 |
| **Rich** (DOM+GSAP/material) | Student dashboard · Case-detail + Spine (cuộn điện ảnh + Lenis) · Report · Search · AppShell | F3, F4 |
| **Refined** (nhanh) | Queue · Audit · Notifications · Staff dashboard | F3, F4 |

5 "spectacle moment" (ngân sách sân khấu — bản dark cũ mới ship 1/5 = Release Burst): **Landing · Login · Admin PulseField · Release Burst · Emergency**. Phủ đủ ở F2–F4, verify budget ở **F5**.

---

## 3. Kiến trúc Landing (CHỐT: một cảnh cuộn trên `/login`)

```
/login  (MỘT route — proxy GIỮ NGUYÊN: khách chưa đăng nhập vẫn → /login)
┌───────────────────────┐  viewport đầu = LANDING (phù điêu plaster warm, IG-minimal nav)
│  LANDING (relief)     │
│         ↓ cuộn         │  Lenis + GSAP ScrollTrigger lái chuyển cảnh (cùng thế giới warm)
├───────────────────────┤
│  LOGIN form           │  cuộn xuống lộ ra — liên tục thị giác với landing
└───────────────────────┘
reduced-motion: nhảy anchor tức thì tới form (không animate)
```
Khách hit root `/` (chưa auth) → proxy đẩy `/login` → thấy Landing trước (đúng "vào link → landing → cuộn → login"). **Không cần sửa proxy.**

---

## 4. Lộ trình F1–F7 (một-cái-nhìn)

| Phase | Tên | Nội dung lõi | Loại | Tier cao nhất | Phụ thuộc | Tag |
|---|---|---|---|---|---|---|
| **F1** | Nền Warm | doctrine + token + font + grain + primitives + styleguide | re-paint | — | — | `warm-f1` |
| **F2** | Threshold | Landing(mới) + cuộn→login + login + change-pw | mới + reskin | Spectacle | F1 | `warm-f2` |
| **F3** | Core surfaces | AppShell + 3 dashboard + case-detail/Spine + report/burst | re-skin | Spectacle (PulseField) | F1 | `warm-f3` |
| **F4** | Operational | notifications + audit + emergency-lane + queue + search | **dựng mới** | Rich | F1, F3 (appshell/nav) | `warm-f4` |
| **F5** | States · Motion | 4 state × màn + ngân sách 5-spectacle + motion polish | cross-cut | — | F2,F3,F4 | `warm-f5` |
| **F6** | Hardening | permission-matrix + responsive + a11y + edge 409/429/503 | cross-cut | — | F5 | `warm-f6` |
| **F7** | Freeze + Verify | visual-regression baseline + full gate + merge→main | freeze | — | F6 | `immersive-warm-complete` |

> Thứ tự nghiêm ngặt **F1 → F2 → … → F7**. F1 chặn tất cả (nền). F3 nên xong AppShell (F3.1) trước khi F4 thêm nav.

---

## 5. F1 — NỀN WARM (Foundation + Doctrine)  ·  tag `warm-f1`

**Mục tiêu:** lật toàn bộ *nền* sang warm (doctrine, token, font, grain, primitive, styleguide) để mọi phase sau "vẽ" trên nền đúng. Đây là phase mọi thứ phụ thuộc.

| Step | Việc | File | Acceptance |
|---|---|---|---|
| **F1.1 Doctrine** | `DIRECTION-WARM.md` = doctrine SSOT (chốt role-mapping §1 vào đó). Brief/playbook/prototype dark **ĐÃ XÓA** (cleanup 2026-06-12). Viết `web/FRONTEND.md` + `docs/frontend-roadmap.md` + motion-budget theo warm + F1–F7. (memory `schooios-ui-design-dna` đã xóa.) | `design-vision/*`, `web/FRONTEND.md`, `docs/frontend-roadmap.md` | 1 doctrine warm duy nhất; không còn brief đá nhau |
| **F1.2 Token re-paint** | `tokens.css`: thay giá trị + **rename cơ học** (§1). `grep` sạch — không sót `void`/`cobalt`/`violet` trong `src/`. | `web/src/styles/tokens.css` + mọi consumer | grep 0 hit; build xanh |
| **F1.3 Fonts** | `layout.tsx`: Fraunces → Cormorant Garamond (ital 400/500/600); giữ Plex Sans/Mono + Newsreader. **Verify chữ Việt** (`Lưu khố · tiếng nói · sự vụ · nặng/ngã`). | `web/src/app/layout.tsx`, `tokens.css` | dấu tiếng Việt render đúng (xem Landmine VN) |
| **F1.4 Grain + globals** | `globals.css`: grain plaster ấm (feTurbulence saturate 0, opacity thấp, tint Linen); body bg Linen; giữ guard `prefers-reduced-motion`. | `web/src/app/globals.css` | nền ấm, grain tinh tế, reduced-motion OK |
| **F1.5 Primitives reskin** | Button (CTA Spiced Wine), Input/Textarea (hairline khaki, focus cocoa), Card, Modal, Toast, SignalDot (tone warm), StatusPill (`status-theme` → tone warm), Hairline, EmptyState, Skeleton. **Giữ forwardRef + a11y**. | `web/src/components/ui/*` | API/contract không đổi, chỉ đổi nhìn |
| **F1.6 Styleguide** | Dựng lại `/styleguide` theo token warm (swatch 12+ role, type ramp có Cormorant, easing, primitive). Bề mặt verify chính của F1. | `web/src/app/(app)/styleguide/page.tsx` | screenshot = warm + AA pass |

**Gate F1:** `npx tsc --noEmit` + `eslint --max-warnings 0` + `next build` xanh · grep 0 `void/cobalt/violet` · `/styleguide` screenshot warm + AA · chữ Việt OK. *(Màn sáng tự ngả warm; Threshold login còn "vỡ tông" tới F2 — chấp nhận, ghi log.)* → commit từng step, tag `warm-f1`, **báo user `/clear`**.

**Context note:** load playbook §0/§1/§5 + `tokens.css` + `layout.tsx` + `globals.css` + `components/ui/`. KHÔNG đụng `hooks/lib/proxy`.

---

## 6. F2 — THRESHOLD (Landing + Cổng vào)  ·  tag `warm-f2`

**Mục tiêu:** dựng "trần nhà" trải nghiệm warm — Landing phù điêu IG-grade + cuộn→login + login/change-pw warm. **Phase đặt chuẩn craft** (ceiling-setter); mọi màn sau không được vượt bar này nhưng phải đồng thế giới.

**Kiến trúc:** một cảnh cuộn trên `/login` (§3). Dựng trên `components/motion/stage/*` (giữ nguyên 3-tier).

| Step | Việc | File | Acceptance |
|---|---|---|---|
| **F2.1 Landing relief (high)** | R3F phù điêu plaster ấm: displacement/heightmap + ánh sáng định hướng + grain → **ridge SẮC như điêu khắc** (KHÔNG "đốm mây" như mockup). | new `components/landing/LandingStage.tsx` (+shaders) dùng `motion/stage/*` | relief đọc ra "điêu khắc", ấm, ≈ bar IG |
| **F2.2 Landing mid/reduced + nav** | mid Canvas2D; reduced static (port SVG từ `design-vision/landing-warm.html`). Nav IG-minimal (logo · Giới thiệu · Cuộn xuống · loader góc). Tagline Cormorant. | `components/landing/*` | 3-tier đủ; nav tối giản |
| **F2.3 Scroll→login** | Lenis + GSAP ScrollTrigger: cuộn → landing lùi/relief dịch, login card trồi lên, liên tục warm. Reduced: anchor tức thì. | `web/src/app/(public)/login/page.tsx` (chứa cả landing + form) | một route, chuyển cảnh mượt, reduced OK |
| **F2.4 Login re-shader** | Threshold dark→**plaster ấm** (`auth/threshold/*`: shaders/word-texture/Stage/Canvas/Static — giữ tier + logic). Beat bản sắc: wordmark hai-giọng Schoo·IOS (Cormorant) + 1 nhấn Spiced Wine trên CTA duy nhất. **GIỮ auth logic** (hydration-gate, 429 recovery, mirror Zod). | `auth/threshold/*`, `login/page.tsx` | login có nét + liên kết landing; `auth.spec` xanh |
| **F2.5 change-password** | Biến thể warm cùng thế giới login (liên tục); giữ logic ép-đổi-lần-đầu. | `(public)/change-password/page.tsx` | đồng bộ warm với login |

**Gate F2:** screenshot **3 tier** qua rig §12 (high = **vài MB** WebGL thật, KHÔNG 58KB) · `auth.spec` xanh · **vòng audit→score vs bar IG/Tyrsa → mục tiêu ≥9/10 (~97%)** · tsc/lint/build. → commit từng step, tag `warm-f2`, **báo user `/clear`**.

**Context note:** load playbook §2/§3/§6 + `DIRECTION-WARM.md` (benchmark IG) + `design-vision/landing-warm.html`/`login-warm-a.html` (điểm xuất phát) + `components/motion/stage/*` + `auth/threshold/*` + `login/page.tsx`. Mở mockup trực tiếp bằng trình duyệt.

---

## 7. F3 — CORE SURFACES (re-skin màn đã build)  ·  tag `warm-f3`

**Mục tiêu:** sơn warm + nâng tier cho mọi màn sau-đăng-nhập đã có. Re-skin "lớp áo" — **giữ toàn bộ logic/permission/states/hook**.

| Step | Việc | File | Tier |
|---|---|---|---|
| **F3.1 AppShell** | Chrome warm: Sidebar/TopBar navy→Cowhide/Espresso; active = Spiced Wine; drawer ease-emerge. **Làm TRƯỚC** (chạm mọi trang app + F4 cần nav). | `components/app-shell/*` (`AppShell`,`Sidebar`,`TopBar`,`nav.ts`) | Rich |
| **F3.2 Admin dashboard** | **Spectacle PulseField** re-shader warm (dùng seam `PulseFieldProps` đông cứng + first-paint assembly); metrics grid + list warm. AUDITOR read-only. Giữ `useDashboardMetrics` (đọc key dashboard đóng băng). | `components/app/home/AdminHome.tsx` | Spectacle |
| **F3.3 Student dashboard** | Kinetic hero Cormorant (Rich); list case của mình warm. Giữ `useCaseList`. | `components/app/home/StudentHome.tsx`, `MiniSpine` | Rich |
| **F3.4 Staff dashboard** | Assigned + queue-preview warm (Refined). | `components/app/home/StaffHome.tsx` | Refined |
| **F3.5 Case-detail + Spine** | Cuộn điện ảnh warm (Lenis); Spine nodes → tông warm (`status-theme`); Header/ActionPanel/Composer warm. Giữ states/permissions/`buildSpine`. | `components/app/case-detail/*` | Rich |
| **F3.6 Report + Burst** | ChoiceList 4-bước warm; ReleaseBurst re-shader high/mid → hạt/relief ấm (giữ DOM caseCode always-render + focus + tiers). | `components/report/*`, `components/motion/ReleaseBurst*` | Rich/Spectacle |

**Gate F3:** audit→score từng bề mặt (dashboard/case-detail/report) · e2e `dashboard` + `case-detail` xanh · tsc/lint/build · backend `test-p3..p9` vẫn xanh (engine không đụng). → commit từng step, tag `warm-f3`, **báo user `/clear`**.

**Context note:** load playbook §2/§7 + `components/app-shell/`, `components/app/home/`, `components/app/case-detail/`, `components/report/`, `components/motion/ReleaseBurst*`. Hook/lib chỉ ĐỌC chữ ký, KHÔNG sửa.

---

## 8. F4 — OPERATIONAL (dựng mới, warm-native)  ·  tag `warm-f4`

**Mục tiêu:** xây các màn vận hành **chưa từng có**, trong ngôn ngữ warm ngay từ đầu (không build dark rồi sơn lại). Dữ liệu đã sẵn ở BE; FE build từ `docs/API.md` (**KHÔNG đọc `web/src/app/api/**`**).

| Step | Route | Quyền | Nguồn API (đóng băng) | Tier |
|---|---|---|---|---|
| **F4.1 Notifications** | `/notifications` | all | P6 GET `/api/notifications` (paginated, `unreadOnly`) + PATCH `read-all`; badge server-truth đã nối | Refined |
| **F4.2 Audit** | `/audit` | ADMIN/AUDITOR | read route audit (M1); filter actor/action; mono IDs | Refined |
| **F4.3 Emergency lane** | `/emergency` | STAFF/ADMIN/AUDITOR | P7 GET `/api/cases/emergency` (`?activeOnly`); gate sensitivity; beat khẩn (Spiced Wine/oxblood) | Refined→Rich |
| **F4.4 Staff queue** | `/queue` | STAFF | cases list NEW/TRIAGED; signal-gutter sort — *verify nếu đã fold trong StaffHome trước khi tách route* | Refined |
| **F4.5 Search** | `/search` | role-scoped | cases filter + pg_trgm; `useDebouncedValue` + URL searchParams (server-driven); ⌘K summon | Rich |
| **F4.6 Nav wiring** | — | — | `app-shell/nav.ts` `NAV_BY_ROLE` thêm mục mỗi role | — |

**Gate F4:** mỗi route verify có ở `docs/API.md` TRƯỚC khi build; thiếu route đọc → bổ sung **backend additive read-only** (không đụng schema). audit→score từng màn · smoke e2e notif/audit · tsc/lint/build. → commit từng step, tag `warm-f4`, **báo user `/clear`**.

**Context note:** load playbook §8 + `docs/API.md` + `components/app-shell/nav.ts` + hook tương ứng (`useNotifications`/`audit`/`useCaseList`). Tạo route mới dưới `app/(app)/`. KHÔNG đọc `app/api/`.

---

## 9. F5 — STATES · MOTION (pass trải nghiệm toàn cục)  ·  tag `warm-f5`

**Mục tiêu:** pass *trải nghiệm* trên TẤT CẢ bề mặt (giờ đã đủ): mọi state warm + ngân sách spectacle đủ & degrade + chuyển động tinh, nhất quán.

| Step | Việc | Acceptance |
|---|---|---|
| **F5.1 States** | 4 state (empty/loading/error/permission) warm trên MỌI surface (`app/states.tsx` SSOT reskin): EmptyState serif; error = mono + "Thử lại" (KHÔNG nút đỏ); 404 không lộ role. | đủ 4 state × mọi màn |
| **F5.2 Spectacle budget** | 5 spectacle moment hiện diện + degrade 3-tier (Landing·Login·PulseField·Burst·Emergency): high=WebGL, mid=Canvas, reduced=DOM. | 5/5 chạy + degrade đúng tier |
| **F5.3 Motion polish** | `prefers-reduced-motion` tôn trọng khắp nơi; chỉ ease-quiet/emerge (KHÔNG spring/bounce); chuyển trang + Spine stagger reveal + hover/focus mượt, đồng nhịp. | reduced sạch; motion nhất quán |

**Gate F5:** screenshot reduced-motion (mọi spectacle → static) · 5/5 moment verify (high/mid/reduced) · tsc/lint/build. → commit từng step, tag `warm-f5`, **báo user `/clear`**.

**Context note:** load playbook §2/§9 + `app/states.tsx` + `components/motion/*` + các surface F2–F4.

---

## 10. F6 — HARDENING (QA toàn cục)  ·  tag `warm-f6`

**Mục tiêu:** siết chất lượng cuối: quyền không rò, responsive, a11y, edge — trước khi đóng băng.

| Step | Việc | Acceptance |
|---|---|---|
| **F6.1 Permission-matrix** | Đi lại 5 actor × surface (STUDENT/STAFF/ADMIN/AUDITOR + chưa-auth): engine enforce, FE **KHÔNG leak** (null nếu bị từ chối, KHÔNG fake-disable; case sensitive ẩn). Bám `docs/API.md`. | ma trận quyền không rò |
| **F6.2 Responsive** | 390/768/1280 mọi surface; mobile drawer; touch target ≥44px. | 3 breakpoint sạch |
| **F6.3 A11y** | focus mgmt, contrast **AA** (Camel chỉ trang trí), roving tabindex (ChoiceList/radiogroup), live region (toast), aria-hidden lớp trang trí. | a11y audit pass |
| **F6.4 Edge states** | 409 (optimistic-lock) / 429 (Retry-After) / 503 (classify) → toast lặng + retry hợp lý; offline/empty. | edge xử đúng |

**Gate F6:** e2e permission/red-team (`case-detail-redteam`) xanh · a11y audit · screenshot responsive · tsc/lint/build. → commit từng step, tag `warm-f6`, **báo user `/clear`**.

**Context note:** load playbook §10 + `docs/API.md` (ma trận quyền) + e2e `*-redteam.spec`. Pass đọc-rộng → giao subagent tóm tắt, KHÔNG dán code.

---

## 11. F7 — FREEZE + VERIFY  ·  tag `immersive-warm-complete`

**Mục tiêu:** đông cứng release-candidate + merge→main.

| Step | Việc | Acceptance |
|---|---|---|
| **F7.1 Visual-regression baseline** | Screenshot mỗi surface × tier (high/mid/reduced) × viewport → baseline set trong `web/.verify/shots/`. | baseline đầy đủ, commit |
| **F7.2 Full gate** | e2e (`auth`/`dashboard`/`case-detail` + smoke notif/audit/emergency) · `tsc --noEmit` · `eslint --max-warnings 0` · `next build` · backend `test-p3..p9` xanh. | tất cả xanh |
| **F7.3 Final audit→score** | Vòng score vs IG/Tyrsa trên màn hero (Landing/Login/PulseField) → xác nhận ≥9/10. | ≥9/10 hero |
| **F7.4 Freeze + deploy** | tag `immersive-warm-complete`; merge `feature/immersive`→`main`; Vercel auto-build. **KHÔNG schema migration** (DB prod đã migrate P8/P9) trừ khi F4 thêm route đọc (additive). Smoke `/api/auth/me` + 1 màn hero live. | merged + deployed + smoke pass |

**Gate F7:** baseline committed · tất cả gate xanh · merged + deployed. Tag `immersive-warm-complete`.

**Context note:** load playbook §11/§12 + `.verify/` + `docs/DEPLOY.md`.

---

## 12. Rig verify (học bằng máu — DIRECTION/memory)

1. **Trước mỗi đợt screenshot:** rebuild → **kill port 3000**: `Get-NetTCPConnection -LocalPort 3000 | %{ Stop-Process -Id $_.OwningProcess -Force }` → khởi **MỘT** server tươi → confirm HTML phục vụ có **marker nội dung MỚI** (ĐỪNG tin `grep|head` — head che exit code của grep).
2. **Screenshot:** `.verify/shoot-threshold.cjs` (chromium + swiftshader). `reducedMotion: no-preference` = tier **high**; `reduce` = tier **reduced**; viewport **390px** = tier **mid**.
3. **Sanity tier:** file high = **vài MB** (WebGL thật); **58KB = vỡ/stale**.
4. **Vòng audit→score:** screenshot → tự audit vs bar Immersive Garden / Tyrsa → chấm /10 → lặp tới **≥9/10 (~97%)**.
5. **E2E creds:** `Test@123456` / `p4-admin@test.local` / `P4-0001` (`web/prisma/cases-fixture.ts`).
6. **Gate mã:** `npx tsc --noEmit` · `eslint --max-warnings 0` · `next build` · playwright (`auth`/`dashboard`/`case-detail`).
7. ⚠ Đừng để `npm run dev` chạy song song lúc build (tranh `.next`).

---

## 13. Landmines

- **Next 16 breaking** — đọc `web/AGENTS.md` + `web/node_modules/next/dist/docs/` TRƯỚC khi viết Next (async `params`, v.v.).
- **Cormorant Garamond ⚠ chữ Việt:** phủ dấu kém. Hero/display ngắn dùng Cormorant; **đoạn serif tiếng Việt dài → Newsreader** (`--font-serif`, có subset `vietnamese`). Verify ở F1.3 với chuỗi `Lưu khố · tiếng nói · sự vụ`.
- **three/R3F:** chỉ `dynamic(..., { ssr:false })` + lazy; KHÔNG SSR canvas.
- **KHÔNG đụng engine** (`hooks/lib/proxy/api`) — color-agnostic, đã đóng băng.
- **`/api/**` DENY-READ** (CLAUDE.md) — FE build từ `docs/API.md`. POST non-idempotent `retry:false`; PATCH optimistic-lock `updatedAt` server-internal (KHÔNG gửi `version`) — đã xử ở engine.
- **AA warm:** Camel `#B2967D` trên Linen **fail** body text → chỉ `--color-mute`. Caption = `--color-ink-3 #6E5038`. Verify ở F1.6 + F6.3.
- **Rename token (F1.2):** sót `--color-void/cobalt/violet` → build vỡ tông; grep sạch trước commit.
- `next start` mồ côi node trên :3000 → nghi thức kill-port §12.1.
- **Token discipline:** mỗi phase = 1 context sạch; rà >3 file → subagent trả tóm tắt; KHÔNG đọc lại file vừa Edit; chỉ `next build` cuối phase.

---

## 14. Trạng thái & resume

- **✅ F1 — Nền Warm** (`warm-f1`): token/font/grain/primitives/styleguide warm.
- **✅ F2 — Threshold** (`warm-f2` @ `20588fa`): Landing 3-tier IG-grade (`warm-f2a1` relief high · `warm-f2a2` mid/reduced+nav) + Login re-shader warm (`warm-f2b`) + **cuộn→login một cảnh trên `/login`** (`warm-f2`, Lenis+GSAP). GATE F2 đạt: 3-tier · auth.spec xanh (4 pass/6 skip) · axe 0 · hero ≈9/10 · tsc/lint/build. Components: `components/landing/*`, `components/auth/threshold/*` (warm), `components/motion/landing/{ScrollController,ThresholdScene}`. Verify rig: `.verify/{shoot-landing,shoot-threshold,a11y-login}.cjs` (gitignored).
  - **Nợ kỹ thuật (mang sang sau):** React #418 hydration trên `/login` full-motion (high/mid) — `Stage` chọn tier SSR(reduced)↔client(high) lệch; PRE-EXISTING (không do F2c). Fix sạch cần gate tier ở tầng `Stage` (useState khóa tier 1 lần → cần remount → re-fire autoFocus form). Xử ở pass `Stage`-level (cân nhắc F3/F5).
- **Điểm xuất phát (lịch sử):** `design-vision/landing-warm.html` · `login-warm-a.html`.
- **Resume:** `/clear` → "**continue F3**" (Core surfaces re-skin: AppShell + 3 dashboard + case-detail/Spine + report/burst) → F4 → F5 → F6 → F7. Mỗi phase = 1 context sạch, commit + tag trước clear.
