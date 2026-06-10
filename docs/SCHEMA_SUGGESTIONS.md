# Góp ý kỹ thuật: mở rộng schema để nạp dữ liệu Campus & Học sinh

> **Bản chất:** Đây là **văn bản đề xuất (advisory)** cho nhóm backend — KHÔNG phải thay đổi đã thực thi. Mục tiêu: giúp `docs/data/*.json` (xem [`CAMPUS.md`](CAMPUS.md)) nạp được vào DB. Người ra quyết định cuối là nhóm phụ trách `web/prisma`.
>
> **Bối cảnh:** Schema hiện tại (init migration, 9 model) **chưa chứa được** dữ liệu này: không có model `Building`/`Location`/`Class`; `User` thiếu `sbd`/`dob`/`lớp`; `Case.location` đang là text tự do (DATA_MODEL.md cố ý defer Location). Để seed đúng, cần **mở rộng schema + 1 migration additive mới**.

---

## 1. Enum đề xuất thêm

```prisma
enum Gender { MALE FEMALE }
enum BuildingType { CLASSROOM SPECIAL FACILITY OFFICE OUTDOOR }
enum LocationType { CLASSROOM FACILITY OFFICE OUTDOOR OTHER }
```

## 2. Mở rộng model `User`

Tất cả trường mới **optional** để không phá ADMIN/STAFF hiện có:

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `email` | `String?` `@unique` | **Đổi từ bắt buộc → optional** (học sinh không có email). Postgres cho phép nhiều `NULL` trong cột unique. |
| `sbd` | `String?` `@unique` | Số báo danh — định danh login học sinh. |
| `dob` | `DateTime?` `@db.Date @map("dob")` | Ngày sinh. |
| `gender` | `Gender?` | `null` với toàn bộ khối 10 (nguồn thiếu). |
| `admissionYear` | `Int?` `@map("admission_year")` | Khóa tuyển sinh (2023/2024/2025), = `2000 + 2 số đầu SBD`. |
| `enrollments` | `Enrollment[]` | Quan hệ tới lớp theo niên khóa. |

## 3. Model mới đề xuất

```prisma
model Building {
  id        String        @id @default(cuid())
  code      String        @unique          // A, B, C, D, LIB, ADMIN, Trad-1, CANTEEN-1, GYM, POOL, PKG-STUDENT, PKG-TEACHER
  name      String
  type      BuildingType
  note      String?
  locations Location[]
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt      @map("updated_at")
  @@map("buildings")
}

model Location {
  id         String       @id @default(cuid())
  code       String       @unique          // A1.1, A1-WC-GV, ENTRY-1, GYM-1...
  name       String
  buildingId String?      @map("building_id")   // NULLABLE: 6 khu chung không thuộc building
  floor      Int?         @map("floor")          // NULL nếu không có (vd LIB-WC nguồn ghi "2+")
  type       LocationType
  note       String?
  building   Building?    @relation(fields: [buildingId], references: [id], onDelete: SetNull)
  cases      Case[]
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt      @map("updated_at")
  @@index([buildingId])
  @@map("locations")
}

model Class {
  id             String       @id @default(cuid())
  name           String                          // "12A2", "10A", "10A1"...
  schoolYear     String       @map("school_year") // "2025-2026"
  grade          Int?                             // 10 / 11 / 12
  specialization String?                          // môn chuyên: "Toán", "Tin", "Pháp"...
  enrollments    Enrollment[]
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt      @map("updated_at")
  @@unique([name, schoolYear])
  @@map("classes")
}

model Enrollment {
  id         String   @id @default(cuid())
  studentId  String   @map("student_id")
  classId    String   @map("class_id")
  isActive   Boolean  @default(true) @map("is_active")
  student    User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class      Class    @relation(fields: [classId], references: [id], onDelete: Restrict)
  createdAt  DateTime @default(now()) @map("created_at")
  @@unique([studentId, classId])
  @@index([classId])
  @@map("enrollments")
}
```

**Vì sao Class + Enrollment (thay vì lưu lớp dạng string trên User):** SBD cố định suốt đời nhưng lớp đổi theo năm. Tách `Enrollment(student ↔ class)` cho phép lưu **lịch sử lớp qua từng niên khóa** mà không sửa schema sau này (mỗi năm thêm bản ghi Enrollment mới trỏ tới Class của năm đó).

## 4. (Tùy chọn) Liên kết Case ↔ Location

Giữ `Case.location String?` (text fallback) và thêm tham chiếu có cấu trúc:

```prisma
// trong model Case
locationId  String?   @map("location_id")
locationRef Location? @relation(fields: [locationId], references: [id], onDelete: SetNull)
@@index([locationId])
```

---

## 5. Lưu ý kỹ thuật khi seed

- **Migration additive:** chỉ thêm bảng mới + cột nullable → an toàn với init migration đã apply, không mất dữ liệu. Chạy `prisma migrate dev --name campus_students` (dùng `DIRECT_URL` session pooler).
- **Hash mật khẩu học sinh:** tất cả 979 em dùng `123456`. **Hash 1 lần rồi tái dùng cùng chuỗi** cho mọi học sinh (tránh ~979× bcrypt; mỗi em đổi mật khẩu sau lần đăng nhập đầu). Admin: hash riêng, mật khẩu nên đọc từ env (vd `SEED_ADMIN_PASSWORD`).
- **Hiệu năng:** dùng `createMany({ skipDuplicates: true })` cho students (theo `sbd`) → `findMany` lấy id theo sbd → `createMany` cho enrollments. Buildings/locations/categories/classes dùng `upsert` (idempotent).
- **Thứ tự seed (FK):** categories → buildings → locations → admins → classes → students → enrollments.
- **Suy specialization** từ `className` (xem [`CAMPUS.md §8`](CAMPUS.md)): `A/A1/A1A/A1B → Toán`; prefix `A2/A3/A4/A5 → Tin/Lí/Hóa/Sinh`; `C1/C2/C3 → Văn/Sử/Địa`; `D1/D2 → Anh`; `P → Pháp`.
- **KHÔNG đụng** 2 bảng immutable (`audit_logs`, `case_status_history`) có trigger chặn UPDATE/DELETE.
- **`prisma.ts`** đang `omit` `passwordHash` — auth login phải opt-in `select`/`omit:false` mới đọc được hash.

## 6. Mapping file → bảng

| File (`docs/data/`) | Trường | Bảng |
|---|---|---|
| `campus.json.buildings` | code, name, type, note | `Building` (upsert by `code`) |
| `campus.json.locations` | code, name, buildingCode→buildingId, floor, type, note | `Location` (upsert by `code`) |
| `campus.json.categories` | name, defaultPriority, defaultSensitive, note | `Category` (upsert by `name`) |
| `campus.json.admins` | email, name | `User` role=ADMIN (upsert by `email`) |
| `classes.json.classes` | name, schoolYear, grade, specialization | `Class` (upsert by `[name, schoolYear]`) |
| `students.json.students` | sbd, name, gender, dob, admissionYear | `User` role=STUDENT (by `sbd`) |
| `students.json.students` | sbd → className | `Enrollment` (nối student ↔ class) |

## 7. Kiểm thử đề xuất (sau khi seed)

- Đếm: `buildings=12`, `locations=96`, `categories=11`, ADMIN=3, students=979, classes=36, enrollments=979.
- Phân bố location type: OUTDOOR 8 / FACILITY 39 / CLASSROOM 40 / OTHER 7 / OFFICE 2.
- Query 1 học sinh theo `sbd` (vd `230001`) → đúng dob/gender + 1 enrollment trỏ lớp đúng.
- Lớp 10 có cả `10A` và `10A1`, cùng `specialization="Toán"`.
- `Category "Khẩn cấp"` → priority `CRITICAL`, sensitive `true`.
- Re-run seed lần 2 → không lỗi, không nhân đôi (idempotent).
