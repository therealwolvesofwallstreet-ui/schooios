// /emergency — shell server MỎNG (không fetch/không đọc session): logic + quyền ở client view.
// Quyền do server quyết (STUDENT → /api/cases/emergency 403 → PermissionDenied); nav vốn đã ẩn mục
// với STUDENT. AUDITOR vào thẳng URL vẫn xem được (server 200) dù không có mục nav.
import { EmergencyView } from "@/components/app/emergency/EmergencyView";

export default function EmergencyPage() {
  return <EmergencyView />;
}
