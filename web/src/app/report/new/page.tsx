"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, MapPin, Tag, AlertCircle, EyeOff, UploadCloud, X } from "lucide-react";

export default function NewReportPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "", description: "", category: "", location: "", priority: "Low", isEmergency: false, isConfidential: false,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert("Vui lòng điền đầy đủ Tiêu đề và Mô tả sự vụ!");
      return;
    }
    const fakeCaseId = "SOS-" + Math.floor(100000 + Math.random() * 900000); 
    alert(`Submit báo cáo thành công!\nMã sự vụ: ${fakeCaseId}`);
    router.push("/");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => router.push("/")}
          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Tạo báo cáo mới</h2>
          <p className="text-slate-400 text-xs md:text-sm mt-0.5">Cung cấp thông tin chi tiết để xử lý sự cố.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start">
        <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tiêu đề sự vụ *</label>
            <input 
              type="text" placeholder="Ví dụ: Hỏng điều hòa, sự cố mất trật tự..."
              value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-[14px]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mô tả chi tiết *</label>
            <textarea 
              rows={4} placeholder="Mô tả rõ diễn biến vụ việc..."
              value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-[14px]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Ảnh minh chứng</label>
            {!imagePreview ? (
              <div 
                onClick={() => setImagePreview("https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=500")}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer transition-all"
              >
                <UploadCloud size={28} className="text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-600">Bấm tải ảnh lên</span>
              </div>
            ) : (
              <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden">
                <img src={imagePreview} alt="Preview" className="h-28 object-cover" />
                <button 
                  type="button" onClick={() => setImagePreview(null)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2"><Tag size={16} className="text-slate-400" /> Danh mục</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] bg-white">
                <option value="">-- Chọn danh mục --</option>
                <option value="facility">Cơ sở vật chất</option>
                <option value="security">An ninh - Trật tự</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2"><MapPin size={16} className="text-slate-400" /> Vị trí</label>
              <select value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] bg-white">
                <option value="">-- Chọn vị trí --</option>
                <option value="block_a">Tòa nhà A</option>
                <option value="canteen">Nhà ăn</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2"><AlertCircle size={16} className="text-slate-400" /> Độ ưu tiên</label>
              <div className="grid grid-cols-3 gap-2">
                {["Low", "Medium", "High"].map((p) => (
                  <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`py-2 text-xs font-semibold rounded-xl border transition-all ${formData.priority === p ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-600"}`}>{p}</button>
                ))}
              </div>
            </div>
            <hr className="border-slate-100" />
            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700">🚨 Chế độ KHẨN CẤP</span>
                <input type="checkbox" checked={formData.isEmergency} onChange={(e) => setFormData({...formData, isEmergency: e.target.checked})} className="w-4 h-4 text-red-600 rounded border-slate-300"/>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700">🔒 Báo cáo ẩn danh</span>
                <input type="checkbox" checked={formData.isConfidential} onChange={(e) => setFormData({...formData, isConfidential: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300"/>
              </label>
            </div>
          </div>
          <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-100 transition-all text-sm">
            <Send size={14} /> Gửi báo cáo
          </button>
        </div>
      </form>
    </div>
  );
}