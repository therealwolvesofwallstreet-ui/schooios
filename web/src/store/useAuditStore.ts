import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  actor: string;
  timestamp: string;
}

interface AuditState {
  logs: AuditLog[];
  addLog: (action: string, details: string, actor: string) => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (action, details, actor) =>
        set((state) => ({
          logs: [
            {
              id: "log-" + Date.now(),
              action,
              details,
              actor,
              timestamp: new Date().toLocaleString("vi-VN", {
                hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
              }),
            },
            ...state.logs,
          ],
        })),
    }),
    { name: "school-os-audit" }
  )
);