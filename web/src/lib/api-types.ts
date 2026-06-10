// Types MIRROR docs/API.md (hợp đồng đóng băng). Tái dùng enum từ Prisma generated
// (import type → bị erase khi build, KHÔNG kéo runtime vào client bundle). KHÔNG bịa field.
import type {
  Role,
  CasePriority,
  CaseStatus,
  AuditAction,
  LocationType,
} from "@/generated/prisma/client";

export type { Role, CasePriority, CaseStatus, AuditAction, LocationType };

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
