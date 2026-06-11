// Home placeholder trong nhóm (app) — render được cho cả 4 role để foundation.spec chụp shell.
// Trang chủ role-aware THẬT (dashboard / báo cáo của tôi) thuộc F2.
import { Card } from "@/components/ui/Card";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink font-serif text-4xl leading-tight">Lưu khố sống</h1>
        <p className="text-ink-2 max-w-prose text-sm leading-relaxed">
          Mỗi sự vụ là một tiếng nói được tiếp nhận, phân loại và theo dấu đến khi khép lại.
        </p>
      </header>

      <Card>
        <p className="text-ink-3 text-[11px] font-medium tracking-wider uppercase">Nền móng F1</p>
        <p className="text-ink-2 mt-2 text-sm">
          Khung vận hành, hệ thống thiết kế và lớp dữ liệu đã sẵn sàng. Màn hình nghiệp vụ
          sẽ được dựng ở các phase sau.
        </p>
      </Card>
    </div>
  );
}
