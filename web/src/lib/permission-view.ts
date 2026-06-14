// BẢNG QUYỀN HIỂN THỊ (display-only). Mục đích DUY NHẤT: quyết định FE có RENDER một
// hành động/điều hướng hay không (luật §4.4: không được phép = KHÔNG render, không hiện-rồi-disable).
// ⚠ KHÔNG phải authz: server là nguồn quyền và sẽ trả 403/404 thật. Bảng này MIRROR ma trận
// quyền trong docs/API.md; giữ logic Ở ĐÂY (data table) để usePermissionView mỏng, tránh "God Hook".
import type { Role, CaseStatus } from "@/lib/api-types";

export interface PermissionCtx {
  status?: CaseStatus;
  isOwner?: boolean; // case.createdById === me
  isAssignee?: boolean; // case.assignedToId === me
}

type Predicate = (role: Role, ctx?: PermissionCtx) => boolean;

const inRole =
  (...roles: Role[]): Predicate =>
  (role) =>
    roles.includes(role);

export const PERMISSION_TABLE = {
  // Tạo case: STUDENT/STAFF/ADMIN (AUDITOR read-only → ẩn).
  "case:create": inRole("STUDENT", "STAFF", "ADMIN"),
  // Sửa case: ADMIN mọi case; STUDENT chỉ case của mình; STAFF trong phạm vi.
  "case:editOwn": (role, ctx) =>
    role === "ADMIN" || role === "STAFF" || (role === "STUDENT" && !!ctx?.isOwner),
  // Assign: ADMIN điều phối bất kỳ; STAFF self-assign chỉ NEW/TRIAGED.
  "case:assign": (role, ctx) =>
    role === "ADMIN" ||
    (role === "STAFF" && (ctx?.status === "NEW" || ctx?.status === "TRIAGED")),
  // Đổi trạng thái (PATCH /status): STAFF/ADMIN.
  "case:changeStatus": inRole("STAFF", "ADMIN"),
  // Cờ khẩn cấp chính thức (PATCH /emergency): STAFF/ADMIN.
  "case:setEmergency": inRole("STAFF", "ADMIN"),
  // Bình luận công khai: STUDENT/STAFF/ADMIN.
  "comment:public": inRole("STUDENT", "STAFF", "ADMIN"),
  // Bình luận nội bộ (isInternal): chỉ STAFF/ADMIN.
  "comment:internal": inRole("STAFF", "ADMIN"),
  // Dashboard tổng hợp: ADMIN/AUDITOR.
  "dashboard:view": inRole("ADMIN", "AUDITOR"),
  // Nhật ký audit: ADMIN/AUDITOR.
  "audit:view": inRole("ADMIN", "AUDITOR"),
  // Hàng chờ điều phối: STAFF/ADMIN.
  "queue:view": inRole("STAFF", "ADMIN"),
  // Lane khẩn cấp: STAFF/ADMIN (docs/API.md: AUDITOR → 403).
  "emergencyLane:view": inRole("STAFF", "ADMIN"),
  // Vote up/down: STUDENT/STAFF/ADMIN (AUDITOR → server 403 → không render nút).
  "case:vote": inRole("STUDENT", "STAFF", "ADMIN"),
  // Reply comment (2-tầng): CHỈ ADMIN.
  "comment:reply": inRole("ADMIN"),
  // Xoá comment: tác giả own ∨ ADMIN (server kiểm tra; FE chỉ ẩn nút).
  "comment:deleteOwn": (role, ctx) => role === "ADMIN" || !!ctx?.isOwner,
} satisfies Record<string, Predicate>;

export type PermissionAction = keyof typeof PERMISSION_TABLE;
