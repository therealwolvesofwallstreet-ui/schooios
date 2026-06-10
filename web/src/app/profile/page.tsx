"use client";

import { User, LogOut, Settings, ShieldCheck, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfilePage() {
  const { userEmail } = useAuthStore();

  const handleProfileLogout = () => {
    // Ép kiểu an toàn chuẩn TypeScript để không bị bắt bẻ lỗi 'any'
    if (typeof window !== "undefined") {
      const safeWindow = window as typeof window & { triggerLogoutModal?: () => void };
      if (safeWindow.triggerLogoutModal) {
        safeWindow.triggerLogoutModal();
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Tài khoản</h2>

      {/* KHỐI THÔNG TIN CÁ NHÂN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-3xl font-bold shrink-0">
          K
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">{userEmail || "dnnkhai"}</h3>
          <p className="text-slate-500 text-sm mt-0.5">Học sinh • ID: 2026001</p>
          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-semibold mt-3 border border-green-200">
            <ShieldCheck size={14} /> Đã xác thực
          </span>
        </div>
      </div>

      {/* DANH SÁCH CHỨC NĂNG */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><User size={18} /></div>
            <span className="font-semibold text-sm text-slate-800">Cập nhật thông tin</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Settings size={18} /></div>
            <span className="font-semibold text-sm text-slate-800">Cài đặt hệ thống</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {/* NÚT ĐĂNG XUẤT */}
        <button 
          onClick={handleProfileLogout}
          className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-red-50 group-hover:bg-red-100 p-2 rounded-lg text-red-600 transition-colors"><LogOut size={18} /></div>
            <span className="font-semibold text-sm text-red-600">Đăng xuất tài khoản</span>
          </div>
        </button>
      </div>
    </div>
  );
}