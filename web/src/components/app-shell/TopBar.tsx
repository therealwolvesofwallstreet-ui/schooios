"use client";

// TopBar: hamburger (mobile) + chuông thông báo + chip người dùng (tên · role) → modal đăng xuất.
// Badge unread = server-truth (nối ở F4); F1 chỉ đặt link chuông. Đăng xuất: POST /logout → /login.
import { useState } from "react";
import Link from "next/link";
import { List, Bell, SignOut } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { Role } from "@/lib/api-types";
import type { SessionUser } from "@/hooks/useSession";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Học sinh",
  STAFF: "Nhân sự",
  ADMIN: "Quản trị",
  AUDITOR: "Kiểm toán",
};

export function TopBar({
  user,
  onToggleNav,
}: {
  user: SessionUser | null;
  onToggleNav: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // kệ — vẫn điều hướng về /login
    }
    window.location.href = "/login";
  }

  return (
    <header className="border-line bg-paper sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4">
      <button
        type="button"
        onClick={onToggleNav}
        aria-label="Mở điều hướng"
        className="text-ink-2 hover:text-ink transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:hidden"
      >
        <List size={22} weight="light" />
      </button>

      <div className="flex-1" />

      <Link
        href="/notifications"
        aria-label="Thông báo"
        className="text-ink-2 hover:text-ink rounded-md p-1.5 transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Bell size={20} weight="light" />
      </Link>

      {user && (
        <button
          type="button"
          data-testid="user-chip"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-150 ease-quiet hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="flex flex-col leading-tight">
            <span className="text-ink text-sm font-medium">{user.name}</span>
            <span className="text-ink-3 text-[11px] tracking-wider uppercase">
              {ROLE_LABEL[user.role]}
            </span>
          </span>
        </button>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Đăng xuất?">
        <p className="text-ink-2 mb-6 text-sm">Bạn sẽ cần đăng nhập lại để tiếp tục.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Ở lại
          </Button>
          <Button variant="primary" onClick={logout}>
            <SignOut size={16} weight="light" />
            Đăng xuất
          </Button>
        </div>
      </Modal>
    </header>
  );
}
