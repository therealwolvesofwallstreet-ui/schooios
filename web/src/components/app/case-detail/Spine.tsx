"use client";

// THE SPINE — xương sống dọc 1px (border-l) của hồ sơ sống. Node = ORIGIN (lời HS, serif) +
// statusHistory + comments (gộp & sắp tăng theo lib/spine.buildSpine). Dot straddle đường spine;
// màu dot theo VAI TRÒ (STATUS_TONE cho status; ink cho comment/origin — signal HIẾM). Node status có
// note "nở" ra (disclosure, ease-emerge). Comment NỘI BỘ = khảm bg-sunken + tag mono "NỘI BỘ" (chỉ
// render nếu server trả → STUDENT thấy 0 node nội bộ). Motion gate prefers-reduced-motion (null→reduced).
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SignalDot, type SignalTone } from "@/components/ui/SignalDot";
import { STATUS_TONE } from "@/components/ui/status-theme";
import { STATUS_LABEL, formatDateTime } from "@/lib/case-display";
import { buildSpine, type SpineNode } from "@/lib/spine";
import { cn } from "@/lib/cn";
import type { CaseDetail } from "@/lib/api-types";

const EMERGE = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

export function Spine({ detail }: { detail: CaseDetail }) {
  const nodes = buildSpine(detail);
  const reduced = useReducedMotion() ?? true;
  return (
    <ol className="border-line-2 relative ml-1.5 flex flex-col border-l">
      {nodes.map((node, i) => (
        <SpineNodeItem key={node.id} node={node} index={i} reduced={reduced} />
      ))}
    </ol>
  );
}

function SpineNodeItem({
  node,
  index,
  reduced,
}: {
  node: SpineNode;
  index: number;
  reduced: boolean;
}) {
  const tone: SignalTone = node.kind === "status" ? STATUS_TONE[node.to] : "running";
  const meta = (name: string, createdAt: string) => (
    <div className="text-ink-3 flex flex-wrap items-center gap-2 font-mono text-[11px]">
      {node.kind === "comment" && node.isInternal && (
        <span className="text-ink-2 tracking-[0.18em] uppercase">Nội bộ</span>
      )}
      <span>{name}</span>
      <span aria-hidden>·</span>
      <time dateTime={createdAt}>{formatDateTime(createdAt)}</time>
    </div>
  );

  return (
    <motion.li
      className="relative pb-7 pl-6 last:pb-0"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ ...EMERGE, delay: Math.min(index * 0.04, 0.4) }}
    >
      <span className="absolute top-1 -left-[3px]">
        <SignalDot tone={tone} size="sm" />
      </span>

      {node.kind === "origin" && (
        <div className="flex flex-col gap-1.5">
          {meta(node.author.name, node.createdAt)}
          <p className="text-ink font-serif text-lg leading-relaxed whitespace-pre-wrap">
            {node.body}
          </p>
        </div>
      )}

      {node.kind === "status" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-ink-2 text-sm">
            Chuyển sang{" "}
            <span className="text-ink font-medium">“{STATUS_LABEL[node.to]}”</span>
          </p>
          {meta(node.by.name, node.createdAt)}
          {node.note && <NoteDisclosure note={node.note} reduced={reduced} />}
        </div>
      )}

      {node.kind === "comment" && (
        <div className={cn("flex flex-col gap-1.5", node.isInternal && "bg-sunken rounded-md p-3")}>
          {meta(node.author.name, node.createdAt)}
          <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">{node.body}</p>
        </div>
      )}
    </motion.li>
  );
}

// "nở" — note của status-change ẩn sau disclosure; mở ra emerge (height/opacity, ease-out, no bounce).
function NoteDisclosure({ note, reduced }: { note: string; reduced: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-ink-3 hover:text-ink text-xs underline-offset-4 transition-colors duration-150 ease-quiet hover:underline"
      >
        {open ? "Ẩn ghi chú" : "Xem ghi chú"}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            className="text-ink-2 bg-sunken mt-2 overflow-hidden rounded-md p-3 text-sm leading-relaxed whitespace-pre-wrap"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={reduced ? undefined : { opacity: 1, height: "auto" }}
            exit={reduced ? undefined : { opacity: 0, height: 0 }}
            transition={EMERGE}
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
