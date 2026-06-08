"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { 
  Inbox, Clock, CheckCircle, 
  Search, ShieldAlert, Archive, ArrowLeft, Filter, Star
} from "lucide-react";
import Reveal from "../../components/motion/Reveal";
import { useCommunityStore } from "@/store/useCommunityStore";

interface FeedItem {
  id: number;
  type: string;
  author: string;
  date: string;
  content: string;
  imageUrl?: string | null;
  status?: "pending" | "approved" | "rejected";
}

interface CommunityStoreMethods {
  items: FeedItem[];
}

export default function MailboxPage() {
  const router = useRouter();
  const [activeFolder, setActiveFolder] = useState("inbox");
  const listRef = useRef<HTMLDivElement>(null);
  
  // Kéo Data THẬT từ Zustand
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items } = store;
  
  const [statusMap, setStatusMap] = useState<Record<number, "pending" | "approved" | "rejected">>({});
  const [mounted, setMounted] = useState(false);

  // Đồng bộ trạng thái duyệt/từ chối từ localStorage (giống bên Feed)
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
    return { ...item, status: (item.status || "pending") as "pending" | "approved" | "rejected" };
  }).reverse(); // Mới nhất lên đầu

  // Lọc thư theo danh mục
  const displayedMails = synchronizedItems.filter(item => {
    if (activeFolder === "inbox") return true; 
    return item.status === activeFolder;
  });

  // Đếm số lượng chờ xử lý
  const pendingCount = synchronizedItems.filter(i => i.status === "pending").length;

  const folders = [
    { id: "inbox", label: "Tất cả tín hiệu", icon: Inbox },
    { id: "pending", label: "Chờ xử lý", icon: Clock, count: pendingCount },
    { id: "approved", label: "Đã duyệt (Công khai)", icon: CheckCircle },
    { id: "rejected", label: "Đã từ chối (Lưu trữ)", icon: Archive },
  ];

  useGSAP(() => {
    if (!mounted) return;
    gsap.fromTo(".mail-item", 
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }
    );
  }, { scope: listRef, dependencies: [activeFolder, mounted] });

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-navy text-paper pt-24 pb-32 px-6 lg:px-12">
      <div className="max-w-360 mx-auto">
        
        {/* HEADER: KHOANG ĐIỀU HƯỚNG */}
        <Reveal>
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/15 pb-8">
            <div>
              <button 
                onClick={() => router.push("/feed")} 
                className="group flex items-center gap-2 text-[0.6875rem] font-mono tracking-[0.18em] uppercase text-paper/50 hover:text-paper transition-colors mb-6"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
                Trở về Bảng tin
              </button>
              <h1 className="font-display text-4xl tracking-tight">Hòm thư điều phối</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/50" />
                <input 
                  type="text" 
                  placeholder="Tra cứu ID, từ khóa..." 
                  className="bg-white/5 border border-white/15 py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-white/50 transition-colors w-64 text-paper placeholder:text-paper/30"
                />
              </div>
              <button className="p-2 border border-white/15 bg-white/5 hover:bg-white/10 transition-colors">
                <Filter size={18} className="text-paper/70" />
              </button>
            </div>
          </header>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* CỘT TRÁI: DANH MỤC (FOLDERS) */}
          <div className="lg:col-span-3 space-y-2 sticky top-24">
            <Reveal delay={0.1}>
              <div className="flex flex-col gap-1">
                {folders.map(folder => (
                  <button 
                    key={folder.id}
                    onClick={() => setActiveFolder(folder.id)}
                    className={`flex items-center justify-between p-3 transition-colors ${
                      activeFolder === folder.id 
                        ? "bg-white/10 text-paper border-l-2 border-paper" 
                        : "text-paper/50 hover:bg-white/5 border-l-2 border-transparent hover:text-paper"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <folder.icon size={16} />
                      <span className="font-mono text-xs tracking-widest uppercase">{folder.label}</span>
                    </div>
                    {folder.count !== undefined && folder.count > 0 && (
                      <span className={`text-[0.6rem] px-2 py-0.5 ${activeFolder === folder.id ? "bg-paper text-navy" : "bg-white/10 text-paper"}`}>
                        {folder.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>

          {/* CỘT PHẢI: DANH SÁCH THƯ (INBOX) */}
          <div className="lg:col-span-9" ref={listRef}>
            <div className="border border-white/15 bg-white/5">
              {/* Tiêu đề cột */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/15 text-[0.6875rem] font-mono tracking-[0.18em] uppercase text-paper/50">
                <div className="col-span-3 flex items-center gap-4">
                  <span className="w-4 h-4 border border-white/30 rounded-sm"></span>
                  Người gửi
                </div>
                <div className="col-span-7">Nội dung tín hiệu</div>
                <div className="col-span-2 text-right">Thời gian</div>
              </div>

              {/* Danh sách */}
              <div className="flex flex-col">
                {displayedMails.length === 0 ? (
                  <div className="p-12 text-center text-paper/30 font-display text-xl italic">
                    Không có tín hiệu nào trong thư mục này.
                  </div>
                ) : (
                  displayedMails.map((mail) => {
                    const isUnread = mail.status === "pending"; // Tín hiệu chưa duyệt coi như chưa đọc

                    return (
                      <div 
                        key={mail.id} 
                        onClick={() => router.push(`/report/${mail.id}`)}
                        className={`mail-item grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/10 cursor-pointer transition-colors items-center ${isUnread ? "bg-white/5" : ""}`}
                      >
                        <div className="col-span-3 flex items-center gap-4 truncate">
                          <div className="flex items-center gap-3">
                            <button className="text-paper/30 hover:text-paper transition-colors shrink-0">
                              <div className="w-4 h-4 border border-white/30 rounded-sm"></div>
                            </button>
                            <button className="shrink-0">
                              <Star size={14} className="text-paper/30 hover:text-paper" />
                            </button>
                          </div>
                          <span className={`truncate text-sm ${isUnread ? "font-medium text-paper" : "font-light text-paper/70"}`}>
                            {mail.author}
                          </span>
                        </div>
                        
                        <div className="col-span-7 flex items-center gap-3 truncate">
                          {isUnread && <ShieldAlert size={14} className="text-gold shrink-0" />}
                          <span className={`text-sm truncate ${isUnread ? "font-medium text-paper" : "font-light text-paper/70"}`}>
                            Mã tín hiệu: {mail.id} <span className="text-paper/40 ml-2 font-light">— {mail.content}</span>
                          </span>
                        </div>
                        
                        <div className={`col-span-2 text-right font-mono text-[0.6875rem] ${isUnread ? "text-paper" : "text-paper/40"}`}>
                          {mail.date}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}