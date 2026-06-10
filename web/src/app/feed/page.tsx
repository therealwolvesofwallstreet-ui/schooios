"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import Reveal from "../../components/motion/Reveal";
import { useState, useRef, useEffect } from "react";
import { 
  Send, X, Megaphone, Award, Trash2, CheckCircle, ThumbsDown, Clock,
  ArrowBigUp, ArrowBigDown, Camera, ArrowRight, BookOpen, GraduationCap 
} from "lucide-react";
import toast from "react-hot-toast";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useSchoolStore } from "@/store/useSchoolStore"; 

type SectionType = "feed" | "resource" | "exam";
type FeedTabType = "approved" | "pending" | "my-posts";

interface FeedItem {
  id: number;
  type: string;
  author: string;
  date: string;
  content: string;
  imageUrl?: string | null;
  upvotes: string[];    
  downvotes: string[];  
  status?: "pending" | "approved" | "rejected";
}

interface CommunityStoreMethods {
  items: FeedItem[];
  addFeedPost: (content: string, imageUrl: string | null, author: string, initialStatus: "pending" | "approved") => void;
  toggleUpvote: (id: number, userEmail: string) => void;
  toggleDownvote: (id: number, userEmail: string) => void;
  updateFeedStatus: (id: number, status: "pending" | "approved" | "rejected") => void;
  deleteItem: (id: number) => void;
}

export default function FeedPage() {
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items, addFeedPost, toggleUpvote, toggleDownvote, updateFeedStatus, deleteItem } = store;
  
  const { notices, honors } = useSchoolStore();
  const { userEmail, role } = useAuthStore();
  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");

  const isDark = role === "admin";
  const ui = {
    text: isDark ? "text-paper" : "text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
    hover: isDark ? "hover:text-paper" : "hover:text-ink",
    inputBorder: isDark ? "focus:border-paper placeholder:text-paper/30" : "focus:border-ink placeholder:text-stone",
    cardBg: isDark ? "bg-white/5" : "bg-stone/5",
  };

  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>("feed");
  const [feedTab, setFeedTab] = useState<FeedTabType>("approved"); 
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const allFeedItems = (items || []).filter(i => i.type === "feed");
  const pendingCount = allFeedItems.filter(i => i.status === "pending").length;

  const displayFeed = allFeedItems.filter(item => {
    const status = item.status || "approved";
    if (role === "admin") {
      return feedTab === "pending" ? status === "pending" : status === "approved";
    } else {
      if (feedTab === "my-posts") {
        return item.author === currentUserName;
      }
      return status === "approved";
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dung lượng ảnh vượt quá 5MB! Vui lòng chọn ảnh nhẹ hơn.");
      if (e.target) e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imagePreview) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const initialStatus = role === "admin" ? "approved" : "pending";
      addFeedPost(content, imagePreview, currentUserName, initialStatus);

      setContent(""); 
      setImagePreview(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      if (role === "admin") {
        toast.success("Đã đăng thông báo công khai lên bảng tin!");
        setFeedTab("approved");
      } else {
        toast.success("Đã gửi bài thảo luận! Bạn có thể theo dõi trạng thái ở tab 'Tín hiệu của tôi'.");
        setFeedTab("my-posts"); 
      }
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="max-w-360 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start pt-12 md:pt-24 pb-32 px-6 lg:px-12">
      
      {/* CỘT TRÁI - PROFILE */}
      <div className="hidden lg:flex flex-col gap-12 lg:col-span-3 sticky top-24">
        <div className={`border-b ${ui.border} pb-8`}>
          <div className={`w-16 h-16 rounded-full border ${ui.border} bg-transparent flex items-center justify-center font-display text-2xl ${ui.text} uppercase mb-6`}>
            {currentUserName.charAt(0)}
          </div>
          <h3 className={`font-display text-2xl tracking-tight mb-1 ${ui.text}`}>{currentUserName.split('@')[0]}</h3>
          <p className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase`}>
            {role === "admin" ? "Ban Giám Hiệu" : "Học sinh"}
          </p>
        </div>

        <nav className="flex flex-col gap-4">
          <p className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase mb-2`}>Không gian</p>
          {[
            { id: "feed", label: "Tín hiệu & Bảng tin", icon: Megaphone },
            { id: "resource", label: "Tài nguyên học liệu", icon: BookOpen },
            { id: "exam", label: "Khảo sát định kỳ", icon: GraduationCap }
          ].map(nav => (
            <button 
              key={nav.id}
              onClick={() => setActiveSection(nav.id as SectionType)} 
              className={`flex items-center gap-4 text-left transition-all duration-fast group ${activeSection === nav.id ? ui.text : `${ui.muted} ${ui.hover}`}`}
            >
              <span className={`transition-transform duration-base ease-out group-hover:translate-x-1 ${activeSection === nav.id ? "translate-x-1" : ""}`}>
                {nav.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* CỘT GIỮA - TRUNG TÂM TIN TỨC */}
      <div className="lg:col-span-6 flex flex-col gap-12">
        {activeSection === "feed" ? (
          <>
            {/* THÀNH PHẦN ĐĂNG BÀI */}
            <div className={`border-b ${ui.border} pb-6 relative z-10`}>
              <textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                disabled={isSubmitting}
                placeholder={role === "admin" ? "Phát đi thông báo công khai tới toàn trường..." : "Gửi ý kiến thảo luận chung (Bài viết cần Admin duyệt trước khi hiển thị)..."} 
                rows={2} 
                className={`w-full bg-transparent font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-tight focus:outline-none resize-none overflow-hidden ${ui.text} ${ui.inputBorder} disabled:opacity-50`} 
              />
              
              {imagePreview && (
                <div className={`relative inline-block border ${ui.border} p-1 mt-4 mb-4`}>
                  <img src={imagePreview} className="max-h-125 object-cover" alt="Preview" />
                  {/* 🛠️ VÁ LỖI UX 03: Ép cứng khung nút Xóa ảnh đạt chuẩn 44x44px (w-11 h-11) giúp ngón tay chạm siêu chuẩn */}
                  <button 
                    onClick={() => { 
                      setImagePreview(null); 
                      if (fileInputRef.current) fileInputRef.current.value = ""; 
                    }} 
                    disabled={isSubmitting}
                    className="absolute -top-4 -right-4 bg-signal text-paper rounded-full w-11 h-11 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-20"
                    title="Gỡ ảnh đính kèm"
                  >
                    <X size={16}/>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                />
                
                {/* Tăng diện tích chạm nhẹ cho nút đính kèm ảnh trên mobile bằng p-2 */}
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isSubmitting}
                  className={`text-[0.6875rem] font-mono tracking-[0.18em] uppercase ${ui.muted} ${ui.hover} transition-colors flex items-center gap-2 disabled:opacity-30 p-2 -ml-2 rounded-sm`}
                >
                  <Camera size={14} strokeWidth={1.5}/> Đính kèm hình ảnh
                </button>
                {(content.trim() || imagePreview) && (
                  <button 
                    onClick={handlePostSubmit} 
                    disabled={isSubmitting}
                    className="group flex items-center gap-3 text-signal hover:text-signal-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-[0.6875rem] font-mono tracking-[0.18em] uppercase">
                      {isSubmitting ? "Đang mã hóa dữ liệu..." : role === "admin" ? "Đăng công khai" : "Gửi yêu cầu đăng"}
                    </span>
                    <span className="w-8 h-8 rounded-full border border-signal flex items-center justify-center group-hover:translate-x-1 transition-transform shrink-0">
                      <ArrowRight size={14} strokeWidth={1.5}/>
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* THANH CHUYỂN TAB KIỂM DUYỆT ADAPTIVE HOÀN CHỈNH */}
            <div className={`flex gap-8 border-b ${ui.border} mb-2`}>
              {role === "admin" ? (
                <>
                  <button onClick={() => setFeedTab("approved")} className={`pb-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-colors ${feedTab === "approved" ? "border-b-2 border-white text-white font-bold" : "text-paper/50 hover:text-white"}`}>
                    Đã công khai
                  </button>
                  <button onClick={() => setFeedTab("pending")} className={`pb-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-colors flex items-center gap-2 ${feedTab === "pending" ? "border-b-2 border-signal text-signal font-bold" : "text-paper/50 hover:text-signal"}`}>
                    Chờ kiểm duyệt 
                    {pendingCount > 0 && <span className="bg-signal text-navy text-[10px] px-1.5 py-0.5 rounded-sm font-bold animate-pulse">{pendingCount}</span>}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setFeedTab("approved")} className={`pb-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-colors ${feedTab === "approved" ? "border-b-2 border-ink text-ink font-bold" : "text-muted hover:text-ink"}`}>
                    Bảng tin chung
                  </button>
                  <button onClick={() => setFeedTab("my-posts")} className={`pb-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-colors ${feedTab === "my-posts" ? "border-b-2 border-ink text-ink font-bold" : "text-muted hover:text-ink"}`}>
                    Tín hiệu của tôi
                  </button>
                </>
              )}
            </div>

            {/* BẢNG TIN CHÍNH */}
            <div className="flex flex-col">
              {displayFeed.length === 0 ? (
                <div className={`py-24 text-center ${ui.muted} font-display text-xl italic`}>
                  Khu vực này hiện chưa ghi nhận dữ liệu tín hiệu nào.
                </div>
              ) : (
                displayFeed.map((post, index) => {
                  const score = (post.upvotes || []).length - (post.downvotes || []).length;
                  const isUpvoted = (post.upvotes || []).includes(currentUserName);
                  const isDownvoted = (post.downvotes || []).includes(currentUserName);

                  const displayAuthor = role === "admin" ? post.author.split('@')[0] : (post.author === currentUserName ? "Tôi" : "Học sinh ẩn danh");
                  const displayAvatarChar = role === "admin" ? post.author.charAt(0) : (post.author === currentUserName ? "T" : "X");
                  const currentStatus = post.status || "approved";

                  return (
                    <Reveal key={post.id} delay={index * 0.05}>
                      <div className={`group border-b ${ui.border} py-10 flex gap-6 md:gap-10 items-start`}>
                        
                        {/* THANH VOTE */}
                        {currentStatus === "approved" && (
                          /* 🛠️ VÁ LỖI UX 03: Thiết lập cứng kích thước 44x44px (w-11 h-11) cho các nút mũi tên, căn giữa hoàn hảo */
                          <div className={`flex flex-col items-center gap-1 ${ui.muted} shrink-0 bg-current/5 p-1 rounded-md`}>
                            <button 
                              onClick={() => toggleUpvote(post.id, currentUserName)} 
                              className={`transition-colors w-11 h-11 flex items-center justify-center rounded hover:bg-current/10 ${isUpvoted ? "text-signal" : "text-current"}`}
                              aria-label="Upvote"
                            >
                              <ArrowBigUp size={24}/>
                            </button>
                            <span className={`font-mono text-xs font-medium text-center min-w-8 ${score > 0 ? "text-signal" : score < 0 ? "text-red-500" : ui.text}`}>{score > 0 ? `+${score}` : score}</span>
                            <button 
                              onClick={() => toggleDownvote(post.id, currentUserName)} 
                              className={`transition-colors w-11 h-11 flex items-center justify-center rounded hover:bg-current/10 ${isDownvoted ? "text-red-500" : "text-current"}`}
                              aria-label="Downvote"
                            >
                              <ArrowBigDown size={24}/>
                            </button>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full border ${ui.border} flex items-center justify-center font-display text-sm uppercase ${ui.text}`}>{displayAvatarChar}</div>
                              <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4 className={`text-sm font-medium ${ui.text}`}>{displayAuthor}</h4>
                                  
                                  {role !== "admin" && feedTab === "my-posts" && (
                                    <>
                                      {currentStatus === "pending" && <span className="border border-amber-500 text-amber-500 bg-amber-500/5 text-[9px] uppercase tracking-widest px-1.5 py-0.2 flex items-center gap-1"><Clock size={10}/> Chờ duyệt</span>}
                                      {currentStatus === "approved" && <span className="border border-green-600 text-green-600 bg-green-500/5 text-[9px] uppercase tracking-widest px-1.5 py-0.2">Đã phát sóng</span>}
                                      {currentStatus === "rejected" && <span className="border border-red-500 text-red-500 bg-red-500/5 text-[9px] uppercase tracking-widest px-1.5 py-0.2">Từ chối đăng</span>}
                                    </>
                                  )}
                                </div>
                                <p className={`font-mono text-[0.6rem] uppercase tracking-wider ${ui.muted} mt-0.5`}>{post.date}</p>
                              </div>
                            </div>
                            
                            {/* BỘ ĐIỀU KHIỂN CỦA ADMIN */}
                            <div className="flex items-center gap-2">
                              {role === "admin" && currentStatus === "pending" && (
                                <>
                                  <button onClick={() => { updateFeedStatus(post.id, "approved"); toast.success("Đã phê duyệt bài lên bảng tin công khai!"); }} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 rounded-sm transition-colors min-h-9"><CheckCircle size={12}/> Duyệt</button>
                                  <button onClick={() => { updateFeedStatus(post.id, "rejected"); toast.error("Đã từ chối đăng ý kiến này."); }} className="px-3 py-1.5 bg-white/10 hover:bg-red-950 text-red-400 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 border border-white/20 rounded-sm transition-colors min-h-9"><ThumbsDown size={12}/> Bỏ</button>
                                </>
                              )}
                              {role === "admin" && (
                                /* 🛠️ VÁ LỖI UX 03: Ép cứng khung nút Thùng rác đạt kích thước chuẩn w-11 h-11 để Admin lướt ngón tay không bị bấm hụt */
                                <button 
                                  onClick={() => { 
                                    if (window.confirm("Hệ thống cảnh báo: Bạn có chắc chắn muốn gỡ bỏ hoàn toàn bài viết này vĩnh viễn không? Hành động này không thể hoàn tác.")) {
                                      deleteItem(post.id); 
                                      toast.success("Đã gỡ bỏ bài viết vĩnh viễn."); 
                                    }
                                  }} 
                                  className={`opacity-0 group-hover:opacity-100 ${ui.muted} hover:text-signal transition-all w-11 h-11 flex items-center justify-center rounded hover:bg-current/10`}
                                  title="Gỡ bài viết"
                                >
                                  <Trash2 size={16} strokeWidth={1.5}/>
                                </button>
                              )}
                            </div>
                          </div>

                          <p className={`text-base ${ui.text} leading-relaxed font-light tracking-wide`}>{post.content}</p>
                          
                          {post.imageUrl && (
                            <div className={`mt-6 border ${ui.border} p-1 w-fit ${ui.cardBg}`}>
                              <img src={post.imageUrl} className="max-h-120 object-cover rounded-sm" alt="Attachment" />
                            </div>
                          )}
                        </div>

                      </div>
                    </Reveal>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <h2 className={`font-display text-3xl mb-4 ${ui.text}`}>Phân khu đang được đồng bộ</h2>
            <p className={`text-sm font-light ${ui.muted}`}>Học liệu và lịch khảo sát sẽ được Ban Giám Hiệu cập nhật sớm nhất.</p>
          </div>
        )}
      </div>

      {/* CỘT PHẢI - WIDGETS */}
      <div className="hidden lg:flex flex-col gap-16 lg:col-span-3 sticky top-24">
        <div>
          <h4 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase mb-6 flex items-center gap-2 border-b ${ui.border} pb-4`}><Megaphone size={14} strokeWidth={1.5}/> Tiêu điểm trường</h4>
          <div className="space-y-6">
            {notices.map(n => (
              <div key={n.id} className="group relative">
                <h5 className={`font-medium ${ui.text} mb-1 text-sm`}>{n.title}</h5>
                <p className={`text-xs font-light ${ui.muted} leading-relaxed`}>{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}