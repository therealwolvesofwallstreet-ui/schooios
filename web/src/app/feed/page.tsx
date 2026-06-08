"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import Reveal from "../../components/motion/Reveal";
import { useState, useRef, useEffect } from "react";
import { 
  Send, X, Megaphone, Award, 
  BookOpen, GraduationCap, Camera, Trash2, CheckCircle,
  ArrowBigUp, ArrowBigDown, Clock, ThumbsDown, ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useSchoolStore } from "@/store/useSchoolStore"; 

type SectionType = "feed" | "resource" | "exam" | "event";
type FeedTabType = "approved" | "pending" | "my-posts"; 
type StudentSubFilterType = "approved" | "pending" | "rejected";

interface FeedItem {
  id: number;
  type: string;
  author: string;
  date: string;
  content: string;
  imageUrl?: string | null;
  upvotes?: string[];    
  downvotes?: string[];  
  status?: "pending" | "approved" | "rejected"; 
}

interface CommunityStoreMethods {
  items: FeedItem[];
  addFeedPost: (content: string, imageUrl: string | null, author: string) => void;
  deleteItem: (id: number) => void;
  upvotePost?: (id: number, username: string) => void;
  downvotePost?: (id: number, username: string) => void;
}

interface ZustandStoreObject {
  getState: () => CommunityStoreMethods;
}

export default function FeedPage() {
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items, addFeedPost, deleteItem } = store;
  
  const { notices, honors, academicItems, addNotice, removeNotice, addHonor, removeHonor, addAcademicItem, removeAcademicItem } = useSchoolStore();
  const { userEmail, role } = useAuthStore();
  const currentUserName = userEmail || (role === "admin" ? "Admin" : "Học sinh");

  // 🛠️ BỘ ĐIỀU KHIỂN TẮC KÈ HOA (ADAPTIVE THEME)
  const isDark = role !== "student";
  const ui = {
    text: isDark ? "text-paper" : "text-ink",
    muted: isDark ? "text-paper/50" : "text-muted",
    border: isDark ? "border-white/15" : "border-stone",
    hover: isDark ? "hover:text-paper" : "hover:text-ink",
    inputBg: isDark ? "bg-white/5" : "bg-transparent",
    inputBorder: isDark ? "focus:border-paper placeholder:text-paper/30" : "focus:border-ink placeholder:text-stone",
  };

  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>("feed");
  const [feedTab, setFeedTab] = useState<FeedTabType>("approved"); 
  const [studentSubFilter, setStudentSubFilter] = useState<StudentSubFilterType>("pending"); 

  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");

  const [showHonorForm, setShowHonorForm] = useState(false);
  const [honorName, setHonorName] = useState("");
  const [honorAchieve, setHonorAchieve] = useState("");
  const [honorBadge, setHonorBadge] = useState("Học thuật");

  const [acadTitle, setAcadTitle] = useState("");
  const [acadDetail, setAcadDetail] = useState("");

  const [statusMap, setStatusMap] = useState<Record<number, "pending" | "approved" | "rejected">>({});
  const [localTrigger, setLocalTrigger] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("schoolos_feed_status_map");
    const timer = setTimeout(() => {
      if (saved) {
        try { setStatusMap(JSON.parse(saved)); } catch { /* ignore */ }
      }
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const synchronizedItems = (items || []).map(item => {
    const localStatus = statusMap[item.id];
    if (localStatus) return { ...item, status: localStatus };
    return { ...item, status: (item.status || "approved") as "pending" | "approved" | "rejected" };
  });

  const allFeedItems = synchronizedItems.filter(i => i.type === "feed");
  const pendingCount = allFeedItems.filter(i => i.status === "pending").length;

  const displayedFeed = allFeedItems.filter(item => {
    if (localTrigger < 0) return false;
    if (role === "admin") {
      return feedTab === "pending" ? item.status === "pending" : item.status === "approved";
    } else {
      if (feedTab === "my-posts") {
        return item.author === currentUserName && item.status === studentSubFilter;
      }
      return item.status === "approved";
    }
  }).reverse();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 3 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file) toast.error("Dung lượng ảnh vượt quá 3MB!");
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imagePreview) return;
    
    const existingIds = new Set((items || []).map(i => i.id));
    addFeedPost(content, imagePreview, currentUserName);
    
    const storeObject = useCommunityStore as unknown as ZustandStoreObject;
    const currentItems = storeObject.getState().items || [];
    const newPost = currentItems.find((i: FeedItem) => !existingIds.has(i.id));
    
    const targetId = newPost ? newPost.id : Date.now(); 
    const initialStatus = (role === "admin" ? "approved" : "pending") as "pending" | "approved" | "rejected";
    
    setStatusMap(prev => {
      const updated = { ...prev, [targetId]: initialStatus };
      localStorage.setItem("schoolos_feed_status_map", JSON.stringify(updated));
      return updated;
    });

    setContent(""); setImagePreview(null); setLocalTrigger(prev => prev + 1);
    
    if (role === "admin") {
      toast.success("Đã đăng bài viết công khai!");
    } else {
      toast.success("Tín hiệu của bạn đã được gửi đi!");
      setFeedTab("my-posts"); setStudentSubFilter("pending");
    }
  };

  const handleApprovePost = (id: number) => {
    setStatusMap(prev => {
      const updated = { ...prev, [id]: "approved" as const };
      localStorage.setItem("schoolos_feed_status_map", JSON.stringify(updated));
      return updated;
    });
    setLocalTrigger(prev => prev + 1);
    toast.success("Đã phê duyệt tín hiệu!");
  };

  const handleRejectPost = (id: number) => {
    setStatusMap(prev => {
      const updated = { ...prev, [id]: "rejected" as const };
      localStorage.setItem("schoolos_feed_status_map", JSON.stringify(updated));
      return updated;
    });
    setLocalTrigger(prev => prev + 1);
    toast.error("Đã từ chối tín hiệu này.");
  };

  const handleUpvoteClick = (id: number) => {
    if (store.upvotePost) store.upvotePost(id, currentUserName);
  };

  const handleDownvoteClick = (id: number) => {
    if (store.downvotePost) store.downvotePost(id, currentUserName);
  };

  if (!mounted) return null;

  return (
    <div className="max-w-360 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start pt-12 md:pt-24 pb-32 px-6 lg:px-12">
      
      {/* ========================================================
          CỘT TRÁI (3/12) - PROFILE & ĐIỀU HƯỚNG
          ======================================================== */}
      <div className="hidden lg:flex flex-col gap-12 lg:col-span-3 sticky top-24">
        <div className={`border-b ${ui.border} pb-8`}>
          <div className={`w-16 h-16 rounded-full border ${ui.border} bg-transparent flex items-center justify-center font-display text-2xl ${ui.text} uppercase mb-6`}>
            {currentUserName.charAt(0)}
          </div>
          <h3 className={`font-display text-2xl tracking-tight mb-1 ${ui.text}`}>{currentUserName}</h3>
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

      {/* ========================================================
          CỘT GIỮA (6/12) - TRUNG TÂM TÍN HIỆU (FEED)
          ======================================================== */}
      <div className="lg:col-span-6 flex flex-col gap-12">
        {activeSection === "feed" ? (
          <>
            <div className={`border-b ${ui.border} pb-6 relative z-10`}>
              <textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder={role === "admin" ? "Phát đi thông báo công khai..." : "Bạn muốn báo cáo điều gì?"} 
                rows={2} 
                className={`w-full bg-transparent font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-tight focus:outline-none resize-none overflow-hidden ${ui.text} ${ui.inputBorder}`} 
              />
              
              {imagePreview && (
                <div className={`relative inline-block border ${ui.border} p-1 mt-4 mb-4`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} className="max-h-125 object-cover" alt="Preview" />
                  <button onClick={() => setImagePreview(null)} className="absolute -top-3 -right-3 bg-signal text-paper rounded-full p-1"><X size={12}/></button>
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                <button onClick={() => fileInputRef.current?.click()} className={`text-[0.6875rem] font-mono tracking-[0.18em] uppercase ${ui.muted} ${ui.hover} transition-colors flex items-center gap-2`}>
                  <Camera size={14} strokeWidth={1.5}/> Đính kèm
                </button>
                {(content.trim() || imagePreview) && (
                  <button onClick={handlePostSubmit} className="group flex items-center gap-3 text-signal hover:text-signal-2 transition-colors">
                    <span className="text-[0.6875rem] font-mono tracking-[0.18em] uppercase">Gửi tín hiệu</span>
                    <span className="w-8 h-8 rounded-full border border-signal flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={14} strokeWidth={1.5}/>
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {role === "admin" ? (
                <div className={`flex gap-8 border-b ${ui.border}`}>
                  <button onClick={() => setFeedTab("approved")} className={`pb-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-colors ${feedTab === "approved" ? `border-b-2 border-current ${ui.text}` : `border-b-2 border-transparent ${ui.muted} ${ui.hover}`}`}>Tín hiệu công khai</button>
                  <button onClick={() => setFeedTab("pending")} className={`pb-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-colors flex items-center gap-2 ${feedTab === "pending" ? "border-b-2 border-signal text-signal" : `border-b-2 border-transparent ${ui.muted} ${ui.hover}`}`}>
                    Chờ duyệt
                    {pendingCount > 0 && <span className="text-signal bg-signal/10 px-1.5 py-0.5 rounded-sm">{pendingCount}</span>}
                  </button>
                </div>
              ) : (
                <div className={`flex gap-8 border-b ${ui.border}`}>
                  <button onClick={() => setFeedTab("approved")} className={`pb-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-colors ${feedTab === "approved" ? `border-b-2 border-current ${ui.text}` : `border-b-2 border-transparent ${ui.muted} ${ui.hover}`}`}>Bảng tin chung</button>
                  <button onClick={() => setFeedTab("my-posts")} className={`pb-3 text-[0.6875rem] font-mono tracking-[0.18em] uppercase transition-colors ${feedTab === "my-posts" ? `border-b-2 border-current ${ui.text}` : `border-b-2 border-transparent ${ui.muted} ${ui.hover}`}`}>Tín hiệu của tôi</button>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              {displayedFeed.length === 0 ? (
                <div className={`py-24 text-center ${ui.muted} font-display text-xl italic`}>
                  Không gian tĩnh lặng. Không có tín hiệu nào.
                </div>
              ) : (
                displayedFeed.map((post, index) => {
                  const score = (post.upvotes || []).length - (post.downvotes || []).length;
                  const isUpvoted = (post.upvotes || []).includes(currentUserName);
                  const isDownvoted = (post.downvotes || []).includes(currentUserName);

                  const canSeeIdentity = role === "admin" || post.author === currentUserName;
                  const displayAuthor = canSeeIdentity ? post.author : "Ẩn danh";
                  const displayAvatarChar = canSeeIdentity ? post.author.charAt(0) : "—";

                  return (
                    <Reveal key={post.id} delay={index * 0.1}>
                      <div className={`group border-b ${ui.border} py-10 flex gap-6 md:gap-10`}>
                        
                        {post.status === "approved" && (
                          <div className={`flex flex-col items-center gap-3 ${ui.muted} shrink-0 pt-1`}>
                            <button onClick={() => handleUpvoteClick(post.id)} className={`${ui.hover} transition-colors ${isUpvoted ? ui.text : ""}`}><ArrowBigUp strokeWidth={1.5} size={24}/></button>
                            <span className={`font-mono text-sm ${ui.text}`}>{score}</span>
                            <button onClick={() => handleDownvoteClick(post.id)} className={`${ui.hover} transition-colors ${isDownvoted ? ui.text : ""}`}><ArrowBigDown strokeWidth={1.5} size={24}/></button>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full border ${ui.border} flex items-center justify-center font-display text-lg uppercase ${ui.text}`}>{displayAvatarChar}</div>
                              <div>
                                <h4 className={`font-medium ${ui.text}`}>{displayAuthor}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <p className={`font-mono text-[0.6875rem] ${ui.muted}`}>{post.date}</p>
                                  {post.status === "pending" && <span className="border border-gold text-gold px-1.5 py-0.5 text-[0.6rem] uppercase tracking-widest">Đang chờ</span>}
                                  {post.status === "rejected" && <span className="border border-signal text-signal px-1.5 py-0.5 text-[0.6rem] uppercase tracking-widest">Từ chối</span>}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              {role === "admin" && post.status === "pending" && (
                                <>
                                  <button onClick={() => handleApprovePost(post.id)} className={`text-[0.6875rem] font-mono uppercase tracking-[0.18em] ${ui.muted} hover:text-cyan transition-colors flex items-center gap-1`}><CheckCircle size={14}/> Duyệt</button>
                                  <button onClick={() => handleRejectPost(post.id)} className={`text-[0.6875rem] font-mono uppercase tracking-[0.18em] ${ui.muted} hover:text-signal transition-colors flex items-center gap-1`}><ThumbsDown size={14}/> Bỏ</button>
                                </>
                              )}
                              {role === "admin" && (
                                <button onClick={() => deleteItem(post.id)} className={`${ui.muted} hover:text-signal transition-colors`}><Trash2 size={16} strokeWidth={1.5}/></button>
                              )}
                            </div>
                          </div>

                          <p className={`text-base ${ui.text} leading-relaxed font-light`}>{post.content}</p>
                          
                          {post.imageUrl && (
                            <div className={`mt-8 border ${ui.border} p-1 w-fit`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={post.imageUrl} className="max-h-125 object-cover" alt="Attachment" />
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
          <div>
            <h2 className={`font-display text-4xl mb-12 ${ui.text}`}>Đang xây dựng...</h2>
          </div>
        )}
      </div>

      {/* ========================================================
          CỘT PHẢI (3/12) - WIDGETS TÍN HIỆU
          ======================================================== */}
      <div className="hidden lg:flex flex-col gap-16 lg:col-span-3 sticky top-24">
        <div>
          <h4 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase mb-6 flex items-center gap-2 border-b ${ui.border} pb-4`}>
            <Megaphone size={14} strokeWidth={1.5}/> Tiêu điểm
          </h4>
          <div className="space-y-6">
            {notices.length === 0 ? (
              <p className={`text-sm font-light ${ui.muted} italic`}>Không có tiêu điểm mới.</p>
            ) : (
              notices.map(n => (
                <div key={n.id} className="group relative">
                  <h5 className={`font-medium ${ui.text} mb-1`}>{n.title}</h5>
                  <p className={`text-sm font-light ${ui.muted}`}>{n.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className={`text-[0.6875rem] font-mono tracking-[0.18em] ${ui.muted} uppercase mb-6 flex items-center gap-2 border-b ${ui.border} pb-4`}>
            <Award size={14} strokeWidth={1.5}/> Vinh danh
          </h4>
          <div className="space-y-6">
            {honors.length === 0 ? (
              <p className={`text-sm font-light ${ui.muted} italic`}>Đang cập nhật...</p>
            ) : (
              honors.map(h => (
                <div key={h.id} className="group relative flex gap-4">
                  <div className={`w-8 h-8 rounded-full border ${ui.border} flex items-center justify-center font-display text-sm uppercase ${ui.text} shrink-0`}>{h.name.charAt(0)}</div>
                  <div>
                    <h5 className={`font-medium ${ui.text} text-sm`}>{h.name}</h5>
                    <p className={`text-xs font-light ${ui.muted}`}>{h.achievement}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}