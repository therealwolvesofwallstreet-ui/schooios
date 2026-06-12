// /feed — "Bảng tin" (STUDENT): shell server MỎNG (không fetch/không đọc session). Read-only feed ở
// client view; dữ liệu server-scoped qua GET /api/cases (KHÔNG mine → công khai ∪ của-mình). Nav chỉ
// hiện mục với STUDENT; role khác vào thẳng URL chỉ thấy phần server cho phép.
import { FeedView } from "@/components/app/feed/FeedView";

export default function FeedPage() {
  return <FeedView />;
}
