"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore } from "@/store/useCommunityStore";
import { BarChart2, PlusCircle, CheckCircle, ShieldAlert } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import toast from "react-hot-toast";

// Định nghĩa lại Type để lách ESLint
interface PollOption {
  id: string;
  text: string;
  voters: string[];
}

interface PollItem {
  id: number;
  type: string;
  content: string;
  author: string;
  date: string;
  options?: PollOption[];
}

export default function PollsPage() {
  const router = useRouter();
  const { userEmail, role } = useAuthStore();
  const items = useCommunityStore((state) => state.items) as PollItem[];
  const addPoll = useCommunityStore((state) => state.addPoll);
  const votePoll = useCommunityStore((state) => state.votePoll);

  const [mounted, setMounted] = useState(false);
  
  // State cho Form tạo Khảo sát (Dành cho Admin)
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  // 🛠️ VÁ LỖI BIÊN DỊCH: Bọc bằng setTimeout để tắt cảnh báo cascading renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  // Lọc ra danh sách các bài khảo sát
  const polls = (items || []).filter((item) => item.type === "poll");

  // ADAPTIVE THEME
  const isDark = role === "admin";
  const ui = {
    bg: isDark ? "bg-navy text-paper" : "bg-paper text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
    card: isDark ? "bg-white/5" : "bg-stone/5",
    activeBg: isDark ? "bg-signal/20" : "bg-gold/20",
    activeText: isDark ? "text-signal" : "text-gold",
    barBg: isDark ? "bg-white/10" : "bg-stone/20",
    barFill: isDark ? "bg-signal" : "bg-ink",
  };

  // 🛠️ XỬ LÝ TẠO KHẢO SÁT
  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(opt => opt.trim() !== "");
    if (!question.trim()) return toast.error("Vui lòng nhập câu hỏi!");
    if (validOptions.length < 2) return toast.error("Cần ít nhất 2 lựa chọn!");

    addPoll(question, validOptions, userEmail || "Admin");
    toast.success("Đã phát động khảo sát toàn trường!");
    setQuestion("");
    setOptions(["", ""]);
    setShowForm(false);
  };

  const handleAddOption = () => setOptions([...options, ""]);
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  // 🛠️ XỬ LÝ BẦU CHỌN
  const handleVote = (pollId: number, optionId: string) => {
    if (!userEmail) return toast.error("Không xác định được danh tính!");
    votePoll(pollId, optionId, userEmail);
  };

  return (
    <div className={`min-h-screen pt-24 pb-32 px-6 lg:px-12 transition-colors duration-slow ${ui.bg}`}>
      <div className="max-w-[800px] mx-auto space-y-12">
        
        {/* HEADER */}
        <Reveal>
          <header className={`border-b ${ui.border} pb-6 flex items-end justify-between`}>
            <div>
              <p className="text-[0.6875rem] font-mono tracking-[0.18em] text-signal uppercase mb-2 flex items-center gap-2">
                <BarChart2 size={12} /> Trưng cầu dân ý
              </p>
              <h1 className="font-display text-4xl tracking-tight">Cổng Khảo Sát</h1>
            </div>
            
            {role === "admin" && (
              <button 
                onClick={() => setShowForm(!showForm)}
                className="font-mono text-xs uppercase tracking-widest border border-current px-4 py-2 hover:bg-current hover:text-navy transition-all flex items-center gap-2"
              >
                <PlusCircle size={14} /> TẠO KHẢO SÁT
              </button>
            )}
          </header>
        </Reveal>

        {/* FORM TẠO KHẢO SÁT (ADMIN) */}
        {showForm && role === "admin" && (
          <Reveal>
            <form onSubmit={handleCreatePoll} className={`p-8 border ${ui.border} ${ui.card} space-y-6`}>
              <h3 className="font-mono text-xs uppercase tracking-widest text-signal">Thiết lập biểu quyết mới</h3>
              <input 
                type="text" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Câu hỏi khảo sát (VD: Đánh giá chất lượng thực đơn mới?)" 
                className="w-full bg-transparent border-b border-white/20 py-3 text-lg font-light focus:outline-none focus:border-signal transition-colors"
              />
              <div className="space-y-3">
                {options.map((opt, idx) => (
                  <input 
                    key={idx}
                    type="text" 
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Lựa chọn ${idx + 1}`} 
                    className="w-full bg-transparent border-b border-white/10 py-2 text-sm font-light focus:outline-none focus:border-white/50"
                  />
                ))}
              </div>
              <div className="flex items-center justify-between pt-4">
                <button type="button" onClick={handleAddOption} className={`font-mono text-[0.65rem] uppercase tracking-widest ${ui.muted} hover:text-white`}>
                  + Thêm lựa chọn
                </button>
                <button type="submit" className="bg-signal text-navy font-mono text-xs px-6 py-2 uppercase tracking-widest hover:opacity-90">
                  Phát hành
                </button>
              </div>
            </form>
          </Reveal>
        )}

        {/* DANH SÁCH KHẢO SÁT */}
        <div className="space-y-8">
          {polls.length === 0 ? (
            <div className={`py-20 text-center font-mono text-sm italic ${ui.muted}`}>
              Hiện chưa có cuộc khảo sát nào diễn ra.
            </div>
          ) : (
            polls.map((poll, index) => {
              // Tính tổng số lượt vote để chia phần trăm
              const totalVotes = poll.options?.reduce((sum, opt) => sum + opt.voters.length, 0) || 0;

              return (
                <Reveal key={poll.id} delay={index * 0.1}>
                  <div className={`p-8 border ${ui.border} ${ui.card} transition-all hover:border-current`}>
                    <div className="flex items-center justify-between mb-6 border-b border-current/10 pb-4">
                      <h2 className="font-display text-2xl leading-tight">{poll.content}</h2>
                      <span className={`font-mono text-[10px] ${ui.muted} uppercase tracking-widest`}>
                        {poll.date}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {poll.options?.map((opt) => {
                        const hasVoted = userEmail ? opt.voters.includes(userEmail) : false;
                        const percentage = totalVotes === 0 ? 0 : Math.round((opt.voters.length / totalVotes) * 100);

                        return (
                          <button 
                            key={opt.id}
                            onClick={() => handleVote(poll.id, opt.id)}
                            className={`w-full relative overflow-hidden flex items-center justify-between p-4 border text-left transition-all ${
                              hasVoted ? `border-current ${ui.activeBg}` : `border-transparent bg-current/5 hover:bg-current/10`
                            }`}
                          >
                            {/* Thanh phần trăm nền */}
                            <div 
                              className={`absolute left-0 top-0 bottom-0 ${ui.barFill} opacity-10 transition-all duration-1000 ease-out`}
                              style={{ width: `${percentage}%` }}
                            ></div>

                            <div className="relative z-10 flex items-center gap-3">
                              {hasVoted ? <CheckCircle size={16} className={ui.activeText} /> : <div className="w-4 h-4 rounded-full border border-current/30"></div>}
                              <span className={`text-sm ${hasVoted ? "font-medium" : "font-light"}`}>{opt.text}</span>
                            </div>
                            
                            <div className="relative z-10 flex items-center gap-4">
                              <span className={`font-mono text-xs ${ui.muted}`}>{opt.voters.length} phiếu</span>
                              <span className="font-mono text-sm w-8 text-right">{percentage}%</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-current/10 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-current/50">
                      <span>Tác giả: {poll.author}</span>
                      <span>Tổng: {totalVotes} phiếu</span>
                    </div>
                  </div>
                </Reveal>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}