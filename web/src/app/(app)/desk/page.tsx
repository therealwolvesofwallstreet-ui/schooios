// /desk — "Bàn làm việc" (STAFF): shell server MỎNG (không fetch/không đọc session). Logic + chia
// bucket ở client view; dữ liệu server-scoped qua GET /api/cases (STAFF = assigned ∪ NEW/TRIAGED).
// Nav chỉ hiện mục với STAFF; role khác vào thẳng URL chỉ thấy phần server cho phép.
import { DeskView } from "@/components/app/desk/DeskView";

export default function DeskPage() {
  return <DeskView />;
}
