"use client";

// Vote up/down trên case. Hiển thị upCount/downCount/score. Nút up/down:
//   - Bấm cùng value đang vote → bỏ (DELETE).
//   - Bấm value khác → đổi (PUT).
//   - AUDITOR/anon → không render nút (server cũng 403).
// Warm DNA: token-only, không hex, tabular-nums, không canvas.
import { usePermissionView } from "@/hooks/usePermissionView";
import { useVoteCase } from "@/hooks/useVoteCase";
import { cn } from "@/lib/cn";

interface CaseVoteProps {
  caseId: string;
  upCount: number;
  downCount: number;
  score: number;
  myVote: 1 | -1 | null;
  compact?: boolean;
}

export function CaseVote({ caseId, upCount, downCount, score, myVote, compact = false }: CaseVoteProps) {
  const { can } = usePermissionView();
  const { vote, isPending } = useVoteCase(caseId);
  const canVote = can("case:vote");

  if (compact) {
    return (
      <span
        data-testid="case-vote"
        className="text-ink-3 inline-flex items-center gap-1 font-mono text-[11px] tabular-nums"
      >
        <span className="text-[10px]">▲</span>
        <span>{score}</span>
      </span>
    );
  }

  return (
    <div data-testid="case-vote" className="flex items-center gap-3">
      {canVote && (
        <button
          type="button"
          aria-label="Vote up"
          aria-pressed={myVote === 1}
          disabled={isPending}
          onClick={() => vote(1, myVote)}
          className={cn(
            "focus-visible:outline-ink inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] tracking-wide transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40",
            myVote === 1
              ? "border-line-2 bg-sunken text-ink"
              : "border-line text-ink-3 hover:text-ink",
          )}
        >
          <span>▲</span>
          <span className="tabular-nums">{upCount}</span>
        </button>
      )}

      <span
        className={cn(
          "font-mono text-sm tabular-nums font-medium",
          score > 0 ? "text-ink" : score < 0 ? "text-ink-3" : "text-ink-2",
        )}
      >
        {score > 0 ? `+${score}` : score}
      </span>

      {canVote && (
        <button
          type="button"
          aria-label="Vote down"
          aria-pressed={myVote === -1}
          disabled={isPending}
          onClick={() => vote(-1, myVote)}
          className={cn(
            "focus-visible:outline-ink inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] tracking-wide transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40",
            myVote === -1
              ? "border-line-2 bg-sunken text-ink"
              : "border-line text-ink-3 hover:text-ink",
          )}
        >
          <span>▼</span>
          <span className="tabular-nums">{downCount}</span>
        </button>
      )}

      {!canVote && (
        <span className="text-ink-3 font-mono text-[11px] tabular-nums">
          ▲{upCount} · ▼{downCount}
        </span>
      )}
    </div>
  );
}
