import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Notice {
  id: number;
  title: string;
  content: string;
  type: "info" | "warning";
}

export interface Honor {
  id: number;
  name: string;
  achievement: string;
  badge: string;
}

export interface AcademicItem {
  id: number;
  title: string;
  detail: string;
  type: "resource" | "exam" | "event"; // ĐÃ ĐỔI THÀNH EVENT NGUYÊN BẢN
}

interface SchoolState {
  notices: Notice[];
  honors: Honor[];
  academicItems: AcademicItem[];
  addNotice: (title: string, content: string, type: "info" | "warning") => void;
  removeNotice: (id: number) => void;
  addHonor: (name: string, achievement: string, badge: string) => void;
  removeHonor: (id: number) => void;
  addAcademicItem: (title: string, detail: string, type: "resource" | "exam" | "event") => void;
  removeAcademicItem: (id: number) => void;
}

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set) => ({
      notices: [],
      honors: [],
      academicItems: [],

      addNotice: (title, content, type) => set((state) => ({
        notices: [{ id: Date.now(), title, content, type }, ...state.notices]
      })),
      removeNotice: (id) => set((state) => ({
        notices: state.notices.filter(n => n.id !== id)
      })),

      addHonor: (name, achievement, badge) => set((state) => ({
        honors: [{ id: Date.now(), name, achievement, badge }, ...state.honors]
      })),
      removeHonor: (id) => set((state) => ({
        honors: state.honors.filter(h => h.id !== id)
      })),

      addAcademicItem: (title, detail, type) => set((state) => ({
        academicItems: [{ id: Date.now(), title, detail, type }, ...state.academicItems]
      })),
      removeAcademicItem: (id) => set((state) => ({
        academicItems: state.academicItems.filter(item => item.id !== id)
      })),
    }),
    { name: "school-os-management" }
  )
);