# SchooIOS — LOCKED DIRECTION v3: "Warm Immersive Archive"

> Chốt 2026-06-12 sau khi user bác (1) Đài Lặng tối giản, (2) immersive TỐI/đen, (3) 3 hướng dark-crisp.
> Đây là định hướng + benchmark THẬT, bám 2 reference user cung cấp. SUPERSEDES the "dark dual-surface"
> direction in tokens.css + ThresholdStage (those are now obsolete on COLOR).

## North star
Một **lưu khố ấm áp** — mood của **Immersive Garden** (bas-relief điêu khắc trồi trên mặt thạch cao,
ánh sáng mềm định hướng, grain, rất aesthetic, tĩnh-mà-sống) — nhưng trong **tông đất ấm cozy** của user.
**KHÔNG đen/tối. KHÔNG đỏ tươi #d72638.** Sang đến từ chất liệu (phù điêu) + serif thanh + khoảng trống + tông ấm.

## Benchmark (user gửi)
- **LANDING** = "y chang Immersive Garden" (immersive-g.com): mặt phẳng thạch cao/clay sáng, các **khối phù
  điêu hữu cơ trồi lên** (sculptural relief, lit mềm), tagline serif căn giữa, nav tối giản (logo trái ·
  "About" phải · "Scroll down" · "See all projects" góc · loader tròn góc phải). Rất aesthetic, airy, premium.
- Hai ảnh palette user gửi (Eliza + Squarespace "createmor") = nguồn màu CHÍNH THỨC.

## Palette (CHÍNH THỨC — bám sát, đặt tên theo vai trò)
**P1 — Eliza (cozy neutrals, nền chính):**
`Linen #F5F1EA` · `Khaki #D7C9B8` · `Camel #B2967D` · `Cocoa #7D5A44` · `Espresso #4A342A`
**P2 — createmor (richer + accent):**
`Golden Batter #E8D1A7` · `Toasted Caramel #84592B` · `Spiced Wine #743014` · `Olive Harvest #9D9167` · `Cowhide Cocoa #442D1C`

**Role mapping (đề xuất, chốt ở plan mới):**
- surface nền = Linen `#F5F1EA` · raised = `#FBF8F1` · sunken/well = Khaki `#EAE3D5`
- ink/text = Espresso `#4A342A` (+ Cocoa `#7D5A44` phụ, Camel `#B2967D` mờ)
- hairline = Khaki/Camel
- **ACCENT "tiếng nói" = Spiced Wine `#743014`** (đỏ-gạch ẤM — THAY cho đỏ tươi #d72638 mà user GHÉT)
- secondary breath = Gold/Golden Batter; nhấn hiếm = Olive Harvest
- depth điện ảnh = Cowhide Cocoa `#442D1C` / Espresso (KHÔNG dùng đen thuần)

## Type
- **Display/hero = Cormorant Garamond** (serif thanh, italic — khớp serif trong ảnh palette + IG). (Fraunces đã thêm cho hướng tối — hướng ấm NGẢ về Cormorant; chốt ở plan mới.)
- UI = IBM Plex Sans (VN đủ) · Data/mono = IBM Plex Mono.
- Wordmark hai-giọng "Schoo"(serif italic) + "IOS"(sans/serif đậm) + dấu Camel/Cocoa.

## Flow (user yêu cầu)
1. **Vào link → LANDING** (IG-relief ấm, aesthetic). 
2. **Scroll xuống một mức vừa phải → chuyển sang LOGIN.** (scroll-driven transition landing→login)
3. **LOGIN phải CÓ NÉT riêng + LIÊN KẾT thị giác với landing** (cùng thế giới phù điêu ấm; KHÔNG được "quá đơn giản" như bản warm-A hiện tại — cần chất liệu/relief + một beat bản sắc).

## Trạng thái hiện tại (mockups)
- `design-vision/landing-warm.html` — đúng HƯỚNG (warm + IG composition) NHƯNG phù điêu còn mềm/mờ như "đốm mây", CHƯA sắc/điêu khắc như IG. Cần: relief rõ ridge (heightmap/displacement + ánh sáng định hướng + grain), aesthetic hơn nhiều.
- `design-vision/login-warm-a.html` — ấm, ổn, nhưng "quá đơn giản" → cần nét + liên kết landing.
- Benchmark để vượt: ảnh IG landing user gửi.

## Reuse được (đừng vứt)
- `web/src/components/motion/stage/*` (Stage/StageBoundary/stage-tier) — color-agnostic, GIỮ.
- R3F/three/GSAP infra + ReleaseBurst template (re-shader sang warm relief).
- TOÀN BỘ tầng chức năng: hooks/lib/proxy/api + logic F2-4 dashboard + F2-3 case-detail. KHÔNG đụng.
- Cormorant warm mockups = điểm xuất phát.

## Bỏ / làm lại
- tokens.css "dark dual-surface" (Void/on-void/cobalt) → thay bằng palette ấm trên.
- ThresholdStage shader TỐI → thay bằng warm plaster bas-relief (sáng).
- Đỏ tươi `#d72638` → Spiced Wine `#743014`.
