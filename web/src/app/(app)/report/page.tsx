// /report — "Báo cáo của tôi": shell server MỎNG (không fetch/không đọc session); logic ở client view.
// Đích của nav STUDENT "Báo cáo của tôi" (trước đây link suông → 404). Dữ liệu server-scoped qua
// GET /api/cases?mine=true (createdById, AND role-where).
import { MyReportsView } from "@/components/app/report/MyReportsView";

export default function MyReportsPage() {
  return <MyReportsView />;
}
