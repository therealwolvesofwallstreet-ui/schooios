import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  CaseListItem,
  CaseDetail,
  CasesListResponse,
  CaseResponse,
  CommentDTO,
  CommentResponse,
  CasePriority,
  CaseStatus,
} from "@/lib/api-types";

// Store nối API THẬT: KHÔNG localStorage, KHÔNG client-gen id (dùng caseCode từ response),
// KHÔNG status tiếng Việt ở tầng dữ liệu. Notification/Audit do BACKEND ghi (không bắn ở client).
// Optimistic-lock theo updatedAt là VIỆC CỦA SERVER — client chỉ tải lại + thử lại khi gặp 409.

export interface CreateCaseInput {
  title: string;
  description: string;
  categoryId: string;
  locationId?: string;
  priority?: CasePriority;
  emergency?: boolean; // = studentFlaggedEmergency (HS bấm lúc tạo)
  sensitive?: boolean; // checkbox "ẩn danh" → isSensitive (TODO: ẩn danh thật cần schema)
}

export interface ListParams {
  status?: CaseStatus;
  isEmergency?: boolean;
  page?: number;
  limit?: number;
}

interface ReportState {
  cases: CaseListItem[];
  total: number;
  listLoading: boolean;
  current: CaseDetail | null;
  detailLoading: boolean;

  fetchList: (params?: ListParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<CaseDetail | null>;
  createCase: (input: CreateCaseInput) => Promise<CaseListItem>;
  changeStatus: (id: string, status: CaseStatus, reason?: string) => Promise<void>;
  assign: (id: string, assignedToId: string) => Promise<void>;
  setEmergency: (id: string, isEmergency: boolean, reason?: string) => Promise<void>;
  addComment: (id: string, body: string, isInternal?: boolean) => Promise<CommentDTO>;
}

function buildQuery(params?: ListParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.isEmergency !== undefined) sp.set("isEmergency", String(params.isEmergency));
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const useReportStore = create<ReportState>((set, get) => ({
  cases: [],
  total: 0,
  listLoading: false,
  current: null,
  detailLoading: false,

  fetchList: async (params) => {
    set({ listLoading: true });
    try {
      const data = await api.get<CasesListResponse>(`/api/cases${buildQuery(params)}`);
      set({ cases: data.cases, total: data.total, listLoading: false });
    } catch (e) {
      set({ listLoading: false });
      throw e;
    }
  },

  fetchDetail: async (id) => {
    set({ detailLoading: true });
    try {
      const { case: c } = await api.get<{ case: CaseDetail }>(`/api/cases/${id}`);
      set({ current: c, detailLoading: false });
      return c;
    } catch (e) {
      set({ current: null, detailLoading: false });
      throw e;
    }
  },

  createCase: async (input) => {
    const { case: c } = await api.post<CaseResponse>("/api/cases", input);
    return c as CaseListItem;
  },

  // Mutations: gọi PATCH rồi tải lại detail (lấy status/history/updatedAt mới). Lỗi → ném cho page xử lý.
  changeStatus: async (id, status, reason) => {
    await api.patch(`/api/cases/${id}/status`, reason ? { status, reason } : { status });
    await get().fetchDetail(id);
  },

  assign: async (id, assignedToId) => {
    await api.patch(`/api/cases/${id}/assign`, { assignedToId });
    await get().fetchDetail(id);
  },

  setEmergency: async (id, isEmergency, reason) => {
    await api.patch(
      `/api/cases/${id}/emergency`,
      reason ? { isEmergency, reason } : { isEmergency },
    );
    await get().fetchDetail(id);
  },

  addComment: async (id, body, isInternal) => {
    const { comment } = await api.post<CommentResponse>(`/api/cases/${id}/comments`, {
      body,
      ...(isInternal ? { isInternal: true } : {}),
    });
    // Gắn ngay vào detail hiện tại (parity với GET) thay vì refetch.
    set((s) =>
      s.current && s.current.id === id
        ? { current: { ...s.current, comments: [...s.current.comments, comment] } }
        : {},
    );
    return comment;
  },
}));
