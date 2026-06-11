// Case Detail — shell server mỏng. Next 16: `params` là Promise → await trước khi dùng (async params).
// Toàn bộ logic (query/quyền/mutation) ở client component CaseDetailView (nhận AppShell từ layout (app)).
import { CaseDetailView } from "@/components/app/case-detail/CaseDetailView";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseDetailView caseId={id} />;
}
