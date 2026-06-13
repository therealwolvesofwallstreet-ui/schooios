"use client";

// Hooks cho Feed Broadcast (Posts/Polls — Update B). List = useQuery (server-driven pagination,
// staleTime:0 = server-truth mỗi mount, mẫu useCaseList). Mutation = useOptimisticMutation (hợp đồng
// lỗi: 400 cho form, 403/404/500 toast, 409/429/503 theo Retry-After). create=retry:false (POST
// non-idempotent); upvote/vote KHÔNG invalidate list (card tự cập nhật từ response → tránh refetch
// nhấp nháy); create/delete invalidate prefix ['posts']/['polls'] (đổi cấu trúc danh sách).
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import type {
  PostsResponse,
  PollsResponse,
  PostResponse,
  PollResponse,
  UpvoteResponse,
  DeletedResponse,
} from "@/lib/api-types";

export const BROADCAST_PAGE_SIZE = 5;

export function usePosts(page: number, limit = BROADCAST_PAGE_SIZE) {
  const q = useQuery({
    queryKey: ["posts", "list", page, limit] as const,
    queryFn: () => api.get<PostsResponse>(`/api/posts?page=${page}&limit=${limit}`),
    staleTime: 0,
  });
  return {
    posts: q.data?.posts ?? [],
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}

export function usePolls(page: number, limit = BROADCAST_PAGE_SIZE) {
  const q = useQuery({
    queryKey: ["polls", "list", page, limit] as const,
    queryFn: () => api.get<PollsResponse>(`/api/polls?page=${page}&limit=${limit}`),
    staleTime: 0,
  });
  return {
    polls: q.data?.polls ?? [],
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}

// Upvote toggle (liked=true → POST thích, false → DELETE bỏ). Idempotent → giữ retry mặc định.
// KHÔNG invalidate: PostCard cập nhật count/myUpvoted từ response (optimistic + reconcile).
export function useUpvotePost() {
  return useOptimisticMutation<UpvoteResponse, { postId: string; liked: boolean }>({
    mutationFn: ({ postId, liked }) =>
      liked
        ? api.post<UpvoteResponse>(`/api/posts/${postId}/upvote`)
        : api.del<UpvoteResponse>(`/api/posts/${postId}/upvote`),
  });
}

export function useCreatePost() {
  return useOptimisticMutation<PostResponse, { body: string }>({
    mutationFn: (vars) => api.post<PostResponse>("/api/posts", vars),
    invalidateKeys: [["posts"]],
    successMessage: "Đã đăng thông báo.",
    retry: false, // POST create non-idempotent — không retry trên 503 (tránh bản trùng)
  });
}

export function useDeletePost() {
  return useOptimisticMutation<DeletedResponse, { postId: string }>({
    mutationFn: ({ postId }) => api.del<DeletedResponse>(`/api/posts/${postId}`),
    invalidateKeys: [["posts"]],
    successMessage: "Đã xoá thông báo.",
  });
}

// Vote/đổi lựa chọn (upsert). KHÔNG invalidate: PollCard cập nhật từ poll trong response.
export function useVotePoll() {
  return useOptimisticMutation<PollResponse, { pollId: string; optionId: string }>({
    mutationFn: ({ pollId, optionId }) =>
      api.post<PollResponse>(`/api/polls/${pollId}/vote`, { optionId }),
  });
}

export function useCreatePoll() {
  return useOptimisticMutation<
    PollResponse,
    { question: string; options: string[]; closesAt?: string }
  >({
    mutationFn: (vars) => api.post<PollResponse>("/api/polls", vars),
    invalidateKeys: [["polls"]],
    successMessage: "Đã tạo bình chọn.",
    retry: false,
  });
}

export function useDeletePoll() {
  return useOptimisticMutation<DeletedResponse, { pollId: string }>({
    mutationFn: ({ pollId }) => api.del<DeletedResponse>(`/api/polls/${pollId}`),
    invalidateKeys: [["polls"]],
    successMessage: "Đã xoá bình chọn.",
  });
}
