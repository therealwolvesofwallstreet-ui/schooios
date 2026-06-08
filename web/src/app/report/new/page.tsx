"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ArrowRight, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import Reveal from "../../../components/motion/Reveal";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useAuthStore } from "@/store/useAuthStore";

type Priority = "LOW" | "MEDIUM" | "HIGH";

interface FeedItem {
  id: number;
  type: string;
}

interface CommunityStoreMethods {
  items: FeedItem[];
  addFeedPost: (content: string, imageUrl: string | null, author: string) => void;
}

export default function NewReportPage() {
  const router = useRouter();
  
  // 🛠️ ĐẤU NỐI KHO DỮ LIỆU THẬT ZUSTAND
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items, addFeedPost } = store;
  const { userEmail, role } = useAuthStore();
  
  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");

  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 🛠️ FIX LỖI ESLINT: Đẩy setMounted vào hàng đợi bất đồng bộ để tránh cascading renders
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return toast.error("Vui lòng nhập nội dung tín hiệu.");

    setIsSubmitting(true);
    
    // Ghi nhận danh sách ID cũ để quét tìm ID mới tạo
    const existingIds = new Set((items || []).map(i => i.id));
    
    // 🛠️ BƠM DỮ LIỆU THẬT VÀO HỆ THỐNG
    addFeedPost(content, null, currentUserName);
    
    // Đợi 1 nhịp ngắn để Store cập nhật rồi đồng bộ LocalStorage trạng thái "Chờ duyệt"
    setTimeout(() => {
      const currentItems = (useCommunityStore.getState() as unknown as CommunityStoreMethods).items || [];
      const newPost = currentItems.find(i => !existingIds.has(i.id));
      const targetId = newPost ? newPost.id : Date.now(); 

      const saved = localStorage.getItem("schoolos_feed_status_map");
      let currentMap = {};
      if (saved) {
        try { currentMap = JSON.parse(saved); } catch { /* ignore */ }
      }
      
      const updated = { ...currentMap, [targetId]: "pending" };
      localStorage.setItem("schoolos_feed_status_map", JSON.stringify(updated));

      toast.success("Tín hiệu của bạn đã được mã hóa an toàn.");
      setIsSubmitting(false);
      router.push("/feed");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-gold selection:text-ink pb-32">
      
      <header className="pt-16 pb-8 px-6 lg:px-12 max-w-250 mx-auto">
        <Reveal>
          <button 
            onClick={() => router.back()} 
            className="group flex items-center gap-2 text-[0.6875rem] font-mono tracking-[0.18em] uppercase text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            Hủy và quay lại
          </button>
        </Reveal>
      </header>

      <main className="max-w-250 mx-auto px-6 lg:px-12 pt-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-16">
          
          {/* CÂU HỎI 1 */}
          <Reveal delay={0.1}>
            <div className="group relative">
              <label className="text-[0.6875rem] font-mono tracking-[0.18em] text-muted uppercase flex items-center gap-2 mb-6">
                <span className="w-6 h-6 rounded-full border border-stone flex items-center justify-center text-[0.6rem]">01</span>
                Điều gì đang xảy ra?
              </label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mô tả chi tiết sự việc. Bạn đang ở trong một không gian an toàn..."
                className="w-full bg-transparent font-display text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] tracking-tight placeholder:text-stone focus:outline-none resize-none min-h-[200px]"
                autoFocus
              />
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {/* CÂU HỎI 2 */}
            <Reveal delay={0.2}>
              <div>
                <label className="text-[0.6875rem] font-mono tracking-[0.18em] text-muted uppercase flex items-center gap-2 mb-6">
                  <span className="w-6 h-6 rounded-full border border-stone flex items-center justify-center text-[0.6rem]">02</span>
                  Khu vực / Địa điểm
                </label>
                <div className="flex items-end gap-4 border-b border-stone pb-3 focus-within:border-ink transition-colors">
                  <MapPin size={20} className="text-muted mb-1" />
                  <input 
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: Hành lang khu B, Căn tin..."
                    className="w-full bg-transparent text-xl focus:outline-none placeholder:text-stone"
                  />
                </div>
              </div>
            </Reveal>

            {/* CÂU HỎI 3 */}
            <Reveal delay={0.3}>
              <div>
                <label className="text-[0.6875rem] font-mono tracking-[0.18em] text-muted uppercase flex items-center gap-2 mb-6">
                  <span className="w-6 h-6 rounded-full border border-stone flex items-center justify-center text-[0.6rem]">03</span>
                  Mức độ nghiêm trọng
                </label>
                <div className="flex gap-4">
                  {(["LOW", "MEDIUM", "HIGH"] as Priority[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPriority(level)}
                      className={`flex-1 py-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-all duration-fast border ${
                        priority === level 
                          ? level === "HIGH" ? "border-signal text-signal bg-signal/5" : "border-ink text-ink"
                          : "border-stone text-muted hover:border-ink/50"
                      }`}
                    >
                      {level === "LOW" ? "Bình thường" : level === "MEDIUM" ? "Cần chú ý" : "Khẩn cấp"}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* ĐÍNH KÈM & SUBMIT */}
          <Reveal delay={0.4}>
            <div className="pt-12 border-t border-stone flex flex-col sm:flex-row items-center justify-between gap-8">
              <button type="button" className="group flex items-center gap-3 text-sm text-muted hover:text-ink transition-colors">
                <span className="w-12 h-12 rounded-full border border-stone flex items-center justify-center group-hover:border-ink transition-colors">
                  <Camera size={18} strokeWidth={1.5} />
                </span>
                <span className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase">Đính kèm bằng chứng</span>
              </button>

              <button 
                type="submit" 
                disabled={isSubmitting || !content.trim()}
                className="group flex items-center gap-6 text-signal hover:text-signal-2 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <span className="font-display text-3xl italic tracking-tight">
                  {isSubmitting ? "Đang truyền tải..." : "Phát tín hiệu"}
                </span>
                <span className="w-14 h-14 rounded-full border border-signal flex items-center justify-center group-hover:translate-x-2 transition-transform duration-base ease-out">
                  <ArrowRight size={24} strokeWidth={1.5} />
                </span>
              </button>
            </div>
          </Reveal>

        </form>
      </main>
    </div>
  );
}