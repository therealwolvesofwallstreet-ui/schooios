// Đầu hồ sơ: caseCode (mono) + tiêu đề (SERIF — khoảnh khắc con người) + StatusPill + ưu tiên (mono).
// Edge OXBLOOD bên trái khi isEmergency (cờ CHÍNH THỨC, KHÁC studentFlaggedEmergency) — border-l giữ
// chỗ (transparent) để bật/tắt không xô layout. KHÔNG dùng STATUS_BADGE cầu vồng (StatusPill lo màu).
import { StatusPill } from "@/components/ui/StatusPill";
import { CaseFlags } from "@/components/ui/CaseFlags";
import { PRIORITY_LABEL } from "@/lib/case-display";
import { cn } from "@/lib/cn";
import type { CaseDetail } from "@/lib/api-types";

export function CaseHeader({ detail }: { detail: CaseDetail }) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-l-2 border-transparent pl-4",
        detail.isEmergency && "border-emergency",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-ink-3 font-mono text-xs tracking-wider">{detail.caseCode}</span>
        <StatusPill status={detail.status} />
        <span className="text-ink-3 font-mono text-[11px] tracking-wider uppercase">
          {PRIORITY_LABEL[detail.priority]}
        </span>
        {detail.isEmergency && (
          <span className="text-emergency font-mono text-[11px] tracking-wider uppercase">
            Khẩn cấp
          </span>
        )}
        <CaseFlags isAnonymous={detail.isAnonymous} isSensitive={detail.isSensitive} />
      </div>
      <h1 className="text-ink font-serif text-3xl leading-snug break-words md:text-4xl">
        {detail.title}
      </h1>
    </header>
  );
}
