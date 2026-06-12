// /cases — "Duyệt tất cả vụ việc": shell server MỎNG. Next 16: `searchParams` là Promise → await.
// Đọc lát drill-down (status/emergency/category/cat) từ URL rồi trao initial cho client view; mọi
// quyền/lọc/phân trang do server quyết qua GET /api/cases (nav chỉ hiện mục với ADMIN/AUDITOR).
// KHÔNG xung đột route: /cases → page.tsx · /cases/[id] → detail.
import { AllCasesView } from "@/components/app/cases/AllCasesView";

export default async function AllCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <AllCasesView
      initial={{
        status: pick(sp.status),
        emergency: pick(sp.emergency),
        category: pick(sp.category),
        cat: pick(sp.cat),
      }}
    />
  );
}
