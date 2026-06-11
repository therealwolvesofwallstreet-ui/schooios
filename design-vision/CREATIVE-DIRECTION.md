# SchooIOS — CREATIVE DIRECTION (Elevated, implementation-ready)
### Hướng: "LƯU KHỐ CỦA NHỮNG TIẾNG NÓI" — Editorial Operations

> CD brief cho product designer + frontend engineer. Quyết định, không chung chung.

---

## 1 · CREATIVE NORTH STAR

**SchooIOS không phải dashboard. Nó là lưu khố sống của tiếng nói một ngôi trường — vận hành bằng sự chính xác của một thiết chế biên tập.**

Điểm tựa thẩm mỹ (load-bearing): **Typography và khoảng trống GÁNH cái đẹp · Màu GÁNH ý nghĩa · Motion GÁNH sự sống.** Cái sang đến từ tiết chế biên tập + chất liệu + thứ bậc chữ — KHÔNG từ trang trí. Cảm xúc: kính nể → yên tâm → được dẫn dắt. Nhìn vào phải thấy "đây là một hệ thống được thiết kế *có ý thức*, bởi người có gu".

Mỏ neo tham chiếu để nâng tầm: nhận diện của một **viện văn hóa lớn** (museum/archive wayfinding), một **ấn phẩm biên tập cao cấp**, kỷ luật của Linear *nhưng ấm và editorial hơn*, chất craft của Urban Jürgensen (ref của bạn). **KHÔNG** phải dark SaaS, KHÔNG Awwwards-neon.

---

## 2 · PRODUCT AESTHETIC DIRECTION

- **Tone:** editorial · assured · warm-premium · institutional-but-human.
- **Density:** medium-generous. Bề mặt vận hành (queue/table) = đặc-có-cấu-trúc, đọc lướt được, không bao giờ chật. Bề mặt biên tập (login/dashboard hero/empty/detail header) = thở rộng.
- **Màu:** 95% giấy+mực. **Một** màu biểu cảm = Signal Red, hiếm & chịu lực. Một *hơi thở* Gold cho "đã ghi nhận". Navy là *nền sâu* cho bề mặt quyền lực, không phải "màu". Màu chỉ xuất hiện khi có vai trò.
- **Tương phản:** chữ tương phản CAO (mực trên giấy) cho sự sắc & uy quyền biên tập; cấu trúc tương phản THẤP (hairline 1px, không phải khối nền). Tương phản có mục đích: gắt ở headline/hành động, im ở mọi nơi khác.
- **Ánh sáng / bề mặt / chiều sâu:** giấy ấm có **grain thật** (chất giấy không tráng — đây là texture bạn đòi). Chiều sâu bằng *layering + hairline + shadow chỉ-khi-hover + một luồng sáng ấm định hướng*, KHÔNG bằng drop-shadow nặng hay glass. Bề mặt cảm giác như *giấy mỹ thuật*, không phải card bóng.
- **Sang mà không giả:** sang = độ chính xác của spacing, chất lượng của chữ, sự tiết chế của màu, tính nhất quán của hệ thống. Không glow/blur/gradient/glass/neon.

---

## 3 · BRAND-LIKE IDENTITY

**Giọng nói sản phẩm:** điềm tĩnh, chính xác, có hơi người — không corporate-dễ-thương, không robot-lạnh. Microcopy theo **ngôn ngữ thương hiệu**: *Cất một tiếng nói (Raise a Signal) · Đã ghi nhận (Acknowledged) · Lưu khố (Archive) · Đang chờ phản hồi (Awaiting Response) · Cảnh báo ưu tiên (Priority Alert).* Hệ thống nói như một thiết chế biết suy nghĩ.

**5 motif nhận diện ("đây là SchooIOS"):**
1. **THE SIGNAL** — một dấu đỏ duy nhất (chấm/triện sáp) nghĩa là *một tiếng nói / bây giờ / hành động*. Màu đỏ duy nhất. Hiếm. *(Tiến hóa quả cầu đỏ thành một dấu triện kỷ luật, KHÔNG phải quả cầu glow.)*
2. **THE SPINE** — đường timeline dọc hairline kết cấu vòng đời case (hồ sơ sống). Motif cấu trúc lặp lại.
3. **MONO IDs** — mọi hồ sơ mang một serial mono (`SCH-2026-00135`) — khí chất thiết chế.
4. **EDITORIAL SERIF MOMENTS** — Canela cho giọng người (headline, lời học sinh, milestone). Hiếm → impact.
5. **HAIRLINE SYSTEM** — đường 1px ấm là ngôn ngữ phân cách chính (bản vẽ/biên tập), không bao giờ khối màu.

**Pattern nền:** VOICE → SIGNAL → ARCHIVE là trục không gian/tự sự xuyên ba vai.

---

## 4 · VISUAL LANGUAGE SYSTEM (token cụ thể)

**Color (đặt tên theo VAI TRÒ, không raw):**
```
--paper        #F6F2EA   nền chính (giấy ấm)
--paper-raised #FBF8F2   surface nổi (card, modal)
--paper-sunken #EFE9DD   well/input bg/code
--ink          #1A1611   text chính (mực ấm, KHÔNG #000)
--ink-2        #6B6457   text phụ
--ink-3        #9A9384   metadata/caption/disabled
--line         #E4DCCB   hairline 1px (phân cách chính)
--line-2       #CFC5B0   hairline nhấn
--signal       #D72638   MÀU BIỂU CẢM DUY NHẤT — voice/now/primary action
--emergency    #9E1B22   oxblood — CHỈ emergency takeover (khác chất với signal)
--gold         #B8985A   hơi thở "đã ghi nhận/resolved/milestone" (cực hiếm)
--authority    #14202E   navy sâu — NỀN cho surface quyền lực (admin/archive), text trên = paper
```
> **CẮT** Electric Cyan + Lavender Mist của mood board — đó là chỗ trôi về lòe loẹt/generic. Giữ Gold + Navy nhưng *đóng vai trò chặt*.

**Surface:** paper (nền) · paper-raised (card/modal) · paper-sunken (input/well) · authority-navy (admin sidebar/archive ground). Card định nghĩa bằng **border hairline**, không bằng shadow.

**Border:** 1px `--line` = ngôn ngữ phân cách. Bảng/section = hairline, không zebra/khối nền. Nhấn = `--line-2`.

**Shadow:** rest = KHÔNG. Hover = `0 2px 10px rgba(26,22,17,.06)` (directional từ trên). Modal = soft lớn hơn nhưng tiết chế. Không shadow trang trí.

**Radius:** 4px mặc định (input, tag) · 8px tối đa (card/modal) · 0 cho hairline/table rows · full-round chỉ cho status pill nhỏ. Không >8px.

**Typography (3 giọng, phạm vi siết):**
```
Editorial  Canela (license) — fallback PP Editorial New / free: Newsreader
           → display 48–64/1.1 · h1 32/1.2 · lời người · milestone · empty · case-title (detail)
System     IBM Plex Sans (free, VN) — 400/500/600
           → toàn UI, nav, body 14–15/1.6, label 11–12/1.5 (uppercase letterspaced)
Data       IBM Plex Mono (VN) — ID/timestamp/numeric/audit · 12–13 · +0.02em
```
> Luật: serif CHỈ ở khoảnh khắc con người, KHÔNG cho UI chrome/list rows. Tối đa 2 family hiện/màn (serif xuất hiện *một mình* trong khoảnh khắc của nó).

**Spacing:** base 4px → 4/8/12/16/24/32/48/64/96. Gutter ngoài rộng. Khoảng trống chịu lực.

**Iconography:** Phosphor Thin/Light, stroke 1.5px, weight nhất quán tuyệt đối. Không mix filled/outlined. Không emoji.

**Badge/Status language:** trạng thái nói bằng **label + dot + vị trí TRƯỚC màu**. Pill viền hairline. `signal` dot = cần chú ý/now; `gold` = đã ghi nhận/resolved; `ink` = trạng thái đang chạy; `emergency` = chỉ khẩn. Priority = trọng lượng border trái hoặc tag mono (LOW/MED/HIGH), KHÔNG cầu vồng.

**Data viz:** editorial. Số lớn mono/Canela, label im. Chart = đường 1px đơn sắc + 1 điểm đỏ. KHÔNG donut/pie cầu vồng, KHÔNG gradient fill, KHÔNG chart-junk. **Viz chữ ký DUY NHẤT = THE PULSE FIELD** (mạng tiếng nói) — render tiết chế (điểm mực, đỏ cho live, nối mảnh), chỉ ở dashboard admin làm hero.

**Form:** input gạch-chân hairline (không box), rộng, label mono-caption. Focus = đường vẽ signal. Validate = ink-dim + dòng mono, không đỏ chói.

**Table:** rows hairline, số canh phải mono, không zebra, row 52–60px (toggle compact 40), **signal gutter** trái 4px.

**Empty / Error / Loading:** empty = Canela + khoảng trống + một dấu signal. Loading = skeleton *thở* (no spinner, no shimmer), ánh sáng đến trước. Error = điềm tĩnh, ink-dim, mono; 403/404 = một dòng Canela; 500/503 = trọng lượng tiết chế, tôn trọng Retry-After.

**Motion:** eases `--ease-quiet cubic-bezier(.22,.61,.36,1)` (interactive) · `--ease-emerge cubic-bezier(.16,1,.3,1)` (reveal). KHÔNG spring/bounce. Durations: micro 120 · standard 200 · page 280 · reveal 320 · cinematic 600–1200 (chỉ sân khấu). 5 verbs: **Appear · Expand · Connect · Flow · Resolve**.

---

## 5 · SCREEN ART DIRECTION

**Login/Onboarding** — split biên tập. Trái: một dòng Canela + giấy + dấu signal đỏ (thở một nhịp). Phải: form gạch-chân. Tâm điểm = nút đỏ "Bước vào" duy nhất. Lề trái rộng mênh mông. Chữ gánh tất. Flourish = dấu signal thở một lần; còn lại restraint. Lỗi = ink-dim + dòng mono, KHÔNG đỏ.

**Dashboard — ADMIN:** command biên tập. Hero = một dòng *số đài kỷ niệm* (mono/Canela) "128 tiếng nói · 76 đã ghi nhận" + **Pulse Field** sống tiết chế (KHÔNG donut). Dưới = queue ledger (hairline, signal gutter, mono ID). Rail phải = khẩn cấp + đang già (im). Flourish = first-paint stagger + Pulse thở; restraint = bảng dữ liệu. Type>color khắp nơi; màu chỉ ở tín hiệu sống.

**Dashboard — STUDENT:** editorial-ấm. Hero = Canela *"Tiếng nói của bạn rất quan trọng."* + hành động đỏ "Cất một tiếng nói". "Báo cáo của tôi" = thẻ hồ sơ biên tập có spine/hành trình. Hơi ấm từ serif + khoảng trống + ánh sáng, KHÔNG từ minh họa. Không chart, không stat.

**Dashboard — STAFF:** sàn làm việc. Cột tâm điểm = vụ của tôi; bể "đang chờ nhận" dưới. Signal gutter. Công cụ chính xác. Flourish tối thiểu.

**Create Report (Raise a Signal):** flow biên tập một-câu-một-màn, prompt Canela, input hairline, rộng. Flourish cảm xúc = **VOICE confirmation**: dấu signal đỏ lan → nối đúng người → tụ thành **mono Case ID** + dòng Canela. Khoảnh khắc lớn DUY NHẤT của học sinh. Form restraint, resolve mới flourish.

**Case Detail (Record):** hồ sơ sống trên **Spine** dọc. Header = mono ID + Canela title + status. Sự kiện = node trên spine; ghi chú nội bộ *khảm* trên paper-sunken + tag mono "NỘI BỘ" (với học sinh: node KHÔNG tồn tại). Đổi status = node *nở* (Expand/Resolve). Type-led; màu chỉ ở dot + status.

**Workflow/Assignment:** assign = hành động cân nhắc, có chủ đích — panel focus; case "chuyển" bằng verb Flow; pill morph êm + spine thêm node. Không decoration ăn mừng trừ RESOLVED (hơi thở gold). Xung đột 409 = "Hồ sơ vừa được người khác cập nhật" điềm tĩnh, không lỗi gắt.

**Comments/Notifications:** comment thread trên spine; nội bộ vs công khai tách bằng cấu trúc + inset + tag mono. Notifications = panel hairline, mỗi dòng một tín hiệu, dot đỏ nếu chưa đọc (server-truth), đọc → dot tan. Realtime = dot Appear. Im.

**Emergency Lane:** cú phá luật DUY NHẤT. KHÔNG "đỏ nhiều hơn" — *cả phòng đổi trạng thái*: oxblood vào, low-pulse liên tục, tempo sắc lên (nơi duy nhất phá ease-out), một sợi tín hiệu thường trực calm trên mọi trang. Cấp bách qua tempo/không gian, không qua ồn. Shock 2–3.

**Search:** ⌘K triệu hồi biên tập — panel paper-raised (hairline + soft shadow, KHÔNG glass) trên giấy dimmed; kết quả emerge stagger; mono ID + sans title + signal dot. Nhanh, như khí cụ. Biến mất êm.

**Audit/Archive:** bề mặt thiết chế nhất — toàn mono, hairline rows, pháp chứng, *cảm giác khắc*, append-only. Thánh đường của AUDITOR. Type+space gánh khí chất; zero màu trừ filter accent. Milestone phân tích = **IMPACT moment** (data tụ → "A better school." Canela/viết tay), hiếm.

---

## 6 · COMPONENT / TOKEN IMPLICATIONS

- **Token layers:** color (role-named) · space scale · type ramp · radius · border · shadow · motion (eases+durations) · z-index.
- **Primitives REBUILD (không shadcn-default):** Button (primary=signal · secondary=hairline · ghost) · Input (hairline-underline) · StatusPill · Card (paper-raised + hairline + hover-shadow) · Table (+ signal gutter) · Tabs (underline) · Modal (paper-raised) · Toast (im) · **Spine/Timeline** · **SignalDot** · **SignalMark (triện)** · **PulseField** (viz chữ ký) · EmptyState (serif) · **EmergencyShell** (root-class đổi tempo).
- **Quy tắc khiến nó dính:** một type ramp duy nhất · màu chỉ theo vai trò · hairline không khối · mono cho mọi định danh · serif cách ly vào khoảnh khắc con người · verb motion map vào tương tác · ngân sách sân khấu được tôn trọng (5 moment, không hơn).

---

## 7 · PRIORITY DECISIONS

**KHÓA:** Đỏ là north-star · emergency = oxblood + takeover (khác chất) · cắt Cyan+Lavender · Gold = hơi thở ghi-nhận · Navy = nền quyền lực · hairline-first · serif cách ly · ngân sách sân khấu B (entry · raise-signal · emergency · first-paint Pulse · milestone Impact).

**CẦN BẠN GẬT:**
1. **License Canela** (đúng nhất cho premium) hay PP Editorial New, hay chấp nhận free Newsreader? — *chữ free là chỗ bạn chê "xấu", nên đây là quyết định tiền-vs-chất.*
2. Chốt 3 motif chữ ký: **Signal mark · Spine · Pulse Field**?
3. Navy làm nền cho surface quyền lực (admin/archive) — đồng ý, hay giữ all-paper?

---

## 8 · WHAT TO AVOID

Generic SaaS (donut + sparkline card + activity feed) · template shadcn để mặc định · dark mode/quá tối · glow/blur/gradient/glass/neon · màu hóa mọi status (cầu vồng) · shadow trang trí · >2 typeface/màn · spring/bounce · serif trên list/UI chrome · grain trên text/card · spectacle trong guồng hằng ngày · emoji · mọi thứ đều nổi bật (phải có nhịp & ưu tiên) · font free rẻ ở chỗ hero · phá vận hành để lấy đẹp.

---

## 9 · FINAL ELEVATED DIRECTION

**SchooIOS là một lưu khố biên tập của những tiếng nói: giấy ấm có chất, mực sắc, một dấu đỏ duy nhất là tiếng nói/bây giờ/hành động. Cái đẹp đến từ thứ bậc chữ, khoảng trống chịu lực, và đường hairline — không từ trang trí. Màu chỉ nói khi có việc để nói; motion chỉ động khi có ý để truyền; sân khấu chỉ mở ở vài khoảnh khắc hiếm xứng đáng. Lặng và chính xác trong guồng vận hành; ấm và có hơi người ở nơi một học sinh cất tiếng. Nhìn vào là biết: đây là một hệ thống có tiêu chuẩn, có gu, có khí chất — không phải một app ngẫu nhiên.**

> *"Lưu khố của những tiếng nói — lặng như giấy, chính xác như mực, sống bằng một dấu đỏ duy nhất."*
