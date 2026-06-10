"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldAlert, LogIn } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Vui lòng nhập đầy đủ thông tin tài khoản!");
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(identifier.trim(), password);
      toast.success("Đăng nhập thành công");
      router.replace(user.mustChangePassword ? "/change-password" : "/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429)
          toast.error(
            err.retryAfter
              ? `Quá nhiều lần thử. Vui lòng đợi ${err.retryAfter}s rồi thử lại.`
              : "Quá nhiều lần thử. Vui lòng đợi một lát rồi thử lại.",
          );
        else if (err.status === 401) toast.error("Sai tài khoản hoặc mật khẩu.");
        else if (err.status === 403) toast.error("Tài khoản đã bị vô hiệu hoá.");
        else toast.error("Đăng nhập thất bại. Vui lòng thử lại.");
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
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-md inline-block">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">SchooIOS</h1>
          <p className="text-slate-400 text-sm">Hệ thống vận hành sự vụ học đường số</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email hoặc Mã số học sinh (SBD) *
            </label>
            <input
              type="text"
              autoComplete="username"
              placeholder="Ví dụ: 0123456 hoặc admin@school.edu.vn"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-[14px]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mật khẩu *
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-[14px]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-100 text-sm"
          >
            <LogIn size={16} /> {submitting ? "Đang đăng nhập..." : "Đăng nhập vào hệ thống"}
          </button>
        </form>
        <div className="text-center">
          <span className="text-xs text-slate-400 font-medium">Phiên bản pilot nội bộ MVP</span>
        </div>
      </div>
    </main>
  );
}
