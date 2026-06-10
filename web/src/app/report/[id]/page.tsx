"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft, MapPin, Tag, User, Image as ImageIcon, Briefcase,
  MessageSquare, Lock, Send, AlertTriangle, UserCheck,
} from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/api";
import {
  STATUS_LABEL, STATUS_BADGE, PRIORITY_LABEL, PRIORITY_BADGE, ALLOWED_NEXT, formatDateTime,
} from "@/lib/case-display";
import type { CaseStatus } from "@/lib/api-types";

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const reportId = use(params).id;

  const { current, detailLoading, fetchDetail, changeStatus, assign, setEmergency, addComment } =
    useReportStore();
  const { role, user } = useAuthStore();
  const isPrivileged = role === "ADMIN" || role === "STAFF";

  const [loadFailed, setLoadFailed] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [posting, setPosting] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
    fetchDetail(reportId).catch(() => setLoadFailed(true));
  }, [reportId, fetchDetail]);

  const ready = current && current.id === reportId;

  const handleMutErr = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        toast.error("Dữ liệu đã thay đổi — đã tải lại, vui lòng thử lại.");
        fetchDetail(reportId).catch(() => {});
      } else if (err.status === 403) toast.error("Bạn không có quyền thực hiện thao tác này.");
      else if (err.status === 400) toast.error(err.message || "Thao tác không hợp lệ.");
      else if (err.status === 404) toast.error("Không tìm thấy sự vụ.");
      else if (err.status === 503) toast.error("Hệ thống bận, vui lòng thử lại.");
      else toast.error("Thao tác thất bại.");
    } else {
      toast.error("Lỗi kết nối.");
    }
  };

  const doStatus = async (next: CaseStatus) => {
    setActing(true);
    try {
      await changeStatus(reportId, next);
      toast.success(`Đã chuyển: ${STATUS_LABEL[next]}`);
    } catch (err) {
      handleMutErr(err);
    } finally {
      setActing(false);
    }
  };

  const doAssignSelf = async () => {
    if (!user) return;
    setActing(true);
    try {
      await assign(reportId, user.id);
      toast.success("Đã nhận xử lý sự vụ.");
    } catch (err) {
      handleMutErr(err);
    } finally {
      setActing(false);
    }
  };

  const doEmergency = async () => {
    if (!current) return;
    const next = !current.isEmergency;
    setActing(true);
    try {
      await setEmergency(reportId, next);
      toast.success(next ? "Đã xác nhận KHẨN CẤP." : "Đã hạ mức khẩn cấp.");
    } catch (err) {
      handleMutErr(err);
    } finally {
      setActing(false);
    }
  };

  const doComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await addComment(reportId, newComment.trim(), isPrivileged ? isInternalNote : false);
      setNewComment("");
      setIsInternalNote(false);
      toast.success("Đã gửi phản hồi.");
    } catch (err) {
      handleMutErr(err);
    } finally {
      setPosting(false);
    }
  };

  if (!ready) {
    if (loadFailed) {
      return (
        <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Không tìm thấy sự vụ</h2>
          <p className="text-slate-500">Báo cáo không tồn tại hoặc bạn không có quyền xem.</p>
          <button onClick={() => router.push("/report")} className="text-blue-600 font-bold hover:underline">
            Quay lại danh sách
          </button>
        </div>
      );
    }
    return <div className="max-w-3xl mx-auto text-center py-20 text-slate-400 text-sm">Đang tải sự vụ...</div>;
  }

  const c = current;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/report")} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <span className="font-mono text-sm font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-lg">{c.caseCode}</span>
      </div>

      <div className={`grid grid-cols-1 ${isPrivileged ? "lg:grid-cols-3" : ""} gap-6 items-start`}>
        {/* CỘT TRÁI */}
        <div className={`${isPrivileged ? "lg:col-span-2" : "lg:col-span-3"} space-y-6`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`p-6 md:p-8 border-b ${c.isEmergency ? "bg-red-50/50 border-red-100" : "border-slate-100"}`}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_BADGE[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${PRIORITY_BADGE[c.priority]}`}>
                  {PRIORITY_LABEL[c.priority]}
                </span>
                {c.isEmergency && <span className="bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full animate-pulse">KHẨN CẤP</span>}
                {c.isSensitive && <span className="bg-purple-600 text-white text-xs font-extrabold px-3 py-1 rounded-full">NHẠY CẢM</span>}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-snug">{c.title}</h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
                <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {c.locationRef?.name ?? c.location ?? "Chưa xác định"}</div>
                <div className="flex items-center gap-2"><Tag size={16} className="text-slate-400" /> {c.category.name}</div>
                <div className="flex items-center gap-2"><User size={16} className="text-slate-400" /> {c.createdBy.name}</div>
                <div className="flex items-center gap-2"><UserCheck size={16} className="text-slate-400" /> {c.assignedTo ? c.assignedTo.name : "Chưa giao"}</div>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Mô tả sự vụ</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">{c.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Ảnh minh chứng</h3>
                {c.attachments.length === 0 ? (
                  <div className="w-full md:w-3/4 aspect-video bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon size={32} className="mb-2 opacity-50" />
                    <span className="text-sm font-medium">Không có ảnh đính kèm</span>
                  </div>
                ) : (
                  <ul className="text-sm text-slate-600 list-disc pl-5">
                    {c.attachments.map((a) => (
                      <li key={a.id}>{a.fileName} ({Math.round(a.fileSize / 1024)} KB)</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* BÌNH LUẬN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
              <MessageSquare size={18} className="text-blue-600" /> Trao đổi trong vụ việc
            </h3>

            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
              {c.comments.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Chưa có trao đổi nào.</p>
              )}
              {c.comments.map((cm) => (
                <div key={cm.id} className={`p-4 rounded-xl text-sm ${cm.isInternal ? "bg-purple-50 border border-purple-100" : "bg-slate-50 border border-slate-100"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{cm.author.name}</span>
                      {cm.isInternal && (
                        <span className="bg-purple-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Lock size={10} /> Nội bộ
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{formatDateTime(cm.createdAt)}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{cm.body}</p>
                </div>
              ))}
            </div>

            {role !== "AUDITOR" ? (
              <form onSubmit={doComment} className="space-y-3 pt-2">
                <div className="relative">
                  <input
                    type="text"
                    disabled={posting}
                    placeholder={isInternalNote && isPrivileged ? "Ghi chú nội bộ (HS không thấy)..." : "Nhập phản hồi công khai..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 transition-all ${isInternalNote && isPrivileged ? "border-purple-300 focus:border-purple-500 focus:ring-purple-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"}`}
                  />
                  <button type="submit" disabled={posting} className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white transition-all active:scale-95 disabled:opacity-50 ${isInternalNote && isPrivileged ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                    <Send size={14} />
                  </button>
                </div>
                {isPrivileged && (
                  <label className="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                    />
                    🔒 Ghi chú nội bộ (chỉ Cán bộ / Ban giám hiệu)
                  </label>
                )}
              </form>
            ) : (
              <p className="text-xs text-slate-400 italic">Vai trò Kiểm toán chỉ xem (read-only).</p>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: ĐIỀU PHỐI (CHỈ STAFF/ADMIN) */}
        {isPrivileged && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4">
              <h3 className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-3">
                <Briefcase size={18} className="text-blue-600" /> Điều phối sự vụ
              </h3>

              {/* Nhận xử lý */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phân công</p>
                {c.assignedTo && user && c.assignedTo.id === user.id ? (
                  <div className="text-sm font-semibold text-green-700 bg-green-50 rounded-xl py-2.5 px-4 text-center">
                    Bạn đang xử lý vụ này
                  </div>
                ) : (
                  <button
                    onClick={doAssignSelf}
                    disabled={acting}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all"
                  >
                    Nhận xử lý (giao cho tôi)
                  </button>
                )}
                {/* TODO(assign-to-other): ADMIN giao cho người khác cần endpoint danh sách cán bộ (ngoài contract hiện tại). */}
              </div>

              {/* Đổi trạng thái — chỉ hiện transition hợp lệ (server vẫn enforce) */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đổi trạng thái</p>
                {ALLOWED_NEXT[c.status].length === 0 ? (
                  <p className="text-xs text-slate-400">Trạng thái hiện tại không có bước chuyển tiếp.</p>
                ) : (
                  ALLOWED_NEXT[c.status].map((next) => (
                    <button
                      key={next}
                      onClick={() => doStatus(next)}
                      disabled={acting}
                      className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-left bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-50 border-2 border-transparent transition-all"
                    >
                      → {STATUS_LABEL[next]}
                    </button>
                  ))
                )}
              </div>

              {/* Cờ khẩn cấp chính thức */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2">Mức khẩn cấp</p>
                <button
                  onClick={doEmergency}
                  disabled={acting}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${c.isEmergency ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-red-600 text-white hover:bg-red-700"}`}
                >
                  <AlertTriangle size={15} />
                  {c.isEmergency ? "Hạ mức khẩn cấp" : "Xác nhận KHẨN CẤP"}
                </button>
                {c.studentFlaggedEmergency && !c.isEmergency && (
                  <p className="text-[11px] text-red-500 font-medium">⚠ Học sinh đã bấm nút khẩn cấp — cần duyệt.</p>
                )}
              </div>
            </div>

            {/* Timeline ngắn */}
            {c.statusHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lịch sử trạng thái</h4>
                <ul className="space-y-2">
                  {c.statusHistory.slice(-6).map((h) => (
                    <li key={h.id} className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{STATUS_LABEL[h.toStatus]}</span>
                      {" · "}
                      {formatDateTime(h.createdAt)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
