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

### Core — **CURRENT**
- [ ] F2: Login/Change-pw · Create Report (+VOICE burst) · Case Detail (Spine) · Dashboard role-aware

### Vận hành
- [ ] F3: Queue (signal gutter) · Emergency Lane · Audit · Notifications · Search(filter) · +backend search/attachment route

### Hoàn thiện
- [ ] F4: States (empty/loading/error/permission) + 5 spectacle moment
- [ ] F5: Hardening (permission-matrix · responsive · a11y · edge 409/429/503)
- [ ] F6: Freeze + visual-regression baseline
