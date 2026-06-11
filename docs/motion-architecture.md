# SchooIOS — Motion Architecture (SSOT, đóng băng)

> Luật chuyển động cho FE. Đọc file này TRƯỚC khi viết bất kỳ animation/transition/scene nào.
> Nguồn thẩm mỹ: `web/FRONTEND.md` + `design-vision/{CREATIVE-DIRECTION,BUILD-PLAN}.md`.
> Nguồn token: `web/src/styles/tokens.css` (ease/màu) · `web/src/app/globals.css` (reduced-motion).
> Đây là **luật để quyết định nhanh**, không phải tản văn. Mỗi dòng có một lực ràng buộc.

## Tag — lực của mỗi điều
- **`[LAW]`** — bất biến. Vi phạm = sai. Không tự ý phá.
- **`[GUIDELINE]`** — mặc định đúng; được lệch NẾU có lý do ghi rõ.
- **`[PATTERN]`** — công thức tái dùng; áp khi gặp đúng tình huống.
- **`[ONE-OFF]`** — ngoại lệ chỉ cho ĐÚNG MỘT moment; không nhân bản.

---

## 1 · Nguyên tắc nền
- **`[LAW]` 95% DOM · 5% sân khấu WebGL.** Bề mặt vận hành (queue/detail/audit/form/search) = DOM,
  tức thì, accessible. Sân khấu = WebGL lazy, **không bao giờ chặn** guồng vận hành.
- **`[LAW]` Motion gánh sự sống, không gánh cái đẹp.** Đẹp do typography + khoảng trống + hairline.
  Chuyển động chỉ động khi có **ý** để truyền (xem 5 verbs).
- **`[LAW]` 5 verbs (toàn bộ ngữ pháp chuyển động):** Appear · Expand · Connect · Flow · Resolve.
  Mọi animation phải quy về một trong năm. Không có verb thứ sáu.

## 2 · Stack & phạm vi cho phép
| Lớp | Trạng thái | Dùng cho | KHÔNG dùng cho |
|---|---|---|---|
| CSS/Tailwind transition | active | micro hover/focus (≤120ms) | reveal lớn, choreography |
| **Framer Motion** | active | DOM enter/exit, list stagger, panel/page transition | particle, 3D, scroll-jack |
| **GSAP + @gsap/react** | active | choreography timeline, ease tùy biến, stage timing | layout DOM thường (để Framer) |
| **Canvas 2D** | active | particle tier-giữa / fallback của stage | bề mặt vận hành |
| **three + R3F** | **active stage-only** (cài F2-2C cho Release Burst) | đúng 5 stage moment | bất kỳ bề mặt vận hành nào |
| **@react-three/postprocessing** (Bloom/DOF…) | **RESERVED — chưa cài** (đã thử & GỠ ở F2-2C: additive/bloom trên nền GIẤY sáng dễ bệt; Burst dùng soft-sprite) | post-FX cho stage moment khi tinh chỉnh trên GPU thật | ops surface |
| **Lenis** (smooth scroll) | **RESERVED — chưa cài** | chỉ landing/threshold khi có scroll moment thật | ops surface (CẤM scroll-jack) |

- `[LAW]` three/R3F **KHÔNG bao giờ** vào ops bundle — chỉ qua `dynamic(..., { ssr: false })`.
- `[LAW]` Cài thư viện sân khấu **đúng lúc dựng moment dùng nó**, không cài trước để "dành".

## 3 · GSAP `[LAW]`
- Lazy (dynamic import) cho mọi timeline nặng; ở stage moment thì nằm trong component đã `ssr:false`.
- **Chỉ ease tùy biến** từ token: `--ease-quiet` (interactive) · `--ease-emerge` (reveal). KHÔNG
  default/linear.
- **KHÔNG spring/bounce/elastic/back.** Họ ease-out duy nhất.
- Cleanup bắt buộc: dùng `useGSAP()` (@gsap/react) hoặc `ctx.revert()` — kill timeline khi unmount.

## 4 · Framer Motion `[GUIDELINE]`
- DOM enter/exit (`AnimatePresence`), list stagger, panel emerge, page transition.
- Tween + ease-token; tránh spring nảy. Ưu tiên `transform`/`opacity` (không layout-thrash).
- `useReducedMotion()` để rẽ nhánh tĩnh khi cần (xem §7).

## 5 · Canvas 2D `[PATTERN]`
- Tier-giữa / fallback của một stage moment (máy yếu, hoặc khi không dựng WebGL).
- `[LAW]` rAF loop · DPR-aware · **cap số particle** · cleanup khi unmount hoặc tab hidden
  (`visibilitychange`) · ở trong frame budget (§8).
- `[LAW]` luôn đi kèm fallback tĩnh cho reduced-motion (§7).

## 6 · R3F / WebGL `[LAW]`
- **Chỉ ở 5 stage moment (§9).** Không nơi nào khác.
- Mount qua `next/dynamic(() => import(...), { ssr: false })` + Suspense fallback (skeleton tĩnh).
- **Dispose** geometry/material/texture khi unmount (tránh memory leak).
- **Graceful degrade:** máy yếu/mobile → hạ octave / tắt post-FX, hoặc rơi xuống Canvas 2D / tĩnh.
- Mục tiêu **60fps**, chiều sâu thật (grain/light/DOF), KHÔNG gradient phẳng.

## 7 · Reduced motion `[LAW]`
- `prefers-reduced-motion: reduce` là **yêu cầu cứng, không phải tùy chọn nâng cấp**.
- `globals.css` collapse **duration** của mọi CSS `animation`/`transition` về ~0ms toàn cục — đây là
  lớp CSS. ⚠ Nó **KHÔNG** chặn motion do JS/WAAPI điều khiển (Framer `motion.*`, GSAP timeline).
- `[LAW]` Vì CSS-collapse không bắt được motion JS-driven, **mọi animation Framer/GSAP PHẢI tự gate**
  bằng `useReducedMotion()` / `gsap.matchMedia()`. Coi giá trị **null/chưa xác định (pre-hydration) =
  reduced** (vd `useReducedMotion() ?? true`, kèm mounted-gate `useState`+`useEffect`) để KHÔNG lóe
  một nhịp fade trước khi hook resolve.
- **Thêm:** mỗi stage moment PHẢI có fallback tĩnh/DOM-fade tường minh, gate ở runtime như trên hoặc
  `matchMedia("(prefers-reduced-motion: reduce)")`.
- `[LAW]` Chuyển động **không bao giờ là vật mang nghĩa duy nhất** — tắt motion vẫn đọc đủ thông tin.

## 8 · Performance budget `[LAW]`
- Ops bundle **không chứa** three/R3F (kiểm bằng build output). WebGL code-split + lazy, chỉ tải khi
  moment của nó kích hoạt.
- Ops surface TTI nhanh; sân khấu 60fps (≤16ms/frame); mobile degrade thay vì bỏ frame.
- **Thang thời lượng (duration ladder):**

  | Hạng | ms | Dùng |
  |---|---|---|
  | micro | 120 | hover/focus/toggle |
  | standard | 200 | tương tác thường |
  | page | 280 | chuyển trang/panel |
  | reveal | 320 | emerge/stagger |
  | cinematic | 600–1200 | **chỉ stage** |

- `[LAW]` `cinematic` bị **cấm** ở guồng vận hành hằng ngày.

## 9 · 5 Spectacle Moments `[LAW]` — ngân sách đóng (đúng 5, không hơn)
Sân khấu chỉ mở ở năm khoảnh khắc sau. Thêm moment thứ sáu = đổi luật, phải cập nhật file này trước.

| # | Moment | Tool | Trạng thái |
|---|---|---|---|
| 1 | Threshold (route `/`) | R3F ink-field + GSAP wordmark | *future* |
| 2 | First-paint Dashboard | GSAP stagger + light-sweep | *future* |
| 3 | **Release Burst** | R3F particles + Canvas 2D + DOM | **BUILT (F2-2C)** |
| 4 | Emergency tempo-shift | CSS var `--pulse` swap | *future* `[ONE-OFF]` phá ease-out duy nhất |
| 5 | Empty / Milestone | serif emerge + mote + light pool | *future* |

### 3 · Release Burst (chi tiết — BUILT ở F2-2C)
- **Trigger:** HS submit report thành công (201) → xác nhận "đã được lắng nghe".
- **Verb:** Connect → Resolve. **Thời lượng:** cinematic 600–1200ms.
- **3 tier (cùng một API `ReleaseBurst({ caseCode, onDone? })`):**
  - **High `[ONE-OFF]`** — R3F GPU point-particles (curl-noise) bung từ tâm → tụ về impression của
    mono `caseCode`. GSAP drive timing (scatter → converge → reveal), **CustomEase từ token** (ease-out only).
  - **Mid `[PATTERN]`** — Canvas 2D dots (rAF) cho mobile/máy yếu.
  - **Reduced-motion `[LAW]`** — bỏ particle, fade tĩnh mono `caseCode` + dòng serif
    "Tiếng nói của bạn đã được ghi nhận."
- `[LAW]` Burst chỉ để **xác nhận**, không phải demo. Tiết chế hơn phô diễn — "resolve mới flourish".

**As-built (F2-2C):** `components/motion/ReleaseBurst.tsx` (orchestrator chọn tier runtime + DOM confirmation
luôn-render) + `release-burst/{ReleaseBurstStage(R3F high), ReleaseBurstCanvas(Canvas mid), sample-text,
burst-tier}` + `lib/cubic-bezier.ts`. Quyết định khác plan đã chốt:
- **Glow = soft-sprite (NormalBlending mực đỏ trên giấy), KHÔNG @react-three/postprocessing Bloom.** Lý do:
  additive/bloom trên nền GIẤY sáng dễ bệt/đen, không kiểm được bằng mắt ở môi trường headless; soft-sprite
  an toàn, đúng bản sắc, build-verifiable. (Bloom để mở khi có phiên tinh chỉnh thị giác trên GPU thật.)
- **three/R3F chunk LAZY-ONLY** (kiểm: HTML prerender `/report/new` 12 script đầu KHÔNG chứa three/shader) — §6/§8.
- **frameloop="demand"** + invalidate() drive từ GSAP onUpdate → hết burst là loop ngừng (KHÔNG đốt GPU nền).
- **a11y:** DOM confirmation luôn render; SR đọc xác nhận qua focus tiêu đề + `aria-describedby`→caseCode (live
  region tĩnh không tự announce); lớp particle `aria-hidden`. Total timeline 1.18s ≤ trần 1200ms.
- **Fallback chỉ phủ lỗi NÉM:** `StageBoundary` bắt chunk-import reject + throw lúc R3F render → rơi Canvas 2D.
  Hỏng WebGL IM LẶNG (context-loss, shader compile/link fail — three log + no-op, KHÔNG ném) → high layer
  rỗng, KHÔNG tự rơi Canvas. Chấp nhận được vì DOM confirmation luôn hiện (nghĩa nguyên); **RESIDUAL F2-2D:**
  thêm listener `webglcontextlost` → degrade Canvas, để mở.
- **Hoãn (cosmetic, §7 nghĩa vẫn nguyên):** (a) path high→fail→mid: Canvas fallback mount muộn nên lệch nhịp
  với DOM-reveal cố định; (b) mạng chậm: chunk high tải >~0.86s thì DOM hiện trước rồi particle mới bung. Cả
  hai chỉ giảm chất "spectacle" trên nhánh hiếm, KHÔNG mất nghĩa/a11y.
