// /audit — shell server MỎNG (không fetch/không đọc session): logic + quyền ở client view (§1.6).
// Quyền do AuditView quyết (server 403 → PermissionDenied); nav vốn đã ẩn mục với STUDENT/STAFF.
import { AuditView } from "@/components/app/audit/AuditView";

export default function AuditPage() {
  return <AuditView />;
}
