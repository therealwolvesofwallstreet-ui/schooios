// Nhóm (public): nền cho login / change-password (KHÔNG sidebar, KHÔNG provider app).
// Trang thật thuộc F2 — F1 chỉ khoá khung: giấy + canh giữa + nhẹ.
export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-paper flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
