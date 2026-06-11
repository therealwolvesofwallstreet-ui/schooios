// Nhóm (public): login / change-password (KHÔNG sidebar, KHÔNG provider app — giữ nhẹ, server-only).
// Khung/bố cục/khoảng-thở do components/auth/AuthSurface lo (mỗi trang tự dựng split | cột hẹp);
// layout này chỉ là lớp truyền qua tối giản.
export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-paper min-h-screen">{children}</div>;
}
