// Types MIRROR docs/API.md (hợp đồng đóng băng). Tái dùng enum từ Prisma generated
// (import type → bị erase khi build, KHÔNG kéo runtime vào client bundle). KHÔNG bịa field.
import type {
  Role,
  CasePriority,
  CaseStatus,
  AuditAction,
  LocationType,
  NotificationType,
} from "@/generated/prisma/client";

export type { Role, CasePriority, CaseStatus, AuditAction, LocationType, NotificationType };

// ---- Lookups (M1) ----
export interface CategoryDTO {
  id: string;
  name: string;
  description: string | null;
  defaultPriority: CasePriority | null;
  defaultSensitive: boolean;
}
export interface CategoriesResponse {
  categories: CategoryDTO[];
}

export interface BuildingRef {
  id: string;
  code: string;
  name: string;
}
export interface LocationDTO {
  id: string;
  code: string;
  name: string;
  floor: number | null;
  type: LocationType;
  buildingId: string | null;
  building: BuildingRef | null;
}
export interface LocationsResponse {
  locations: LocationDTO[];
}

// ---- Audit (M1) ----
export interface ActorRef {
  id: string;
  name: string;
  role: Role;
}
export interface AuditLogDTO {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string; // ISO
  actorId: string | null;
  actor: ActorRef | null;
}
export interface AuditResponse {
  logs: AuditLogDTO[];
  total: number;
  page: number;
  totalPages: number;
}

// ---- Cases (M3) ----
export interface UserRef {
  id: string;
  name: string;
  role?: Role;
}
export interface CategoryRef {
  id: string;
  name: string;
}
export interface CaseLocationRef {
  id: string;
  code: string;
  name: string;
}

export interface CaseListItem {
  id: string;
  caseCode: string;
  title: string;
  description: string;
  location: string | null;
  locationId: string | null;
  categoryId: string;
  priority: CasePriority;
  status: CaseStatus;
  isSensitive: boolean;
  isEmergency: boolean;
  studentFlaggedEmergency: boolean;
  createdById: string;
  assignedToId: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: CategoryRef;
  locationRef: CaseLocationRef | null;
  createdBy: UserRef;
  assignedTo: { id: string; name: string } | null;
}

export interface CommentDTO {
  id: string;
  caseId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: UserRef;
}
export interface AttachmentDTO {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string };
}
export interface StatusHistoryDTO {
  id: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  note: string | null;
  createdAt: string;
  changedBy: UserRef;
}
export interface CaseDetail extends CaseListItem {
  category: CategoryRef & { description?: string | null };
  attachments: AttachmentDTO[];
  statusHistory: StatusHistoryDTO[];
  comments: CommentDTO[];
}

export interface CasesListResponse {
  cases: CaseListItem[];
  total: number;
  page: number;
  totalPages: number;
}
// Emergency lane (P7) — GET /api/cases/emergency?activeOnly — KHÔNG phân trang (khẩn hiếm + indexed).
// Server đã gate sensitivity (OR:[{isSensitive:false},{assignedToId:me}]) — FE KHÔNG tự lọc.
export interface EmergencyCasesResponse {
  cases: CaseListItem[];
  total: number;
}
export interface CaseResponse {
  case: CaseListItem | CaseDetail;
}
export interface CommentResponse {
  comment: CommentDTO;
}

// ---- Notifications (M4) ----
export interface NotificationDTO {
  id: string;
  userId: string;
  caseId: string | null;
  type: NotificationType;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  case: { id: string; caseCode: string } | null;
}
export interface NotificationsResponse {
  notifications: NotificationDTO[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
}

// ---- Dashboard (M4) — keys ĐÓNG BĂNG (chú ý _count vs count theo từng mảng) ----
export interface DashboardResponse {
  totalCases: number;
  newToday: number;
  emergencyOpen: number;
  unassigned: number;
  stale: number;
  byStatus: { status: CaseStatus; _count: number }[];
  byPriority: { priority: CasePriority; _count: number }[];
  byCategory: { categoryId: string; name: string; count: number }[];
  byLocation: { locationId: string; code: string; name: string; count: number }[];
  unlocated: number;
}
