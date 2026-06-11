"use client";

// DEV preview — xem RELEASE BURST (stage moment #3) mà KHÔNG cần luồng tạo case thật.
// ?tier=high|mid|reduced ép tier (forceTier); không có → auto-detect như prod. "Phát lại" remount.
// KHÔNG phải màn nghiệp vụ (như /styleguide). Auth gate qua proxy như mọi route (app).
// Đọc tier từ window.location (KHÔNG useSearchParams) để tránh yêu cầu Suspense lúc prerender.
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import type { BurstTier } from "@/components/motion/release-burst/burst-tier";

// Nạp y HỆT production (report/new): client-only ssr:false → preview phản chiếu đúng luồng thật và
// tránh hydration mismatch (ReleaseBurst tính tier trong useState initializer, giả định client-only).
const ReleaseBurst = dynamic(() => import("@/components/motion/ReleaseBurst"), { ssr: false });

const SAMPLE = "CASE-2026-00042";

function parseTier(): BurstTier | undefined {
  if (typeof window === "undefined") return undefined;
  const t = new URLSearchParams(window.location.search).get("tier");
  return t === "high" || t === "mid" || t === "reduced" ? t : undefined;
}

export default function BurstPreviewPage() {
  const [forceTier] = useState<BurstTier | undefined>(parseTier);
  const [replay, setReplay] = useState(0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-10">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-ink-3 font-mono text-xs">tier: {forceTier ?? "auto"}</span>
        <a className="text-ink-2 hover:text-ink text-xs underline-offset-4 hover:underline" href="?tier=high">
          high
        </a>
        <a className="text-ink-2 hover:text-ink text-xs underline-offset-4 hover:underline" href="?tier=mid">
          mid
        </a>
        <a
          className="text-ink-2 hover:text-ink text-xs underline-offset-4 hover:underline"
          href="?tier=reduced"
        >
          reduced
        </a>
        <a className="text-ink-2 hover:text-ink text-xs underline-offset-4 hover:underline" href="?">
          auto
        </a>
        <Button variant="ghost" onClick={() => setReplay((k) => k + 1)}>
          Phát lại
        </Button>
      </div>

      <div className="border-line overflow-hidden rounded-md border">
        <ReleaseBurst
          key={`${forceTier ?? "auto"}-${replay}`}
          caseCode={SAMPLE}
          forceTier={forceTier}
          onDone={() => setReplay((k) => k + 1)}
        />
      </div>
    </div>
  );
}
