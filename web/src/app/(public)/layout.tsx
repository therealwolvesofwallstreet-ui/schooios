// Nhóm (public): login / change-password (KHÔNG sidebar, KHÔNG provider app — giữ nhẹ, server-only).
// Khung/bố cục: login = ThresholdScene (Landing→cuộn→login, F2c); change-password = components/auth/
// AuthSurface (cột hẹp). layout này chỉ là lớp truyền qua tối giản (nền paper cho change-password).
export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-paper min-h-screen">{children}</div>;
}
