# SchooIOS — Tài liệu Campus & Dữ liệu trường (Bootstrap 2026)

> **Trạng thái:** Đây là **tài liệu chuẩn hóa dữ liệu THẬT** của trường, dùng làm nguồn seed. Dữ liệu máy đọc nằm trong [`docs/data/`](data/): [`campus.json`](data/campus.json) · [`students.json`](data/students.json) · [`classes.json`](data/classes.json).
>
> Tài liệu này **chỉ mô tả dữ liệu + nghiệp vụ**. Phần đề xuất kỹ thuật (schema Prisma, migration, seed) nằm riêng ở [`docs/SCHEMA_SUGGESTIONS.md`](SCHEMA_SUGGESTIONS.md) để nhóm backend triển khai.

---

## 1. Thông tin trường

| Trường dữ liệu | Giá trị |
|---|---|
| Tên trường | Trường THPT Chuyên Lý Tự Trọng, Cần Thơ |
| Khuôn viên | Khu Nam Long, Cái Răng |
| Niên khóa active | **2025-2026** |
| Năm dữ liệu | 2026 |
| Nguồn | Campus Bootstrap Dataset 2026 + database học sinh (người dùng cung cấp) |
| Quy mô seed | 12 building · 96 location · 11 danh mục sự vụ · 3 tài khoản ADMIN · **979 học sinh** |

---

## 2. Mô hình đăng nhập & tài khoản

Hệ thống có **3 luồng đăng nhập** (role theo CLAUDE.md: `STUDENT` / `STAFF` / `ADMIN` / `AUDITOR`):

| Luồng | Đăng nhập bằng | Mật khẩu | Ghi chú |
|---|---|---|---|
| **Học sinh** (STUDENT) | **SBD** + họ tên + ngày sinh | mặc định `123456`, đổi sau lần đầu | SBD là định danh duy nhất, cố định suốt đời (kể cả sau khi ra trường) |
| **Staff / Giáo viên** (STAFF) | email công việc + họ tên + DOB | tự đặt | Tạo **on-demand** qua dashboard, không seed hàng loạt |
| **Ban Giám Hiệu** (ADMIN) | email công việc | đặt khi seed | 3 tài khoản seed sẵn (mục 7) |

**Quy tắc:**
- SBD = định danh duy nhất; **lớp là thuộc tính theo niên khóa** (lưu như thực thể qua từng năm, không gắn cố định với phòng học vật lý).
- Ẩn danh (nếu bật): ẩn với học sinh/người dùng thường; **Ban Giám Hiệu vẫn thấy người gửi thật** để xử lý đúng trách nhiệm.
- Chỉ Ban Giám Hiệu (ADMIN) được assign/chuyển giao case cho người khác. STAFF được tự nhận (self-assign) case NEW/TRIAGED.

---

## 3. Quy ước mã hóa địa điểm

| Quy ước | Giải thích |
|---|---|
| `A/B/D` | 4 tầng, 4 phòng mỗi tầng; mã phòng dạng `Xn.m` (vd `A2.1` = phòng 1 tầng 2 dãy A) |
| `C` | 3 tầng, 4 ô mỗi tầng; gồm phòng thí nghiệm / tin học và ô trống; **không có WC riêng** |
| `WC` | Mã WC riêng theo dãy/tầng, vd `A1-WC-GV` (giáo viên), `A1-WC-HS` (học sinh) |
| `B1-MTGV` | Phòng họp giáo viên dãy B (ghép từ B1.2 + B1.3) |
| `Trad-1` | Nhà truyền thống gộp thành 1 mã duy nhất |
| `GYM-1..GYM-5` | Nhà thi đấu đa năng tách theo khu chức năng |
| `CANTEEN-1` | Căn tin (sơ đồ vẽ 2 khối nhưng thực chất 1 căn tin) |

---

## 4. Danh mục tòa nhà / khối (12)

Nguồn: [`campus.json → buildings`](data/campus.json). Loại (type): `CLASSROOM` · `SPECIAL` · `FACILITY` · `OFFICE` · `OUTDOOR`.

| Code | Tên | Type | Ghi chú |
|---|---|---|---|
| A | Dãy A | CLASSROOM | Khối học chính, 4 tầng × 4 phòng, mỗi tầng 2 WC (GV/HS) |
| B | Dãy B | CLASSROOM | Khối học chính 4 tầng; tầng 1 có phòng họp GV + phòng y tế |
| C | Dãy C | SPECIAL | Tin học – thí nghiệm; 3 tầng; không có WC riêng |
| D | Dãy D | CLASSROOM | 4 tầng; có VP đoàn, GDTC, GDQPAN, STEM, âm nhạc |
| LIB | Thư viện điện tử | FACILITY | 2 tầng: trệt = thư viện, trên = hội trường |
| ADMIN | Khu Hiệu bộ | OFFICE | Khu hành chính, gần thư viện điện tử |
| Trad-1 | Nhà truyền thống | FACILITY | Trưng bày + sinh hoạt + văn phòng |
| CANTEEN-1 | Căn tin lớn | FACILITY | Một căn tin lớn |
| GYM | Nhà thi đấu đa năng | FACILITY | Có khán đài + sân trong nhà |
| POOL | Hồ bơi | FACILITY | Hồ bơi ngoài trời, mới xây |
| PKG-STUDENT | Nhà xe học sinh | OUTDOOR | Một khu lớn phía trước khuôn viên |
| PKG-TEACHER | Nhà xe giáo viên | OUTDOOR | Khu riêng cho giáo viên |

---

## 5. Inventory địa điểm (96)

Chi tiết đầy đủ trong [`campus.json → locations`](data/campus.json) (mỗi location: `code`, `name`, `buildingCode`, `floor`, `type`, `note`).

**Phân bố theo type** (khớp tổng quan nguồn): OUTDOOR **8** · FACILITY **39** · CLASSROOM **40** · OTHER **7** · OFFICE **2** = **96**.

**Phân bố theo khối:**

| Khối | Số location | Gồm |
|---|---|---|
| Khu ngoài trời / chung | 6 | `ENTRY-1`, `FLAG-1`, `YARD-1`, `SOCCER-1`, `BASKET-1`, `VOLLEY-1` (đều `buildingCode=null`) |
| Dãy A | 24 | 16 phòng học + 8 WC (GV/HS × 4 tầng) |
| Dãy B | 23 | 13 phòng học + 8 WC + `B1-MTGV` (họp GV) + `B1-YTE` (y tế) |
| Dãy C | 12 | thí nghiệm/tin học (`C1.1`,`C1.2`,`C2.4`,`C3.1`,`C3.4`) + 7 ô trống (OTHER) |
| Dãy D | 17 | 11 phòng học + WC + `D1.1` (VP đoàn, OFFICE) + GDTC/GDQPAN/STEM/âm nhạc |
| Khu Hiệu bộ | 1 | `ADMIN-1` (OFFICE) |
| Thư viện điện tử | 3 | `LIB-1`, `LIB-2`, `LIB-WC` |
| Nhà truyền thống | 1 | `Trad-1` |
| Căn tin | 1 | `CANTEEN-1` |
| Nhà thi đấu | 5 | `GYM-1`..`GYM-5` |
| Hồ bơi | 1 | `POOL-1` |
| Nhà xe HS / GV | 2 | `PKG-STUDENT-1`, `PKG-TEACHER-1` (OUTDOOR) |

> **Lưu ý triển khai:** Dãy C không có WC riêng → report từ khu C nên route sang khu lân cận. `LIB-WC` nguồn ghi tầng "2+" → lưu `floor=null` kèm ghi chú.

---

## 6. Danh mục sự vụ (11)

Nguồn: [`campus.json → categories`](data/campus.json). `defaultSensitive=true` ⇒ case loại này mặc định ẩn với học sinh khác.

| Tên loại | Ưu tiên | Nhạy cảm | Ghi chú |
|---|---|---|---|
| Cơ sở vật chất | MEDIUM | không | Bàn ghế, điện, nước, quạt, cửa, tường, hạ tầng |
| Vệ sinh & môi trường | MEDIUM | không | Rác, mùi, vệ sinh lớp/khu vệ sinh, cảnh quan |
| Thiết bị CNTT | MEDIUM | không | Máy tính, Wi-Fi, máy chiếu, mạng, phòng tin học |
| Học tập & lớp học | LOW | không | Phòng học, bố trí lớp, hoạt động học tập |
| An ninh & an toàn | HIGH | **có** | Xâm nhập, rủi ro an toàn, tài sản công |
| Bạo lực học đường | HIGH | **có** | Xô xát, đánh nhau, đe dọa |
| Quấy rối / bắt nạt | HIGH | **có** | Bullying, cô lập, lăng mạ |
| Y tế & sức khỏe | HIGH | **có** | Ngất, chấn thương nhẹ, sơ cứu |
| Vi phạm nội quy | MEDIUM | **có** | Đi muộn, gian lận, hút thuốc, vật cấm |
| Khẩn cấp | **CRITICAL** | **có** | Cháy, điện giật, tai nạn lớn |
| Khác | LOW | không | Dự phòng khi chưa khớp category nào |

---

## 7. Tài khoản Ban Giám Hiệu (ADMIN, seed sẵn)

Nguồn: [`campus.json → admins`](data/campus.json). Mật khẩu đặt khi seed (đề xuất qua biến môi trường, hash bcrypt).

| Email | Tên hiển thị | Role |
|---|---|---|
| bgh1@ltt.edu.vn | Ban Giám Hiệu 1 | ADMIN |
| bgh2@ltt.edu.vn | Ban Giám Hiệu 2 | ADMIN |
| bgh3@ltt.edu.vn | Ban Giám Hiệu 3 | ADMIN |

> Staff: **0 seed** — tạo on-demand. Tỷ lệ staff on-demand 100%.

---

## 8. Tổng quan học sinh (979)

Nguồn: [`students.json`](data/students.json). **Chỉ gồm 3 khóa active** — khóa 22xxxx (2007, đã ra trường) đã loại bỏ.

| Khóa (admissionYear) | Dải SBD | Khối | Sĩ số |
|---|---|---|---|
| 2023 | 230001–230333 | **12** | 333 |
| 2024 | 240001–240312 | **11** | 312 |
| 2025 | 250001–250334 | **10** | 334 |
| | | **Tổng** | **979** |

### Bản đồ khối lớp → môn chuyên

Mọi lớp đều có môn chuyên. **Chuyên Toán luôn có 2 lớp**: khối 11/12 đặt tên `A1A` & `A1B`; **khối 10 đặt tên `10A` & `10A1`**.

| Block | Môn chuyên | | Block | Môn chuyên |
|---|---|---|---|---|
| A / A1 / A1A / A1B | **Toán** | | C1 | **Văn** |
| A2 | **Tin** | | C2 (C2S, C2Đ) | **Sử** |
| A3 | **Lí** | | C3 | **Địa** |
| A4 | **Hóa** | | D1, D2 | **Anh** |
| A5 | **Sinh** | | P (PSN, PCH) | **Pháp** |

### Ghi chú chất lượng dữ liệu (giữ nguyên theo nguồn)
- **Khối 10 (250xxx) không có cột giới tính** trong nguồn → `gender = null` cho cả 334 em.
- Một số DOB bất thường vẫn giữ nguyên: `230032` (2006), `230147`/`230156` (2007), `240140` (2008), `250250` (2009), `250314`/`250324` (2008).
- Tên nước ngoài/đặc biệt giữ nguyên UTF-8: "Chrétien Anabelle Minh Anh Joséphine", "Hasyila Y Mi Binti Mizan", "Kiều Sheryl", "Nguyễn Nisha May Lynh", "Đào Tắc Tây Đô".
- Có trùng họ tên giữa các em (vd hai "Nguyễn Thị Minh Thư") — phân biệt bằng SBD.

---

## 9. Danh bạ lớp (36 lớp · niên khóa 2025-2026)

Nguồn: [`classes.json`](data/classes.json) (suy tự động từ `students.json`). Định dạng `tên: môn chuyên (sĩ số)`.

**Khối 12** (333): 12A1A: Toán (26) · 12A1B: Toán (35) · 12A2: Tin (14) · 12A3: Lí (26) · 12A4: Hóa (32) · 12A5: Sinh (38) · 12C1: Văn (27) · 12C2S: Sử (20) · 12C2Đ: Sử (15) · 12D1: Anh (33) · 12D2: Anh (30) · 12P: Pháp (37)

**Khối 11** (312): 11A1A: Toán (34) · 11A1B: Toán (33) · 11A2: Tin (20) · 11A3: Lí (30) · 11A4: Hóa (25) · 11A5: Sinh (35) · 11C1: Văn (26) · 11C2: Sử (15) · 11C3: Địa (17) · 11D1: Anh (35) · 11D2: Anh (35) · 11P: Pháp (7)

**Khối 10** (334): 10A: Toán (34) · 10A1: Toán (31) · 10A2: Tin (19) · 10A3: Lí (17) · 10A4: Hóa (36) · 10A5: Sinh (35) · 10C1: Văn (25) · 10C2: Sử (33) · 10C3: Địa (23) · 10D1: Anh (35) · 10D2: Anh (34) · 10P: Pháp (12)

---

## 10. Mapping dữ liệu → bảng (tham chiếu)

| File | Nội dung | Bảng đích đề xuất |
|---|---|---|
| [`campus.json`](data/campus.json) `.buildings` | 12 khối | `Building` |
| [`campus.json`](data/campus.json) `.locations` | 96 địa điểm | `Location` (FK `buildingId` nullable cho khu chung) |
| [`campus.json`](data/campus.json) `.categories` | 11 danh mục | `Category` |
| [`campus.json`](data/campus.json) `.admins` | 3 ADMIN | `User` (role ADMIN) |
| [`students.json`](data/students.json) `.students` | 979 học sinh | `User` (role STUDENT: `sbd`, `dob`, `gender`, `admissionYear`) + `Enrollment` |
| [`classes.json`](data/classes.json) `.classes` | 36 lớp | `Class` (`name`, `schoolYear`, `grade`, `specialization`) |

> Chi tiết kiểu dữ liệu/quan hệ: xem [`docs/SCHEMA_SUGGESTIONS.md`](SCHEMA_SUGGESTIONS.md).
