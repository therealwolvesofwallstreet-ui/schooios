# SchooIOS Frontend — ROADMAP

## Hướng: Editorial Operations · đỏ tín hiệu · hairline-first

## 3 Quyết định đã khóa (F0)
- ① **Font = Newsreader** (free · tiếng Việt đầy đủ · không license) + IBM Plex Sans (UI) + IBM Plex Mono (data). Alt eyeball ở F1: Spectral.
- ② **Search (U1) + Attachment (U2)**: thêm backend route ở **F3** (search pg_trgm · attachment Supabase signed-upload) — KHÔNG block MVP, KHÔNG tự chế FE trước.
- ③ **Phạm vi**: vào F0 → F1 scaffold thật ngay (session execute).

## Tiến độ
### Nền
- [x] F0: Map & Decisions (FRONTEND.md, roadmap, 3 quyết định)
- [ ] F1: Foundation (tokens · fonts · AppShell role-aware · api/RQ · primitives · Playwright)

### Core
- [ ] F2: Login/Change-pw · Create Report (+VOICE burst) · Case Detail (Spine) · Dashboard role-aware

### Vận hành
- [ ] F3: Queue (signal gutter) · Emergency Lane · Audit · Notifications · Search(filter) · +backend search/attachment route

### Hoàn thiện
- [ ] F4: States (empty/loading/error/permission) + 5 spectacle moment
- [ ] F5: Hardening (permission-matrix · responsive · a11y · edge 409/429/503)
- [ ] F6: Freeze + visual-regression baseline
