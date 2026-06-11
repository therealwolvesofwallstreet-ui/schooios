# SchooIOS — UI BUILD PLAN · "Đài Lặng / Quiet Observatory"

> Mục tiêu: một UI có **bản sắc đột phá**, Tyrsa-grade, không bao giờ "AI-basic".
> Single-file CDN đã làm xong việc của nó (chứng minh hướng). Từ đây = project thật.

---

## 0 · NGUYÊN TẮC KIẾN TRÚC (quyết định nền)

**95% sản phẩm là DOM nhanh & chế tác kỹ. 5% là sân khấu WebGL.**
Đây là khác biệt giữa "thằng AI bolt WebGL khắp nơi" và một director thật. SchooIOS bị dùng 8h/ngày — phần vận hành phải tức thì, accessible, DOM. WebGL **chỉ** sống ở 5 khoảnh khắc sân khấu (ngân sách B), **lazy-load**, không bao giờ chặn guồng làm việc.

- **Sân khấu (WebGL/GLSL/GSAP):** Ngưỡng cửa · First-paint dashboard · Release burst · Emergency tempo-shift · Empty/milestone.
- **Guồng (DOM + Framer Motion + ease tùy biến):** queue, case detail, audit, settings, forms, search.

---

## 1 · STACK SẢN XUẤT

| Lớp | Công cụ | Mua được gì |
|---|---|---|
| App shell | Next.js 16 (feature/frontend, có sẵn) | routing, RSC, ops surfaces |
| WebGL | React Three Fiber + three | scene khai báo, tái dùng |
| Post-FX | @react-three/postprocessing | bloom · DOF · grain · vignette THẬT |
| Shader | GLSL tùy biến | trường mực, light, depth — không gradient phẳng |
| Choreography | GSAP + @gsap/react | timeline, **ease tùy biến** (KHÔNG ease default) |
| Smooth scroll | Lenis | cuộn-lụa ở landing/threshold (ops KHÔNG scroll-jack) |
| DOM motion | Framer Motion | list stagger, panel emerge, page transition |
| Type | self-host `next/font/local`: Fraunces · Geist · Geist Mono | **VN-perfect, zero CDN breakage, no FOUT** |
| Tokens | CSS custom properties | palette · 2 ease curve · type scale · spacing — 1 nguồn |
| Components | **tự rebuild** (KHÔNG shadcn mặc định) | border 1px, radius ≤6, no decorative shadow — bản sắc |

---

## 2 · LỘ TRÌNH (mỗi phase = một thứ bạn NHÌN thấy & duyệt)

**P0 · Nền** — scaffold project, cài deps, design tokens, self-host font, AppShell (sidebar/topbar), motion primitives.
→ *Output:* trang playground: bạn xem palette + 3 giọng chữ + 2 đường ease chạy thật.

**P1 · NGƯỠNG CỬA (ceiling-setter)** — threshold thành R3F scene production: ink-field shader v2 (depth + grain + DOF + post-FX), wordmark Schoo|IOS two-voice reveal, GSAP timeline, dissolve → login.
→ *Output:* route `/` chạy thật. **Đây là thước đo trần — đẩy tới khi bạn GẬT mới đi tiếp.**

**P2 · Login + first-paint dashboard** — entry ritual (underline draw, lỗi lạnh-có-phẩm-giá), dissolve vào dashboard tự-lắp-ráp (stagger).
→ *Output:* luồng vào hệ thống trọn vẹn.

**P3 · Lõi vận hành** — queue (rãnh tín hiệu sống, toggle compact, filter chữ), case detail (timeline làm xương sống, internal note khảm linen).
→ *Output:* click case thật, đọc "hồ sơ sống". (DOM + Framer Motion, chế tác kỹ.)

**P4 · Release burst** — create report một-câu-một-màn + WebGL particle/shader bung thành caseCode.
→ *Output:* gửi report → khoảnh khắc cảm xúc (QF2).

**P5 · Authority + Emergency** — emergency tempo-shift (root-class swap + chrome signal thường trực), audit (mono pháp chứng), notifications, ⌘K search triệu hồi.
→ *Output:* các bề mặt uy quyền + cú phá-luật khẩn cấp.

**P6 · States + Mobile** — empty (serif+ánh sáng), loading (thở, no spinner), error (điềm tĩnh), report flow mobile-native + ops responsive.
→ *Output:* mọi trạng thái + thế giới điện thoại của học sinh.

**P7 · Polish (cái 5% quyết định)** — tinh chỉnh timing, ease, calibrate grain, a11y, perf budget, các tiểu tiết tách Awwwards khỏi tầm thường.
→ *Output:* walkthrough toàn sản phẩm.

---

## 3 · TỪNG KHOẢNH KHẮC SÂN KHẤU — kỹ thuật + "trần"

- **Ngưỡng cửa:** FBM domain-warp ink field + mouse ink-diffusion + grain shader + DOF nhẹ + bloom tiết chế trên đốm teal. Wordmark 2 mask (R=serif, G=sans), 2 reveal khác ease. Trần = cảm giác chiều sâu vật lý, không một frame nào phẳng.
- **First-paint dashboard:** stagger reveal top→down bằng GSAP (40ms/item) + một light-sweep quét qua khi "phòng bật điện". Trần = cảm giác hệ thống *lắp ráp*, không phải fade-in rẻ.
- **Release burst:** GPU particles (point shader, curl-noise) bung từ center → tụ thành caseCode, additive + bloom. Trần = "hàng ngàn tiếng nói được giải phóng" cảm được thật.
- **Emergency tempo-shift:** swap CSS var `--pulse` trên root → mọi nhịp đập nhanh-sắc, một sợi đỏ thường trực; **lần DUY NHẤT phá luật ease-out**. Trần = khẩn nhưng điềm tĩnh, không báo động rẻ.
- **Empty/milestone:** serif emerge + một đom đóm trôi + light pool. Trần = như tìm thấy mẩu giấy viết tay.

---

## 4 · CHUẨN "ĐẠT TẦM" (checklist chống AI-basic — mọi PR phải qua)

1. Mọi transition dùng **ease token tùy biến**, không bao giờ default/linear.
2. Không component library để mặc định — rebuild theo border-1px / radius≤6 / no decorative shadow.
3. Type **VN hoàn hảo**, self-host, 3 giọng đúng phạm vi (serif chỉ chạm lời người).
4. WebGL moments: **60fps**, depth thật (grain+light+DOF), KHÔNG gradient phẳng.
5. Teal đúng 3 chỗ; mono cho mọi con số định danh.
6. Perf: ops surfaces TTI nhanh; WebGL **lazy-load** chỉ ở moment cần.
7. Mobile: WebGL degrade graceful (giảm octave / tắt post-FX), DOM core đầy đủ.
8. "Mỗi pixel có lý do tồn tại" — không một pixel "vì framework bảo thế".

---

## 5 · CÁCH LÀM VIỆC (để không lặp lại sai lầm)

- **Chiều sâu trước, bề rộng sau.** Một màn đẩy tới trần → bạn phản ứng ruột → siết → mới sang màn kế. KHÔNG bao giờ làm 8 màn nửa vời.
- **Reference-driven:** trước mỗi moment sân khấu, tôi gom *kỹ thuật cụ thể* (shader/ease/studio để học), không nói "Tyrsa-like" mơ hồ.
- **Bạn là người chốt "đạt/chưa".** Tôi không tự khen.

---

## 6 · QUYẾT ĐỊNH CẦN TỪ BẠN

1. **Green-light project thật?** (cài R3F/GSAP/Lenis vào `feature/frontend`, deps nặng) — hay làm một **"lab" Vite riêng** để R&D các scene rồi port vào Next? *(Khuyến nghị: lab riêng cho experiential, Next cho sản phẩm.)*
2. **Bắt đầu từ P0 (nền) hay nhảy thẳng P1 (ngưỡng cửa) để chốt trần trước?** *(Khuyến nghị: P1 trước — chốt được trần thì cả lộ trình mới có nghĩa.)*
3. **Cần "reference pack" kỹ thuật trước P1 không?**
