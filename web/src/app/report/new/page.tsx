"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Send, MapPin, Tag, AlertCircle } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { api, ApiError } from "@/lib/api";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/case-display";
import type {
  CategoriesResponse,
  CategoryDTO,
  LocationsResponse,
  LocationDTO,
  CasePriority,
} from "@/lib/api-types";

export default function NewReportPage() {
  const router = useRouter();
  const createCase = useReportStore((s) => s.createCase);
  const role = useAuthStore((s) => s.role);

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [priority, setPriority] = useState<CasePriority>("MEDIUM");
  const [emergency, setEmergency] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Nạp dropdown từ API thật (KHÔNG hardcode).
  useEffect(() => {
    (async () => {
      try {
        const [cat, loc] = await Promise.all([
          api.get<CategoriesResponse>("/api/categories"),
          api.get<LocationsResponse>("/api/locations"),
        ]);
        setCategories(cat.categories);
        setLocations(loc.locations);
      } catch {
        toast.error("Không tải được danh mục / vị trí.");
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 5) {
      toast.error("Tiêu đề tối thiểu 5 ký tự.");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Mô tả tối thiểu 10 ký tự.");
      return;
    }
    if (!categoryId) {
      toast.error("Vui lòng chọn danh mục.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createCase({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        locationId: locationId || undefined,
        priority,
        emergency,
        sensitive,
      });
      toast.success(`Đã tạo báo cáo ${created.caseCode}`);
      router.push("/report");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) toast.error("Vai trò của bạn không được tạo báo cáo.");
        else if (err.status === 400) toast.error(err.message || "Dữ liệu không hợp lệ.");
        else if (err.status === 503) toast.error("Hệ thống bận, vui lòng thử lại.");
        else toast.error("Tạo báo cáo thất bại.");
      } else {
        toast.error("Lỗi kết nối.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (role === "AUDITOR") {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-3">
        <h2 className="text-2xl font-bold text-slate-900">Chỉ xem (Kiểm toán)</h2>
        <p className="text-slate-500">Vai trò Kiểm toán không có quyền tạo báo cáo.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tiêu đề sự vụ * (≥ 5 ký tự)</label>
            <input
              type="text"
              placeholder="Ví dụ: Hỏng điều hòa, sự cố mất trật tự..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-[14px]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mô tả chi tiết * (≥ 10 ký tự)</label>
            <textarea
              rows={4}
              placeholder="Mô tả rõ diễn biến vụ việc..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-[14px]"
            />
          </div>
          {/* TODO(upload): Attachment + Signed URL hoãn (P6/sau). Ẩn nút tải ảnh tới khi nối storage. */}
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Tag size={16} className="text-slate-400" /> Danh mục *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] bg-white"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <MapPin size={16} className="text-slate-400" /> Vị trí
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] bg-white"
              >
                <option value="">-- Chọn vị trí (không bắt buộc) --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.building ? `${l.building.name} · ` : ""}
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <AlertCircle size={16} className="text-slate-400" /> Độ ưu tiên
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_ORDER.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      priority === p
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <hr className="border-slate-100" />
            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700">🚨 Đánh dấu KHẨN CẤP</span>
                <input
                  type="checkbox"
                  checked={emergency}
                  onChange={(e) => setEmergency(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-slate-300"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700">🔒 Báo cáo nhạy cảm (ẩn)</span>
                <input
                  type="checkbox"
                  checked={sensitive}
                  onChange={(e) => setSensitive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
              </label>
              {/* TODO(ẩn-danh-thật): checkbox "ẩn danh" hiện map → sensitive=true (ẩn với HS khác);
                  ẩn danh thực sự (giấu danh tính người tạo) là feature tách, cần thay đổi schema. */}
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md text-sm"
          >
            <Send size={14} /> {submitting ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </div>
      </form>
    </div>
  );
}
