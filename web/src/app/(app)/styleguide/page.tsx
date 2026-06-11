// /styleguide (dev) — bảng nghiệm thu grammar: màu+vai trò · type ramp 3 giọng · spacing ·
// primitives · 2 ease. KHÔNG phải màn nghiệp vụ; là catalog token để verify §5 bằng mắt.
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { StatusPill } from "@/components/ui/StatusPill";
import { SignalDot } from "@/components/ui/SignalDot";
import { Hairline } from "@/components/ui/Hairline";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CaseStatus } from "@/lib/api-types";

const SWATCHES: { name: string; cls: string; role: string }[] = [
  { name: "paper", cls: "bg-paper", role: "nền giấy" },
  { name: "paper-raised", cls: "bg-paper-raised", role: "bề mặt nổi" },
  { name: "sunken", cls: "bg-sunken", role: "bề mặt chìm" },
  { name: "ink", cls: "bg-ink", role: "mực chính" },
  { name: "ink-2", cls: "bg-ink-2", role: "mực phụ" },
  { name: "ink-3", cls: "bg-ink-3", role: "mực mờ" },
  { name: "line", cls: "bg-line", role: "hairline" },
  { name: "line-2", cls: "bg-line-2", role: "hairline đậm" },
  { name: "signal", cls: "bg-signal", role: "voice/now (hiếm)" },
  { name: "emergency", cls: "bg-emergency", role: "takeover khẩn" },
  { name: "gold", cls: "bg-gold", role: "resolved" },
  { name: "authority", cls: "bg-authority", role: "surface quyền lực" },
];

const STATUSES: CaseStatus[] = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "RESOLVED",
  "CLOSED",
];

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64, 96];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-ink-3 text-[11px] font-medium tracking-wider uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink font-serif text-5xl leading-[1.1]">Đài Lặng</h1>
        <p className="text-ink-2 text-sm">Catalog token & primitives — Editorial Operations.</p>
      </header>

      <Section title="Bảng màu · vai trò">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {SWATCHES.map((s) => (
            <div key={s.name} className="border-line flex flex-col gap-2 rounded-md border p-3">
              <span className={`${s.cls} border-line h-12 w-full rounded-sm border`} />
              <span className="text-ink font-mono text-xs">{s.name}</span>
              <span className="text-ink-3 text-[11px]">{s.role}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type ramp · 3 giọng">
        <div className="border-line flex flex-col gap-4 rounded-md border p-6">
          <p className="text-ink font-serif text-5xl leading-[1.1]">Display · Newsreader 48</p>
          <p className="text-ink text-[2rem] leading-tight font-medium">Heading · Sans 32</p>
          <p className="text-ink-2 text-[15px] leading-relaxed">
            Body · IBM Plex Sans 15/1.6 — giọng UI mặc định cho mô tả, đoạn văn, nội dung.
          </p>
          <p className="text-ink-3 text-[11px] tracking-wider uppercase">Label · Sans 11 uppercase</p>
          <p className="text-ink-2 font-mono text-[13px] tracking-[0.02em]">
            Mono · CASE-2026-00001 · 14:32 02/06/2026
          </p>
        </div>
      </Section>

      <Section title="Spacing scale (px)">
        <div className="flex flex-wrap items-end gap-3">
          {SPACING.map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <span className="bg-ink-3 block" style={{ width: 8, height: n }} />
              <span className="text-ink-3 font-mono text-[11px]">{n}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Gửi báo cáo</Button>
          <Button variant="secondary">Hủy</Button>
          <Button variant="ghost">Bỏ qua</Button>
          <Button variant="secondary" disabled>
            Vô hiệu
          </Button>
        </div>
      </Section>

      <Section title="Pills · Status">
        <div className="flex flex-wrap items-center gap-3">
          <Pill mono>CASE-2026-00001</Pill>
          <Pill>Danh mục: An toàn</Pill>
          {STATUSES.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Signal dots">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <SignalDot tone="signal" pulse />
            <span className="text-ink-3 text-xs">live</span>
          </span>
          <span className="flex items-center gap-2">
            <SignalDot tone="gold" />
            <span className="text-ink-3 text-xs">touched</span>
          </span>
          <span className="flex items-center gap-2">
            <SignalDot tone="running" />
            <span className="text-ink-3 text-xs">running</span>
          </span>
          <span className="flex items-center gap-2">
            <SignalDot tone="dormant" />
            <span className="text-ink-3 text-xs">dormant</span>
          </span>
          <span className="flex items-center gap-2">
            <SignalDot tone="emergency" />
            <span className="text-ink-3 text-xs">emergency</span>
          </span>
        </div>
      </Section>

      <Section title="Card · Hairline · Skeleton · Empty">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-ink-3 font-mono text-xs tracking-wider uppercase">Card</p>
            <p className="text-ink-2 mt-2 text-sm">Bề mặt nổi + hairline, không đổ bóng.</p>
            <Hairline className="my-4" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
          <Card>
            <EmptyState message="Chưa có tiếng nói nào ở đây — khi có, nó sẽ xuất hiện." />
          </Card>
        </div>
      </Section>

      <Section title="Easing (hover)">
        <div className="flex flex-wrap gap-4">
          <div className="group border-line flex h-24 w-40 items-center justify-center rounded-md border">
            <span className="bg-ink h-3 w-3 rounded-full transition-transform duration-500 ease-quiet group-hover:translate-x-12" />
            <span className="text-ink-3 absolute mt-16 text-[11px]">ease-quiet</span>
          </div>
          <div className="group border-line flex h-24 w-40 items-center justify-center rounded-md border">
            <span className="bg-ink h-3 w-3 rounded-full transition-transform duration-500 ease-emerge group-hover:translate-x-12" />
            <span className="text-ink-3 absolute mt-16 text-[11px]">ease-emerge</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
