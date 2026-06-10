"use client";

import { useState } from "react";
import { ThumbsUp, MessageSquare, Send, Sparkles, User, Calendar, PlusCircle, Globe, Lock, BarChart2 } from "lucide-react";
import toast from "react-hot-toast";
import { useSuggestionStore } from "@/store/useSuggestionStore";
import { useAuthStore } from "@/store/useAuthStore";

type TabType = "public" | "private" | "poll";

export default function SuggestionsPage() {
  const { suggestions, addSuggestion, toggleVote } = useSuggestionStore();
  const { userEmail, role } = useAuthStore();
  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");

  // State điều khiển Tab và Form
  const [activeTab, setActiveTab] = useState<TabType>("public");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Cơ sở vật chất");

  // LỌC DỮ LIỆU THEO TAB & QUYỀN TRUY CẬP
  const visibleSuggestions = suggestions.filter(s => {
    if (activeTab === "public") return s.type === "public";
    if (activeTab === "poll") return s.type === "poll";
    if (activeTab === "private") {
      // Admin thấy hết thư kín, Học sinh chỉ thấy thư của chính mình gửi
      if (role === "admin") return s.type === "private";
      return s.type === "private" && s.author === currentUserName;
    }
    return false;
  });

  const handleVote = (id: number, hasVoted: boolean) => {
    toggleVote(id, currentUserName);
    if (!hasVoted) toast.success("Đã bình chọn!", { icon: "👍" });
  };

  const handleCreateSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung!");
      return;
    }

    addSuggestion({
      type: activeTab,
      title,
      description,
      author: currentUserName,
      category,
    });

    setTitle("");
    setDescription("");
    
    if (activeTab === "private") toast.success("Đã gửi thư kín cho Ban Giám Hiệu! 🔒");
    else if (activeTab === "poll") toast.success("Đã tạo Khảo sát thành công! 📊");
    else toast.success("Đăng bài đóng góp ý kiến thành công! 🎉");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER & CHUYỂN TAB */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-2xl text-white shadow-md">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Diễn đàn Hiến kế & Bình chọn</h1>
            <p className="text-slate-500 text-xs mt-0.5">Tiếng nói của bạn kiến tạo ngôi trường tương lai</p>
          </div>
        </div>

        {/* NÚT CHUYỂN TABS */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab("public")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "public" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Globe size={16} /> Công khai
          </button>
          <button onClick={() => setActiveTab("private")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "private" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Lock size={16} /> Gửi BGH
          </button>
          <button onClick={() => setActiveTab("poll")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "poll" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <BarChart2 size={16} /> Khảo sát
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* CỘT TRÁI: DANH SÁCH BÀI ĐĂNG */}
        <div className="md:col-span-2 space-y-4">
          {visibleSuggestions.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
              <Sparkles size={40} className="text-slate-300 mb-3" />
              <p className="font-bold text-slate-700 text-lg">Trống trơn!</p>
              <p className="text-slate-500 text-sm mt-1">
                {activeTab === "public" && "Chưa có ý kiến công khai nào. Hãy là người đầu tiên!"}
                {activeTab === "private" && (role === "admin" ? "Chưa có học sinh nào gửi thư kín cho BGH." : "Bạn chưa gửi thư kín nào cho BGH.")}
                {activeTab === "poll" && "Ban Giám Hiệu chưa tạo cuộc khảo sát nào."}
              </p>
            </div>
          ) : (
            visibleSuggestions.map((item) => {
              const hasVoted = item.votedBy.includes(currentUserName);

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 flex gap-4 md:gap-5 transition-all hover:border-slate-300">
                  
                  {/* NÚT VOTE (ẨN ĐI NẾU LÀ THƯ KÍN) */}
                  {activeTab !== "private" && (
                    <div className="flex flex-col items-center justify-start shrink-0">
                      <button 
                        type="button"
                        onClick={() => handleVote(item.id, hasVoted)}
                        className={`w-12 h-16 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-90 ${
                          hasVoted 
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100" 
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        }`}
                      >
                        <ThumbsUp size={16} className={hasVoted ? "fill-white" : ""} />
                        <span className="text-xs font-extrabold">{item.votes}</span>
                      </button>
                    </div>
                  )}

                  {/* NỘI DUNG */}
                  <div className="flex-1 space-y-2.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className={`px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        activeTab === "poll" ? "bg-emerald-100 text-emerald-700" : 
                        activeTab === "private" ? "bg-purple-100 text-purple-700" : 
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {item.category}
                      </span>
                      {activeTab === "private" && <span className="flex items-center gap-1 text-purple-600"><Lock size={12}/> Thư mật</span>}
                    </div>
                    
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><User size={12} /> {item.author}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                      </div>
                      {activeTab !== "private" && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <MessageSquare size={13} /> <span>{item.commentsCount} bình luận</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CỘT PHẢI: FORM ĐĂNG BÀI (THAY ĐỔI THEO TAB) */}
        {/* Nếu là Tab Khảo sát mà không phải Admin thì KHÔNG HIỆN FORM */}
        {(activeTab !== "poll" || role === "admin") && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4 sticky top-4">
            <h3 className={`font-bold flex items-center gap-2 text-sm uppercase tracking-wider border-b border-slate-100 pb-2 ${
              activeTab === "poll" ? "text-emerald-700" : activeTab === "private" ? "text-purple-700" : "text-blue-700"
            }`}>
              <PlusCircle size={16} /> 
              {activeTab === "public" && "Viết ý kiến công khai"}
              {activeTab === "private" && "Gửi thư cho BGH"}
              {activeTab === "poll" && "Tạo cuộc khảo sát"}
            </h3>
            
            <form onSubmit={handleCreateSuggestion} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Tiêu đề *</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={activeTab === "poll" ? "VD: Khảo sát màu đồng phục mới" : "VD: Kiến nghị đổi nhà xe..."}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Danh mục</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs bg-white"
                >
                  <option>Cơ sở vật chất</option>
                  <option>Dịch vụ học đường</option>
                  <option>Hoạt động ngoại khóa</option>
                  <option>Thể thao / Giải trí</option>
                  <option>Khác</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Chi tiết *</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Viết chi tiết nội dung tại đây..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs transition-all resize-none"
                />
              </div>

              <button 
                type="submit" 
                className={`w-full py-2.5 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-[0.98] ${
                  activeTab === "poll" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : 
                  activeTab === "private" ? "bg-purple-600 hover:bg-purple-700 shadow-purple-100" : 
                  "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
                }`}
              >
                <Send size={12} /> 
                {activeTab === "public" && "Đăng công khai"}
                {activeTab === "private" && "Gửi thư bảo mật"}
                {activeTab === "poll" && "Đăng khảo sát"}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}