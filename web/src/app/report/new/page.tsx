"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; 
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore } from "@/store/useCommunityStore";
import { ArrowLeft, Camera, X, ShieldAlert, Send } from "lucide-react";
import toast from "react-hot-toast";
import Reveal from "@/components/motion/Reveal";

type StoreCommunityItem = ReturnType<typeof useCommunityStore.getState>["items"][number];

export default function NewReportPage() {
  const router = useRouter();
  const { userEmail } = useAuthStore();
  
  const store = useCommunityStore();
  const items = store.items || [];

  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Tệp tin bằng chứng vượt quá 5MB! Vui lòng chọn ảnh nhẹ hơn.");
      if (e.target) e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string); 
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Vui lòng mô tả chi tiết sự kiện đang xảy ra.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const authorEmail = userEmail || "anonym@schoolos.edu";
      // 🛠️ CHUẨN HÓA LOGIC: Gỡ bỏ chữ khẩn cấp, để tựa đề mang tính khách quan
      const reportTitle = location ? `Sự vụ tại: ${location}` : "Báo cáo sự vụ mật";
      const generatedId = Date.now();

      const newReport = {
        id: generatedId,
        type: "mailbox",
        title: reportTitle,
        content: content.trim(),
        author: authorEmail,
        date: new Date().toLocaleString("vi-VN"),
        status: "pending",
        imageUrl: imagePreview, 
        comments: [],
        upvotes: [],   
        downvotes: []  
      } as unknown as StoreCommunityItem;

      useCommunityStore.setState({ items: [...items, newReport] });

      toast.success("Tín hiệu mật đã được phát đi thành công! Ban Giám Hiệu sẽ phân loại và xử lý.");
      
      setContent("");
      setLocation("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setIsSubmitting(false);
      
      // 🛠️ UX UPGRADE: Dịch chuyển thẳng vào phòng thẩm định 1-1 thay vì đuổi ra trang chủ
      router.push(`/report/${generatedId}`); 
    }, 800);
  };

  return (
    <div className="min-h-screen bg-paper text-ink pt-24 pb-32 px-6 lg:px-12 font-body selection:bg-gold selection:text-ink">
      <div className="max-w-200 mx-auto space-y-12">
        
        {/* NÚT QUAY LẠI */}
        <Reveal>
          <button 
            onClick={() => router.back()} 
            disabled={isSubmitting}
            className="group flex items-center gap-2 text-[0.6875rem] font-mono tracking-[0.18em] uppercase text-muted hover:text-ink transition-colors disabled:opacity-30"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Hủy và quay lại
          </button>
        </Reveal>

        {/* TIÊU ĐỀ KHÔNG GIAN */}
        <header className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-signal shrink-0 animate-pulse" size={28} />
            {/* 🛠️ CHUẨN HÓA GIAO DIỆN: Thay đổi tiêu đề trung lập */}
            Phát tín hiệu sự vụ
          </h1>
          <p className="text-xs font-light text-muted leading-relaxed max-w-xl">
            Tín hiệu này được bảo mật mã hóa 1-1. Ban Giám Hiệu sẽ tiếp nhận, phân loại mức độ và trực tiếp điều phối. Danh tính của bạn được ẩn giấu an toàn.
          </p>
        </header>

        {/* FORM NHẬP LIỆU */}
        <form onSubmit={handleSubmit} className="space-y-10 pt-4">
          
          {/* PHÂN KHU 01: NỘI DUNG */}
          <Reveal delay={0.1}>
            <div className="space-y-4">
              <label className="text-[0.6875rem] font-mono tracking-[0.18em] uppercase text-muted flex items-center gap-2">
                <span className="border border-current px-1 py-0.2 text-[9px]">01</span> Sự việc diễn ra như thế nào?
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSubmitting}
                placeholder="Mô tả chi tiết sự việc khách quan nhất có thể. Bạn đang ở trong một không gian an toàn..."
                rows={4}
                className="w-full bg-stone/5 border border-stone/50 focus:border-ink p-4 focus:outline-none text-base font-light resize-none rounded-sm transition-colors placeholder:text-stone disabled:opacity-50"
                required
              />
            </div>
          </Reveal>

          {/* PHÂN KHU 02: ĐỊA ĐIỂM */}
          <Reveal delay={0.2}>
            <div className="space-y-4">
              <label className="text-[0.6875rem] font-mono tracking-[0.18em] uppercase text-muted flex items-center gap-2">
                <span className="border border-current px-1 py-0.2 text-[9px]">02</span> Khu vực / Địa điểm
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSubmitting}
                placeholder="VD: Nhà vệ sinh tầng 3, Căn tin, Phòng thể chất..."
                className="w-full bg-stone/5 border border-stone/50 focus:border-ink p-4 focus:outline-none text-sm font-light rounded-sm transition-colors placeholder:text-stone/60 disabled:opacity-50"
              />
            </div>
          </Reveal>

          {/* PHÂN KHU 03: HÌNH ẢNH BẰNG CHỨNG */}
          <Reveal delay={0.3}>
            <div className="space-y-4">
              <label className="text-[0.6875rem] font-mono tracking-[0.18em] uppercase text-muted flex items-center gap-2">
                <span className="border border-current px-1 py-0.2 text-[9px]">03</span> Tệp tin bằng chứng (Hình ảnh)
              </label>
              
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
              />

              {imagePreview ? (
                <div className="relative inline-block border border-stone p-1 bg-stone/5 rounded-sm animate-in fade-in zoom-in-95 duration-fast">
                  <div className="relative max-h-72 overflow-hidden rounded-sm">
                    <Image 
                      src={imagePreview} 
                      alt="Bằng chứng sự cố" 
                      width={400} 
                      height={300} 
                      className="object-cover w-auto h-auto max-h-72 rounded-sm"
                      unoptimized
                    />
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={isSubmitting}
                    className="absolute -top-4 -right-4 bg-signal text-paper rounded-full w-11 h-11 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform z-10"
                    title="Gỡ ảnh"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-14 px-6 border border-dashed border-stone/80 hover:border-ink text-muted hover:text-ink font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-colors rounded-sm bg-stone/5 disabled:opacity-30"
                >
                  <Camera size={16} /> Đính kèm ảnh bằng chứng
                </button>
              )}
            </div>
          </Reveal>

          {/* NÚT BẤM KÍCH HOẠT PHÁT SÓNG SỰ VỤ */}
          <Reveal delay={0.4}>
            <div className="pt-4 border-t border-stone/20 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="w-full sm:w-auto px-8 h-14 bg-ink text-paper dark:bg-paper dark:text-navy hover:opacity-90 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl rounded-sm"
              >
                <Send size={14} className={isSubmitting ? "animate-ping" : ""} />
                {/* 🛠️ CHUẨN HÓA GIAO DIỆN: Nút bấm mang ý nghĩa báo cáo trung lập */}
                <span>{isSubmitting ? "Đang mã hóa dữ liệu mật..." : "Phát tín hiệu bảo mật"}</span>
              </button>
            </div>
          </Reveal>

        </form>

      </div>
    </div>
  );
}