// Toast queue (Zustand) — KHÔNG dùng react-hot-toast. Render bởi components/ui/Toast.tsx.
// Giọng: info (ink) · success (gold) · error (signal). Tự-dismiss do component lo.
import { create } from "zustand";

export type ToastTone = "info" | "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastTone) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

// id tăng dần (không cần random/Date — toast chỉ sinh client-side khi user thao tác).
let seq = 0;

export const useToastQueue = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "info") => {
    const id = `toast-${++seq}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
