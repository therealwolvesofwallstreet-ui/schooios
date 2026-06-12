// /notifications — shell server MỎNG (không fetch/không đọc session): toàn bộ logic ở client view
// (§1.6 fetch-boundary). NotificationsView nhận AppShell từ layout (app).
import { NotificationsView } from "@/components/app/notifications/NotificationsView";

export default function NotificationsPage() {
  return <NotificationsView />;
}
