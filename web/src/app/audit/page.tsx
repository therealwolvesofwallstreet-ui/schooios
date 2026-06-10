"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore } from "@/store/useCommunityStore";
import { 
  Activity, ShieldAlert, Clock, CheckCircle, Shield, User, Map, BarChart4 
} from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { 
  PieChart, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, Tooltip, ResponsiveContainer 
} from "recharts";

interface FeedItem {
  id: number;
  type: string;
  author: string;
  date: string;
  content: string;
  status?: "pending" | "approved" | "rejected";
}

interface CommunityStoreMethods {
  items: FeedItem[];
}

export default function AuditPage() {
  const router = useRouter();
  const { userEmail, role } = useAuthStore();
  const store = useCommunityStore() as unknown as CommunityStoreMethods;
  const { items } = store;

  const [statusMap, setStatusMap] = useState<Record<number, "pending" | "approved" | "rejected">>({});
  const [mounted, setMounted] = useState(false);

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

  if (!mounted) return null;

  if (role !== "admin") {
    router.push("/");
    return null;
  }

  // ==========================================
  // 🧠 ENGINE PHÂN TÍCH DỮ LIỆU THẬT 100%
  // ==========================================
  
  // Lấy toàn bộ sự vụ và bảng tin
  const allPosts = (items || []).filter(i => i.type === "mailbox" || i.type === "feed");
  
  const syncedPosts = allPosts.map(item => ({
    ...item,
    status: statusMap[item.id] || item.status || "pending"
  }));

  // 1. TÍNH TOÁN METRIC TỔNG QUAN
  const totalPosts = syncedPosts.length;
  const pendingCount = syncedPosts.filter(p => p.status === "pending").length;
  const resolvedCount = syncedPosts.filter(p => p.status === "approved" || p.status === "rejected").length;
  
  const dangerKeywords = ["bạo lực", "đánh", "chửi", "bắt nạt", "cô lập", "thuốc lá", "trộm", "đập"];
  const dangerCount = syncedPosts.filter(p => 
    dangerKeywords.some(kw => p.content.toLowerCase().includes(kw))
  ).length;

  const realAuditLogs = syncedPosts.slice().reverse().slice(0, 4);

  // 2. BIỂU ĐỒ TRÒN: PHÂN LOẠI CATEGORY DỰA TRÊN TỪ KHÓA THỰC TẾ
  let csvc = 0, anNinh = 0, hocTap = 0, khac = 0;
  syncedPosts.forEach(p => {
    const text = p.content.toLowerCase();
    if (text.match(/(hỏng|vệ sinh|rác|thiết bị|điều hòa|bóng đèn|cơ sở|nước|bẩn|giấy)/)) csvc++;
    else if (text.match(/(đánh|chửi|bạo lực|mất cắp|bắt nạt|cô lập|thuốc lá|gây gổ)/)) anNinh++;
    else if (text.match(/(thi cử|điểm|giáo viên|bài tập|học|kiểm tra|thi)/)) hocTap++;
    else khac++;
  });
  
  const realCategoryData = [
    { name: "CSVC & Vệ sinh", value: csvc, color: "#deff9a" },
    { name: "An ninh", value: anNinh, color: "#16a34a" },
    { name: "Học tập", value: hocTap, color: "#94a3b8" },
    { name: "Khác", value: khac, color: "#334155" },
  ].filter(d => d.value > 0); // Chỉ render nhóm nào thực sự có bài viết

  // Nếu hệ thống hoàn toàn trống, chèn 1 bản ghi rỗng để biểu đồ không crash
  if (realCategoryData.length === 0) {
    realCategoryData.push({ name: "Chưa có dữ liệu", value: 1, color: "#1e293b" });
  }

  // 3. BIỂU ĐỒ CỘT: XU HƯỚNG THEO THÁNG THỰC TẾ
  const monthCounts: Record<string, number> = {};
  syncedPosts.forEach(p => {
    // Bóc tách tháng từ chuỗi (VD: "10/06/2026, 14:30")
    const match = p.date.match(/(\d{1,2})\/(\d{4})/); 
    let monthLabel = "Gần đây";
    if (match) {
       monthLabel = `Thg ${parseInt(match[1])}`;
    }
    monthCounts[monthLabel] = (monthCounts[monthLabel] || 0) + 1;
  });
  
  const realTrendData = Object.keys(monthCounts).map(k => ({
    month: k,
    cases: monthCounts[k]
  }));

  if (realTrendData.length === 0) {
    realTrendData.push({ month: "Hiện tại", cases: 0 });
  }

  // 4. BẢN ĐỒ NHIỆT: PHÂN BỔ SỰ VỤ THỰC TẾ
  // Rải sự vụ vào 20 ô (grid 4x5) dựa trên ID để tạo mật độ nhiệt
  const realHeatmapGrid = Array.from({ length: 4 }, () => Array(5).fill(0));
  syncedPosts.forEach(p => {
    const cellIndex = p.id % 20; 
    const row = Math.floor(cellIndex / 5);
    const col = cellIndex % 5;
    
    let heatWeight = 1;
    const text = p.content.toLowerCase();
    // Báo động đỏ (+3 độ nóng) nếu dính từ khóa nguy hiểm
    if (dangerKeywords.some(kw => text.includes(kw))) {
      heatWeight = 3; 
    }
    realHeatmapGrid[row][col] += heatWeight;
  });

  const getHeatmapColor = (value: number) => {
    if (value === 0) return "bg-white/5 border-white/10";
    if (value === 1) return "bg-white/10 border-white/20 text-white/50";
    if (value >= 2 && value < 4) return "bg-amber-500/40 border-amber-500/50 text-amber-400";
    return "bg-signal/60 border-signal text-navy animate-pulse font-bold";
  };

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 lg:px-12 bg-navy text-paper transition-colors duration-slow">
      <div className="max-w-360 mx-auto space-y-12">
        
        {/* HEADER */}
        <Reveal>
          <header className="border-b border-white/15 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-[0.6875rem] font-mono tracking-[0.18em] text-signal uppercase mb-2 flex items-center gap-2">
                <Shield size={12} /> Operational Intelligence
              </p>
              <h1 className="font-display text-4xl tracking-tight">Trung tâm Chỉ huy</h1>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-cyan uppercase tracking-widest animate-pulse">● LIVE SYNC (REAL DATA)</p>
            </div>
          </header>
        </Reveal>

        {/* HÀNG 1: METRICS GRID THẬT */}
        <Reveal delay={0.1}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-white/15 bg-white/5 p-6 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between text-paper/50">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest">Tổng Sự Vụ</span>
                <Activity size={14} className="text-cyan" />
              </div>
              <p className="font-display text-4xl">{totalPosts < 10 ? `0${totalPosts}` : totalPosts}</p>
            </div>

            <div className="border border-white/15 bg-white/5 p-6 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between text-paper/50">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest">Cảnh Báo (Đỏ)</span>
                <ShieldAlert size={14} className="text-signal" />
              </div>
              <p className="font-display text-4xl text-signal">{dangerCount < 10 ? `0${dangerCount}` : dangerCount}</p>
            </div>

            <div className="border border-white/15 bg-white/5 p-6 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between text-paper/50">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest">Đang Chờ Duyệt</span>
                <Clock size={14} className="text-gold" />
              </div>
              <p className="font-display text-4xl text-gold">{pendingCount < 10 ? `0${pendingCount}` : pendingCount}</p>
            </div>

            <div className="border border-white/15 bg-white/5 p-6 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between text-paper/50">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest">Đã Giải Quyết</span>
                <CheckCircle size={14} className="text-paper/80" />
              </div>
              <p className="font-display text-4xl">{resolvedCount < 10 ? `0${resolvedCount}` : resolvedCount}</p>
            </div>
          </div>
        </Reveal>

        {/* HÀNG 2: BIỂU ĐỒ TRỰC QUAN REALTIME */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* BIỂU ĐỒ TRÒN (DOUGHNUT) */}
          <Reveal delay={0.2}>
            <div className="bg-white/5 border border-white/15 p-8 h-80 flex flex-col">
              <h3 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-6">Cơ cấu sự vụ phân bổ</h3>
              <div className="flex-1 flex items-center justify-between">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={realCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {realCategoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-4 pl-4 border-l border-white/10">
                  {realCategoryData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></div>
                      <div className="min-w-0">
                        <p className="text-xs text-paper truncate">{item.name}</p>
                        <p className="font-mono text-[9px] text-paper/50">{item.value} vụ</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* BIỂU ĐỒ CỘT (BAR CHART) */}
          <Reveal delay={0.3}>
            <div className="bg-white/5 border border-white/15 p-8 h-80 flex flex-col">
              <h3 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-6">Xu hướng báo cáo theo tháng</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realTrendData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="cases" fill="#deff9a" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
        </div>

        {/* HÀNG 3: BẢN ĐỒ NHIỆT & NHẬT KÝ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* BẢN ĐỒ NHIỆT THỰC (CỘT 5) */}
          <div className="lg:col-span-5">
            <Reveal delay={0.4}>
              <div className="bg-white/5 border border-white/15 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-paper/50 flex items-center gap-2">
                    <Map size={14} /> Bản đồ phân bổ nóng
                  </h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  {realHeatmapGrid.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-1.5 h-12">
                      {row.map((cell, colIdx) => (
                        <div key={colIdx} className={`flex-1 border flex items-center justify-center transition-all duration-700 ${getHeatmapColor(cell)}`}>
                          {cell > 0 && <span className="font-mono text-[10px] opacity-90">{cell}</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[9px] text-paper/30 mt-6 text-center italic">* Mật độ nhiệt phân bổ dựa trên ID sự vụ và cảnh báo từ khóa.</p>
              </div>
            </Reveal>
          </div>

          {/* NHẬT KÝ VẬN HÀNH DYNAMIC (CỘT 7) */}
          <div className="lg:col-span-7">
            <Reveal delay={0.5}>
              <div className="border border-white/15 bg-white/5 p-8 h-full">
                <h3 className="font-mono text-xs text-paper/50 uppercase tracking-widest border-b border-white/15 pb-4 mb-4">
                  Nhật ký thao tác (Realtime Log)
                </h3>
                <div className="space-y-0">
                  {realAuditLogs.length === 0 ? (
                    <div className="py-8 text-center font-mono text-xs text-paper/30 italic">Trống. Không có lưu lượng mạng.</div>
                  ) : (
                    realAuditLogs.map((log) => (
                      <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[9px] text-paper/30 bg-black/20 px-1.5 py-0.5 rounded-sm">LOG-{log.id.toString().slice(-4)}</span>
                          <p className={`text-xs font-medium ${log.status === "pending" ? "text-gold" : log.status === "rejected" ? "text-red-400" : "text-signal"}`}>
                            {log.status === "pending" ? "Phát sinh hồ sơ mới" : log.status === "rejected" ? "Khép lại (Lưu trữ)" : "Đã duyệt giải quyết"} 
                          </p>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-[9px] text-paper/50">
                          <span className="flex items-center gap-1"><User size={10}/> {log.author.split('@')[0]}</span>
                          <span className="w-16 text-right">{log.date.split(' ')[1] || log.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Reveal>
          </div>

        </div>

      </div>
    </div>
  );
}