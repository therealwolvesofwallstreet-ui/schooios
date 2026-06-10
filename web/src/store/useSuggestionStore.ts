import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Suggestion {
  id: number;
  type: "public" | "private" | "poll"; // Phân loại: Công khai | Gửi BGH | Khảo sát
  title: string;
  description: string;
  author: string;
  date: string;
  category: string;
  votes: number;
  votedBy: string[];
  commentsCount: number;
}

interface SuggestionState {
  suggestions: Suggestion[];
  addSuggestion: (suggestion: Omit<Suggestion, "id" | "date" | "votes" | "votedBy" | "commentsCount">) => void;
  toggleVote: (id: number, userEmail: string) => void;
}

export const useSuggestionStore = create<SuggestionState>()(
  persist(
    (set) => ({
      suggestions: [],

      addSuggestion: (newSug) =>
        set((state) => {
          const fullSug: Suggestion = {
            ...newSug,
            id: Date.now(),
            date: new Date().toLocaleString("vi-VN", {
              hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
            }),
            // Nếu là gửi riêng cho BGH thì không tính vote, còn lại mặc định tự vote cho bài của mình
            votes: newSug.type === "private" ? 0 : 1, 
            votedBy: newSug.type === "private" ? [] : [newSug.author],
            commentsCount: 0,
          };
          return { suggestions: [fullSug, ...state.suggestions] };
        }),

      toggleVote: (id, userEmail) =>
        set((state) => ({
          suggestions: state.suggestions.map((s) => {
            if (s.id === id && s.type !== "private") { // Không cho vote thư ẩn danh
              const hasVoted = s.votedBy.includes(userEmail);
              return {
                ...s,
                votes: hasVoted ? s.votes - 1 : s.votes + 1,
                votedBy: hasVoted
                  ? s.votedBy.filter((email) => email !== userEmail)
                  : [...s.votedBy, userEmail],
              };
            }
            return s;
          }),
        })),
    }),
    { name: "school-os-suggestions" }
  )
);