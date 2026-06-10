# MERGE MAP — FE(mock) → BE(API thật, đóng băng tại docs/API.md)

> Nguồn sự thật chi tiết = `docs/API.md`. File này là bản đồ NHANH cho merge — đọc trước mỗi phase.

## Role (nguồn = GET /api/auth/me; KHÔNG đoán theo email)
FE student/admin → BE 4 role: STUDENT="Học sinh" · STAFF="Cán bộ" · ADMIN="Ban giám hiệu" · AUDITOR="Kiểm toán"(read-only,/audit)

## Field map — Report(FE) → Case(BE, camelCase)
| FE | BE | Ghi chú |
|---|---|---|
| id "SOS-xxx" (client-gen) | caseCode (DB-gen "CASE-2026-00001") | BỎ client-gen; dùng caseCode từ response |
| category (free-text, 2 option) | categoryId (FK) | dropdown nạp GET /api/categories |
| location (free-text, 2 option) | locationId? (FK) | dropdown nạp GET /api/locations |
| priority Low/Medium/High | priority LOW/MEDIUM/HIGH/CRITICAL | THÊM CRITICAL |
| isConfidential | isSensitive | checkbox "ẩn danh" → sensitive:true + TODO(ẩn-danh-thật) |
| isEmergency (lúc tạo) | emergency:true (=studentFlaggedEmergency) | cờ chính thức isEmergency chỉ qua PATCH /emergency (STAFF/ADMIN) |
| status VN (3) | CaseStatus enum (7) | map HIỂN THỊ qua lib/case-display.ts; PATCH /status dùng ENUM |
| createdAt (local string) | createdAt (ISO, server) | hiển thị format ở FE |

## Status display (enum → nhãn VN + màu) — case-display.ts (1 chiều)
NEW=Chờ tiếp nhận · TRIAGED=Đã phân loại · ASSIGNED=Đã giao · IN_PROGRESS=Đang xử lý ·
WAITING_FOR_USER=Chờ phản hồi · RESOLVED=Đã giải quyết · CLOSED=Đã đóng.

## Store(FE) → API action
- useAuthStore: login→POST /api/auth/login {identifier,password} · hydrate→GET /api/auth/me · logout→POST /api/auth/logout
- useReportStore: add→POST /api/cases · list→GET /api/cases · detail→GET /api/cases/[id] · status→PATCH /api/cases/[id]/status · assign→PATCH /assign · emergency→PATCH /emergency · comments→GET/POST /api/cases/[id]/comments
- useNotificationStore: GET /api/notifications(+?unreadOnly) · PATCH /api/notifications/read-all
- useAuditStore: GET /api/audit (ADMIN/AUDITOR; M1 mới)
- dashboard: GET /api/dashboard (ADMIN/AUDITOR; keys: totalCases,newToday,emergencyOpen,unassigned,stale,byStatus,byPriority,byCategory,byLocation,unlocated)
- dropdowns: GET /api/categories · GET /api/locations (M1 mới)

## Pages (web/src/app) cần sửa
/ (dashboard) · /report · /report/new · /report/[id] · /notifications · /profile · /audit · +/login +/change-password(mới) · components/layout/Navbar

## Landmine (đọc kỹ)
- proxy.ts cũ chỉ 401-JSON cho /api → M2 mở rộng gác trang + nhánh (api→401 JSON; trang→redirect /login).
- mustChangePassword=true → ép /change-password (đừng khóa chính nó + /logout + /api/auth/*).
- Auth state KHÔNG đọc token (httpOnly) → lấy từ GET /api/auth/me.
- 404 ĐỒNG NHẤT (không 403) cho tài nguyên không thấy. Same-origin → no CORS.
- P9 rate-limit login 10/60s theo (ip+identifier) → test sai-pw dùng identifier RIÊNG.
- react-hot-toast THIẾU trong package.json (đã import) → thêm bản React-19.
- CONTRACT FREEZE: đổi shape/enum/mã lỗi API ⇒ bump version + sửa docs/API.md TRƯỚC.
