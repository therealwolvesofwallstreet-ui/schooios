"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PollOption {
  id: string;
  text: string;
  voters: string[];
}

// 🛠️ ĐỊNH NGHĨA KHUÔN MẪU BÌNH LUẬN CHUẨN TYPESCRIPT
export interface CommentItem {
  id: number;
  text: string;
  sender: string;
  date: string;
  isInternal: boolean; // true: ghi chú nội bộ BGH, false: trao đổi công khai 1-1
}

export interface CommunityItem {
  id: number;
  type: "feed" | "mailbox" | "poll"; 
  content: string; 
  title?: string; 
  author: string;
  date: string;
  category?: string;
  upvotes: string[];   
  downvotes: string[]; 
  imageUrl?: string | null; 
  options?: PollOption[]; 
  status?: "pending" | "approved" | "rejected";
  comments?: CommentItem[]; // 🛠️ KIẾM SOÁT LÕI: Tích hợp mảng bình luận vào đây
}

interface CommunityState {
  items: CommunityItem[];
  addFeedPost: (content: string, imageUrl: string | null, author: string, initialStatus: "pending" | "approved") => void; 
  addMailbox: (title: string, content: string, category: string, author: string) => void; 
  addPoll: (question: string, options: string[], author: string) => void;
  toggleUpvote: (id: number, userEmail: string) => void;   
  toggleDownvote: (id: number, userEmail: string) => void; 
  votePoll: (id: number, optionId: string, userEmail: string) => void;
  updateFeedStatus: (id: number, status: "pending" | "approved" | "rejected") => void;
  addComment: (itemId: number, text: string, sender: string, isInternal: boolean) => void; // 🛠️ HÀM THÊM BÌNH LUẬN MỚI
  deleteItem: (id: number) => void; 
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set) => ({
      items: [],

      addFeedPost: (content, imageUrl, author, initialStatus) => set((state) => ({
        items: [{ id: Date.now(), type: "feed", content, imageUrl, author, date: new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }), upvotes: [], downvotes: [], status: initialStatus }, ...state.items]
      })),

      addMailbox: (title, content, category, author) => set((state) => ({
        items: [{ 
          id: Date.now(), 
          type: "mailbox", 
          title, 
          content, 
          category, 
          author, 
          date: new Date().toLocaleString("vi-VN"), 
          upvotes: [], 
          downvotes: [],
          comments: [] // Khởi tạo mảng bình luận trống rỗng
        }, ...state.items]
      })),

      addPoll: (question, options, author) => set((state) => {
        const pollOptions: PollOption[] = options.map((opt, idx) => ({ id: `opt-${idx}`, text: opt, voters: [] }));
        return { items: [{ id: Date.now(), type: "poll", content: question, options: pollOptions, author, date: new Date().toLocaleString("vi-VN"), upvotes: [], downvotes: [] }, ...state.items] };
      }),

      // 🛠️ HÀM THÊM BÌNH LUẬN/GHI CHÚ VÀO SỰ VỤ
      addComment: (itemId, text, sender, isInternal) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === itemId) {
            const currentComments = item.comments || [];
            const newComment: CommentItem = {
              id: Date.now(),
              text,
              sender,
              date: new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }),
              isInternal
            };
            return { ...item, comments: [...currentComments, newComment] };
          }
          return item;
        })
      })),

      updateFeedStatus: (id, status) => set((state) => ({
        items: state.items.map((item) => item.id === id && item.type === "feed" ? { ...item, status } : item)
      })),

      toggleUpvote: (id, userEmail) => set((state) => ({
        items: state.items.map((item) => item.id === id && item.type === "feed" ? { ...item, upvotes: item.upvotes.includes(userEmail) ? item.upvotes.filter((e) => e !== userEmail) : [...item.upvotes, userEmail], downvotes: item.downvotes.filter((e) => e !== userEmail) } : item)
      })),

      toggleDownvote: (id, userEmail) => set((state) => ({
        items: state.items.map((item) => item.id === id && item.type === "feed" ? { ...item, downvotes: item.downvotes.includes(userEmail) ? item.downvotes.filter((e) => e !== userEmail) : [...item.downvotes, userEmail], upvotes: item.upvotes.filter((e) => e !== userEmail) } : item)
      })),

      votePoll: (id, optionId, userEmail) => set((state) => ({
        items: state.items.map((item) => item.id === id && item.type === "poll" && item.options ? { ...item, options: item.options.map(opt => ({ ...opt, voters: opt.voters.filter(email => email !== userEmail) })).map(opt => opt.id === optionId ? { ...opt, voters: [...opt.voters, userEmail] } : opt) } : item)
      })),

      deleteItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
    }),
    { name: "school-os-community" }
  )
);