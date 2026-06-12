// /queue — shell server MỎNG (không fetch/không đọc session): logic ở client view.
// Mở rộng bucket "Đang chờ nhận" của StaffHome thành route riêng (KHÔNG sửa StaffHome). Dữ liệu
// server-scoped theo role qua GET /api/cases (STAFF chỉ thấy NEW/TRIAGED + assigned).
import { QueueView } from "@/components/app/queue/QueueView";

export default function QueuePage() {
  return <QueueView />;
}
