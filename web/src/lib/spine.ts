// THE SPINE — gộp dòng đời case thành 1 timeline DỌC. Pure (không React) để unit-test dễ.
// Node = ORIGIN (lời học sinh = case.description) + statusHistory[] + comments[].
// Sắp TĂNG theo createdAt, tiebreaker `id` (server sort (createdAt desc, id desc) cho list; ở đây
// hiển thị tăng dần theo thời gian — tie `created_at` từ createMany cần `id` để TẤT ĐỊNH, không nhảy).
// KHÔNG lọc internal ở đây: server đã lọc cho STUDENT → FE chỉ render đúng cái server trả.
import type { CaseDetail, CaseStatus, UserRef } from "@/lib/api-types";

export type SpineNode =
  | { kind: "origin"; id: string; createdAt: string; body: string; author: UserRef }
  | {
      kind: "status";
      id: string;
      createdAt: string;
      from: CaseStatus | null;
      to: CaseStatus;
      note: string | null;
      by: UserRef;
    }
  | {
      kind: "comment";
      id: string;
      createdAt: string;
      body: string;
      isInternal: boolean;
      author: UserRef;
    };

// ISO string so sánh từ vựng = đúng thứ tự thời gian (cùng format server). Tie createdAt → so id.
function chrono(
  a: { createdAt: string; id: string },
  b: { createdAt: string; id: string },
): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function buildSpine(detail: CaseDetail): SpineNode[] {
  const events: SpineNode[] = [
    ...detail.statusHistory.map(
      (s): SpineNode => ({
        kind: "status",
        id: s.id,
        createdAt: s.createdAt,
        from: s.fromStatus,
        to: s.toStatus,
        note: s.note,
        by: s.changedBy,
      }),
    ),
    ...detail.comments.map(
      (c): SpineNode => ({
        kind: "comment",
        id: c.id,
        createdAt: c.createdAt,
        body: c.body,
        isInternal: c.isInternal,
        author: c.author,
      }),
    ),
  ];
  events.sort(chrono);

  // ORIGIN luôn đứng ĐẦU (lời học sinh lúc tạo case) — prepend, không tham gia sort để không bị
  // status NEW cùng createdAt chen lên trên do tiebreaker id.
  const origin: SpineNode = {
    kind: "origin",
    id: `origin-${detail.id}`,
    createdAt: detail.createdAt,
    body: detail.description,
    author: detail.createdBy,
  };
  return [origin, ...events];
}
