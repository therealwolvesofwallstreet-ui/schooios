import { create } from "zustand";
import { api } from "@/lib/api";
import type { AuditLogDTO, AuditResponse } from "@/lib/api-types";

// Nối API thật: GET /api/audit (ADMIN/AUDITOR only). KHÔNG mock, KHÔNG localStorage.
interface AuditState {
  logs: AuditLogDTO[];
  total: number;
  loading: boolean;
  fetchAudit: (page?: number, limit?: number) => Promise<void>;
}

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  total: 0,
  loading: false,

  fetchAudit: async (page = 1, limit = 50) => {
    set({ loading: true });
    try {
      const data = await api.get<AuditResponse>(`/api/audit?page=${page}&limit=${limit}`);
      set({ logs: data.logs, total: data.total, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
