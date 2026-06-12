# SchooIOS Frontend — ROADMAP (Warm Immersive Archive)

## Hướng: Warm Immersive Archive · plaster/relief · Spiced Wine accent · hairline-first
Lưu khố ấm: bề mặt vôi-giấy, mực Espresso (KHÔNG đen), giọng accent Spiced Wine #743014
(KHÔNG đỏ chói), chrome Cowhide #442D1C (nâu sẫm, KHÔNG xanh thẫm). 3 tier immersion (Spectacle/Rich/Refined),
5 spectacle moment, motion theo 5 verb. Re-charter 2026-06-12 trên branch `feature/immersive`.

## Doctrine (SSOT — đọc TRƯỚC mọi màn)
- `design-vision/DIRECTION-WARM.md` — **law book** (palette · tier · 5 moment · type).
- `web/FRONTEND.md` — **brain FE** (token table KHÓA · UI grammar · immersion tier · motion budget · CONTRACT).
- `docs/motion-architecture.md` — **motion law** (5 verb · duration ladder · reduced-motion · 5 spectacle).
- Execution detail từng phase: `design-vision/PLAYBOOK-WARM.md` (§0 triage · §1 token map · §4 phase F1–F7).
- Tỷ lệ: **~70% giữ** (backend + FE data-layer: lib/api, hooks, store, proxy, validation + motion stage infra) ·
  **~20% reskin** (tokens.css, shaders, grain, primitives) · **~10% new** (Landing relief + operational screens).
- Contract đóng băng (docs/API.md) — FE chỉ hiển-thị-theo-role, server quyết quyền. Mọi màn đọc FRONTEND.md trước.

## Pre-warm baseline (GIỮ — re-skin, KHÔNG rebuild)
Đã dựng ở giai đoạn dark (frozen): Login + Change-password · Create Report (+VOICE burst) ·
Case Detail (Spine) · Dashboard role-aware (admin/staff/student) + 12 primitives + AppShell + motion stage infra.
Engine/logic/data-layer giữ nguyên; những màn này được **re-skin warm** dưới F1–F3 (không làm lại từ đầu).

## Tiến độ (Warm F1–F7 — theo PLAYBOOK-WARM §4)

### Nền — ✅ DONE (frozen `warm-f1` · audit PROCEED)
- [x] **F1 — Nền Warm** — flip toàn bộ foundation: tokens.css (giá trị + rename theo bảng KHÓA FRONTEND.md),
  font (Cormorant display + Newsreader serif), grain plaster ấm, primitives (token-driven → auto-warm), /styleguide.
  **Gate ĐẠT:** `tsc`/`eslint`/`build` 0 · grep 0 token cũ (chỉ comment trong shader F2) · styleguide screenshot warm + AA + Việt OK.
  **Audit 3-pass (PROCEED ~95/100):** 1 fix Minor (Button CTA `text-white`→`text-paper`, commit `7e99e26`). **Tag `warm-f1`** (re-pointed sau audit).
  - [x] **F1a — Doctrine** (docs-only): rewrite FRONTEND.md + roadmap warm, KHÓA bảng token-naming. **`warm-f1a`** (`9cfe0cb`).
  - [x] **F1b** — token flip `tokens.css` + Fraunces→Cormorant + grain + sync 6 motion file + login. **`warm-f1b`** (`3013e5a`).
  - [x] **F1c** — /styleguide warm + verify; primitives 0-edit (token-driven). **`warm-f1`** (`1d428be`).
  - **Residual → F2** (đều trong Threshold tree, NGOÀI scope F1): high-tier WebGL GLSL `VOID/GLOW` còn tối · canvas `"Fraunces"`→Georgia fallback · subtitle copy `"Đài Lặng"`.

### Core — **CURRENT**
- [ ] **F2 — Threshold** — Landing relief (chuẩn Immersive Garden) + scroll→login + reskin login/change-pw
  (gồm vá Residual F1: re-shade GLSL warm · canvas font→display · bỏ copy "Đài Lặng"). Mockup: `design-vision/{landing-warm,login-warm-a}.html`.
  **Gate:** screenshot 3-tier · audit → score ≥9/10 vs IG · `auth.spec` ✓. **Tag `warm-f2`.**
  **Gate:** screenshot 3-tier · audit → score ≥9/10 vs IG · `auth.spec` ✓. **Tag `warm-f2`.**
- [ ] **F3 — Core surfaces** — AppShell warm + reskin dashboards (admin PulseField · student · staff) +
  case-detail Spine + report ReleaseBurst.
  **Gate:** e2e dashboard/case-detail ✓ · audit score mỗi surface · backend `test-p3..p9` GIỮ xanh. **Tag `warm-f3`.**

### Vận hành
- [ ] **F4 — Operational (build new warm-native)** — notifications · audit · emergency-lane · queue (signal gutter) ·
  search + backend search/attachment route (search pg_trgm · attachment Supabase signed-upload).
  **Gate:** mỗi route verify trong `docs/API.md` TRƯỚC · smoke e2e · `tsc`/`lint`/`build` ✓. **Tag `warm-f4`.**

### Hoàn thiện
- [ ] **F5 — States · Motion** — states đồng nhất (empty/loading/error/permission) + 5 spectacle moment verified
  (high/mid/reduced) + motion polish.
  **Gate:** reduced-motion screenshot · 5/5 moment đạt 3-tier · `tsc`/`lint`/`build` ✓. **Tag `warm-f5`.**
- [ ] **F6 — Hardening** — perms audit (no leak) · responsive 390/768/1280 · a11y (AA + focus + roving tab) ·
  edge (409/429/503).
  **Gate:** e2e permission/redteam ✓ · a11y audit ✓ · screenshot responsive. **Tag `warm-f6`.**
- [ ] **F7 — Freeze + Verify** — baseline visual-regression snapshot · full gate · merge→main · live smoke.
  **Gate:** baseline committed · mọi gate ✓ · merged + deployed · smoke live. **Tag `immersive-warm-complete`.**
