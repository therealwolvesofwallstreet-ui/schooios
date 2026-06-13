// Helper dùng chung cho Feed Broadcast (Posts/Polls — Update B). Tách shaping + enrich aggregate
// khỏi route để: (1) tránh N+1 (1 groupBy + 1 findMany cho CẢ trang, MERGE trong code), (2) một
// nguồn sự thật cho shape `{upvoteCount,myUpvoted}` (post) và `{count,percent,myOptionId,isClosed}` (poll).
// author chỉ phơi {id,name,role} (0 PII). KHÔNG lộ danh tính người upvote/bình chọn — chỉ aggregate.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// ───────────────────────────── Posts ─────────────────────────────
export const postSelect = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} as const;

type PostRow = Prisma.PostGetPayload<{ select: typeof postSelect }>;
export type PostDTO = PostRow & { upvoteCount: number; myUpvoted: boolean };

// Bồi upvoteCount (groupBy) + myUpvoted (PostVote của tôi) cho CẢ trang trong 2 query (KHÔNG N+1).
export async function enrichPosts(posts: PostRow[], userId: string): Promise<PostDTO[]> {
  const ids = posts.map((p) => p.id);
  if (ids.length === 0) return [];
  const [grouped, mine] = await Promise.all([
    prisma.postVote.groupBy({
      by: ["postId"],
      where: { postId: { in: ids } },
      _count: { postId: true },
    }),
    prisma.postVote.findMany({
      where: { userId, postId: { in: ids } },
      select: { postId: true },
    }),
  ]);
  const countMap = new Map(grouped.map((g) => [g.postId, g._count.postId]));
  const mineSet = new Set(mine.map((m) => m.postId));
  return posts.map((p) => ({
    ...p,
    upvoteCount: countMap.get(p.id) ?? 0,
    myUpvoted: mineSet.has(p.id),
  }));
}

// ───────────────────────────── Polls ─────────────────────────────
export const pollSelect = {
  id: true,
  question: true,
  closesAt: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
  options: { select: { id: true, text: true, order: true }, orderBy: { order: "asc" } },
} as const;

type PollRow = Prisma.PollGetPayload<{ select: typeof pollSelect }>;
type VoteGroup = { optionId: string; _count: { optionId: number } };

export type PollOptionDTO = { id: string; text: string; order: number; count: number; percent: number };
export type PollDTO = {
  id: string;
  question: string;
  closesAt: Date | null;
  isClosed: boolean;
  createdAt: Date;
  author: PollRow["author"];
  totalVotes: number;
  options: PollOptionDTO[];
  myOptionId: string | null;
};

// Shape 1 poll từ row + vote-groups (đã lọc theo poll) + lựa-chọn-của-tôi. percent an toàn chia-0
// (totalVotes=0 → 0%); làm tròn từng option (tổng có thể ≠100 — chấp nhận cho hiển thị %).
export function shapePoll(
  poll: PollRow,
  voteGroups: VoteGroup[],
  myOptionId: string | null,
): PollDTO {
  const countByOption = new Map(voteGroups.map((g) => [g.optionId, g._count.optionId]));
  const totalVotes = voteGroups.reduce((sum, g) => sum + g._count.optionId, 0);
  const options: PollOptionDTO[] = poll.options.map((o) => {
    const count = countByOption.get(o.id) ?? 0;
    return {
      id: o.id,
      text: o.text,
      order: o.order,
      count,
      percent: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
    };
  });
  const isClosed = poll.closesAt != null && poll.closesAt.getTime() < Date.now();
  return {
    id: poll.id,
    question: poll.question,
    closesAt: poll.closesAt,
    isClosed,
    createdAt: poll.createdAt,
    author: poll.author,
    totalVotes,
    options,
    myOptionId,
  };
}

// Bồi count/percent/myOptionId cho CẢ trang poll trong 2 query (KHÔNG N+1).
export async function enrichPolls(polls: PollRow[], userId: string): Promise<PollDTO[]> {
  const ids = polls.map((p) => p.id);
  if (ids.length === 0) return [];
  const [grouped, mine] = await Promise.all([
    prisma.pollVote.groupBy({
      by: ["pollId", "optionId"],
      where: { pollId: { in: ids } },
      _count: { optionId: true },
    }),
    prisma.pollVote.findMany({
      where: { userId, pollId: { in: ids } },
      select: { pollId: true, optionId: true },
    }),
  ]);
  const myByPoll = new Map(mine.map((m) => [m.pollId, m.optionId]));
  return polls.map((p) =>
    shapePoll(
      p,
      grouped.filter((g) => g.pollId === p.id).map((g) => ({ optionId: g.optionId, _count: g._count })),
      myByPoll.get(p.id) ?? null,
    ),
  );
}

// Bồi 1 poll (response sau vote/create) — tái dùng enrichPolls.
export async function enrichOnePoll(poll: PollRow, userId: string): Promise<PollDTO> {
  const [shaped] = await enrichPolls([poll], userId);
  return shaped!;
}
