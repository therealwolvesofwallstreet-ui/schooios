"use client";

import { useState } from "react";
import { BarChart2, PlusCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function PollsPage() {
  const { items, addPoll, votePoll } = useCommunityStore();
  const { userEmail, role } = useAuthStore();
  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]); // Mặc định 2 lựa chọn
  
  const pollItems = items.filter(i => i.type === "poll");

  const handleAddOption = () => setOptions([...options, ""]);
  
  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim() !== "");
    if (!question || validOptions.length < 2) {
      toast.error("Vui lòng nhập câu hỏi và ít nhất 2 lựa chọn!");
      return;
    }
    addPoll(question, validOptions, currentUserName);
    setQuestion(""); setOptions(["", ""]);
    toast.success("Tạo khảo sát thành công!");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl"><BarChart2 size={24} /></div>
        <h1 className="text-2xl font-bold text-slate-900">Bình chọn Khảo sát</h1>
      </div>

      {/* ADMIN MỚI THẤY FORM TẠO POLL */}
      {role === "admin" && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 mb-8">
          <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><PlusCircle size={18}/> Tạo khảo sát mới</h3>
          <form onSubmit={handleCreatePoll} className="space-y-4">
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Đặt câu hỏi bình chọn..." className="w-full border border-slate-200 px-4 py-3 rounded-xl focus:border-emerald-500 outline-none text-sm font-bold" />
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <input key={idx} type="text" value={opt} onChange={(e) => { const newOpts = [...options]; newOpts[idx] = e.target.value; setOptions(newOpts); }} placeholder={`Lựa chọn ${idx + 1}`} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl focus:border-emerald-500 outline-none text-sm" />
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <button type="button" onClick={handleAddOption} className="text-emerald-600 text-sm font-bold hover:bg-emerald-50 px-3 py-1.5 rounded-lg">+ Thêm phương án</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl">Đăng Khảo sát</button>
            </div>
          </form>
        </div>
      )}

      {/* DANH SÁCH KHẢO SÁT (ZALO STYLE) */}
      <div className="space-y-6">
        {pollItems.length === 0 ? (
          <p className="text-center text-slate-400 py-10">Chưa có cuộc khảo sát nào đang diễn ra.</p>
        ) : (
          pollItems.map(poll => {
            // Tính tổng số vote của poll này
            const totalVotes = poll.options?.reduce((sum, opt) => sum + opt.voters.length, 0) || 0;
            
            // Check xem user đã vote phương án nào chưa
            const userVotedOptionId = poll.options?.find(opt => opt.voters.includes(currentUserName))?.id;

            return (
              <div key={poll.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-lg text-slate-900">{poll.content}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2"><span>Tạo bởi {poll.author}</span> • <span>{poll.date}</span></p>
                </div>
                
                <div className="p-5 space-y-3">
                  {poll.options?.map(opt => {
                    const voteCount = opt.voters.length;
                    const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    const isMyVote = userVotedOptionId === opt.id;

                    return (
                      <div 
                        key={opt.id} 
                        onClick={() => votePoll(poll.id, opt.id, currentUserName)}
                        className={`relative group cursor-pointer border rounded-xl p-3 transition-all ${isMyVote ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 hover:border-emerald-300"}`}
                      >
                        {/* Thanh progress bar chạy ngầm */}
                        {totalVotes > 0 && (
                          <div 
                            className={`absolute top-0 left-0 bottom-0 rounded-xl transition-all duration-700 opacity-20 ${isMyVote ? "bg-emerald-500" : "bg-slate-300"}`} 
                            style={{ width: `${percent}%` }}
                          />
                        )}
                        
                        <div className="relative flex justify-between items-center z-10">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isMyVote ? "border-emerald-500" : "border-slate-300"}`}>
                              {isMyVote && <CheckCircle2 size={14} className="text-emerald-500" />}
                            </div>
                            <span className={`font-semibold text-sm ${isMyVote ? "text-emerald-900" : "text-slate-700"}`}>{opt.text}</span>
                          </div>
                          
                          {/* Hiển thị Avatar của những người đã vote (Thu nhỏ) */}
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              {opt.voters.slice(0, 3).map((v, i) => (
                                <div key={i} title={v} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-800">
                                  {v.charAt(0).toUpperCase()}
                                </div>
                              ))}
                            </div>
                            {totalVotes > 0 && <span className="text-xs font-bold text-slate-500 min-w-[32px] text-right">{percent}%</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-slate-400 mt-2 text-right">{totalVotes} lượt bình chọn</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}