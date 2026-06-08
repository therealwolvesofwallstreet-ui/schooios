"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Activity, AlertTriangle, CheckCircle, Clock, ShieldAlert, Users } from "lucide-react";
import Reveal from "@/components/motion/Reveal";

// Dữ liệu Audit giả lập
const stats = [
  { label: "Tín hiệu mới (24h)", value: "14", icon: Activity, color: "text-cyan" },
  { label: "Bạo lực học đường", value: "02", icon: ShieldAlert, color: "text-signal" },
  { label: "Đang xử lý", value: "08", icon: Clock, color: "text-gold" },
  { label: "Đã đóng (Tuần)", value: "45", icon: CheckCircle, color: "text-stone" },
];

const auditLogs = [
  { id: "LOG-089", action: "Nâng mức độ ưu tiên: CASE-2026-00042", actor: "Admin Khải", time: "10 phút trước", type: "critical" },
  { id: "LOG-088", action: "Đóng hồ sơ: CASE-2026-00011", actor: "Thầy Bình (Giám thị)", time: "1 giờ trước", type: "normal" },
  { id: "LOG-087", action: "Trích xuất Camera khu B", actor: "Hệ thống bảo vệ", time: "2 giờ trước", type: "system" },
  { id: "LOG-086", action: "Học sinh Ẩn danh gửi tín hiệu mới", actor: "Hệ thống", time: "3 giờ trước", type: "warning" },
];

export default function AuditDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Hiệu ứng GSAP Stagger đơn giản để load các con số mượt mà
  useGSAP(() => {
    gsap.from(".stat-card", {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power3.out",
    });
  }, { scope: containerRef });

  return (
    <div className="min-h-screen bg-navy text-paper pt-24 pb-32 px-6 lg:px-12" ref={containerRef}>
      <div className="max-w-[1440px] mx-auto">
        
        {/* HEADER DÀNH CHO ADMIN */}
        <Reveal>
          <header className="mb-16 border-b border-stone/30 pb-8 flex justify-between items-end">
            <div>
              <p className="text-[0.6875rem] font-mono tracking-[0.18em] text-muted uppercase mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-signal" /> Mạng lưới giám sát
              </p>
              <h1 className="font-display text-4xl tracking-tight">Trung tâm Chỉ huy</h1>
            </div>
            <div className="text-right hidden md:block">
              <p className="font-mono text-sm text-muted">Trạng thái hệ thống</p>
              <p className="text-cyan font-medium tracking-widest uppercase text-sm mt-1">Hoạt động ổn định</p>
            </div>
          </header>
        </Reveal>

        {/* CÁC THẺ THỐNG KÊ (DATA DENSITY) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => (
            <div key={i} className="stat-card border border-stone/30 p-6 flex flex-col justify-between h-32 hover:bg-white/5 transition-colors">
              <div className="flex justify-between items-start">
                <p className="text-[0.6875rem] font-mono tracking-[0.18em] text-muted uppercase w-2/3 leading-relaxed">
                  {stat.label}
                </p>
                <stat.icon size={18} className={stat.color} />
              </div>
              <p className="font-display text-4xl leading-none">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* AUDIT LOG BẤT ĐỐI XỨNG */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <Reveal delay={0.2}>
              <h2 className="text-[0.6875rem] font-mono tracking-[0.18em] text-muted uppercase mb-8 pb-4 border-b border-stone/30">
                Nhật ký vận hành (Audit Log)
              </h2>
            </Reveal>
            
            <div className="flex flex-col">
              {auditLogs.map((log, index) => (
                <Reveal key={log.id} delay={0.3 + index * 0.1}>
                  <div className="group border-b border-stone/30 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 px-4 -mx-4 transition-colors">
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-xs text-muted w-20 shrink-0">{log.id}</span>
                      <p className={`font-medium ${log.type === 'critical' ? 'text-signal' : log.type === 'warning' ? 'text-gold' : 'text-paper'}`}>
                        {log.action}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="flex items-center gap-2 text-muted min-w-[120px]"><Users size={14}/> {log.actor}</span>
                      <span className="font-mono text-xs text-muted w-24 text-right">{log.time}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
             <Reveal delay={0.4}>
              <div className="bg-white/5 border border-stone/30 p-8">
                <h3 className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted uppercase mb-6">Trực ban hôm nay</h3>
                <div className="space-y-4">
                  <p className="flex justify-between items-center text-sm"><span className="text-muted">Trưởng ban:</span> Thầy Trần Văn B</p>
                  <p className="flex justify-between items-center text-sm"><span className="text-muted">Kỹ thuật:</span> Bộ phận IT</p>
                  <p className="flex justify-between items-center text-sm border-t border-stone/30 pt-4 mt-4"><span className="text-muted">Bảo vệ:</span> Chú Năm (Cổng chính)</p>
                </div>
              </div>
             </Reveal>
          </div>
        </div>

      </div>
    </div>
  );
}