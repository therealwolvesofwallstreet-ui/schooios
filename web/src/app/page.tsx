"use client"; 

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  AlertTriangle, ChevronRight, Plus, BookOpen, HelpCircle, 
  Clock, CheckCircle2, MessageCircle, FileText 
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState(""); 
  const [reports, setReports] = useState([]); 

  return (
    <>
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <h2 className="text-[22px] font-bold text-slate-800">
          Xin chào{userName ? `, ${userName}` : " bạn"}! 👋
        </h2>
        <p className="text-gray-500 text-[14px] mt-1">Chúng tôi luôn sẵn sàng hỗ trợ bạn.</p>
      </section>

      <section className="mb-8">
        <button 
          onClick={() => alert("Đang gọi bộ phận hỗ trợ khẩn cấp...")}
          className="w-full bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-all text-left"
        >
          <div className="bg-red-500 p-2.5 rounded-full shadow-sm shrink-0">
            <AlertTriangle className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-600 text-[15px]">KHẨN CẤP</h3>
            <p className="text-slate-600 text-[12px] mt-0.5">Bấm ngay khi bạn cần trợ giúp khẩn cấp</p>
          </div>
          <ChevronRight className="text-red-400 shrink-0" size={20} />
        </button>
      </section>

      <section className="mb-8">
        <h3 className="font-bold text-[16px] text-slate-800 mb-4">Tổng quan của tôi</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-2"><FileText size={16} /></div>
            <div>
              <span className="text-[22px] font-bold text-slate-800 block leading-none">0</span>
              <span className="text-[11px] text-slate-600 font-medium block mt-1">Tổng báo cáo</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-2"><Clock size={16} /></div>
            <div>
              <span className="text-[22px] font-bold text-slate-800 block leading-none">0</span>
              <span className="text-[11px] text-slate-600 font-medium block mt-1">Đang xử lý</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-2"><CheckCircle2 size={16} /></div>
            <div>
              <span className="text-[22px] font-bold text-slate-800 block leading-none">0</span>
              <span className="text-[11px] text-slate-600 font-medium block mt-1">Đã giải quyết</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 mb-2"><MessageCircle size={16} /></div>
            <div>
              <span className="text-[22px] font-bold text-slate-800 block leading-none">0</span>
              <span className="text-[11px] text-slate-600 font-medium block mt-1">Cần phản hồi</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="font-bold text-[16px] text-slate-800 mb-4">Báo cáo của tôi</h3>
        
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center mb-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <FileText className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-500 text-[14px] font-medium">Bạn chưa có báo cáo nào.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          </div>
        )}

        <button 
          onClick={() => router.push("/report/new")}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 text-[15px] shadow-md transition-all"
        >
          <Plus size={20} />
          Tạo báo cáo mới
        </button>
      </section>
    </>
  );
}