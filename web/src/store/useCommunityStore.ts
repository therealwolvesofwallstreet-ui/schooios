import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Comment {
  id: number;
  author: string;
  text: string;
  date: string;
}

export interface PollOption {
  id: string;
  text: string;
  voters: string[];
}

export interface CommunityItem {
  id: number;
  type: "feed" | "mailbox" | "poll";
  content: string; 
  title?: string; 
  author: string;
  date: string;
  category?: string;
  likes: string[]; 
  imageUrl?: string | null; 
  comments: Comment[];      
  options?: PollOption[]; 
}

interface CommunityState {
  items: CommunityItem[];
  addFeedPost: (content: string, imageUrl: string | null, author: string) => void;
  addFeedComment: (postId: number, text: string, author: string) => void; 
  addMailbox: (title: string, content: string, category: string, author: string) => void;
  addPoll: (question: string, options: string[], author: string) => void;
  toggleLike: (id: number, userEmail: string) => void;
  votePoll: (id: number, optionId: string, userEmail: string) => void;
  deleteItem: (id: number) => void; // <--- HÀM QUẢN TRỊ VIÊN ĐỂ XÓA BÀI
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set) => ({
      items: [],

      addFeedPost: (content, imageUrl, author) => set((state) => ({
        items: [{ 
          id: Date.now(), 
          type: "feed", 
          content, 
          imageUrl, 
          author, 
          date: new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }), 
          likes: [],
          comments: [] 
        }, ...state.items]
      })),

      addFeedComment: (postId, text, author) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === postId && item.type === "feed") {
            const newComment: Comment = {
              id: Date.now(),
              author,
              text,
              date: "Vừa xong"
            };
            return { ...item, comments: [...item.comments, newComment] };
          }
          return item;
        })
      })),

      addMailbox: (title, content, category, author) => set((state) => ({
        items: [{ id: Date.now(), type: "mailbox", title, content, category, author, date: new Date().toLocaleString("vi-VN"), likes: [], comments: [] }, ...state.items]
      })),

      addPoll: (question, options, author) => set((state) => {
        const pollOptions: PollOption[] = options.map((opt, idx) => ({ id: `opt-${idx}`, text: opt, voters: [] }));
        return { items: [{ id: Date.now(), type: "poll", content: question, options: pollOptions, author, date: new Date().toLocaleString("vi-VN"), likes: [], comments: [] }, ...state.items] };
      }),

      toggleLike: (id, userEmail) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === id && item.type === "feed") {
            const hasLiked = item.likes.includes(userEmail);
            return { ...item, likes: hasLiked ? item.likes.filter((e) => e !== userEmail) : [...item.likes, userEmail] };
          }
          return item;
        })
      })),

      votePoll: (id, optionId, userEmail) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === id && item.type === "poll" && item.options) {
            const newOptions = item.options.map(opt => ({ ...opt, voters: opt.voters.filter(email => email !== userEmail) }));
            const targetOption = newOptions.find(o => o.id === optionId);
            if (targetOption) targetOption.voters.push(userEmail);
            return { ...item, options: newOptions };
          }
          return item;
        })
      })),

      // THỰC THI QUYỀN LỰC ADMIN: Xóa bài ngay lập tức khỏi mảng dữ liệu
      deleteItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),
    }),
    { name: "school-os-community" }
  )
);