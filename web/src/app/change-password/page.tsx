"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { api, ApiError } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Xác nhận mật khẩu không khớp.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        "/api/auth/change-password",
        { currentPassword, newPassword },
        { skipAuthRedirect: true },
      );
      toast.success("Đổi mật khẩu thành công");
      await hydrate(); // refresh để mustChangePassword=false (cookie đã được re-issue server-side)
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        const m = err.message || "";
        if (err.status === 401 && /incorrect|current/i.test(m)) {
          toast.error("Mật khẩu hiện tại không đúng.");
        } else if (err.status === 401) {
          toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          router.replace("/login");
        } else if (err.status === 400 && /different/i.test(m)) {
          toast.error("Mật khẩu mới phải khác mật khẩu hiện tại.");
        } else if (err.status === 400) {
          toast.error("Mật khẩu không hợp lệ (tối thiểu 6 ký tự).");
        } else if (err.status === 429) {
          toast.error("Quá nhiều lần thử. Vui lòng đợi một lát.");
        } else {
          toast.error("Đổi mật khẩu thất bại. Vui lòng thử lại.");
        }
      } else {
        toast.error("Lỗi kết nối. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-slate-100 flex items-center justify-center min-h-screen w-full p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-md inline-block">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Đổi mật khẩu</h1>
          <p className="text-slate-400 text-sm">
            Lần đăng nhập đầu tiên: bạn cần đặt mật khẩu mới trước khi vào hệ thống.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mật khẩu hiện tại *
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-[14px]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mật khẩu mới * (≥ 6 ký tự)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-[14px]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Xác nhận mật khẩu mới *
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-[14px]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm"
          >
            {submitting ? "Đang lưu..." : "Đổi mật khẩu & vào hệ thống"}
          </button>
        </form>
      </div>
    </main>
  );
}
