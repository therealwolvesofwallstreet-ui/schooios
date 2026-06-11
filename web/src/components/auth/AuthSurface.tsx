// Khung NỀN dùng chung cho 2 trang auth (login + change-password) — tập trung giấy/khoảng-thở/
// bề-rộng/responsive/typography vào MỘT chỗ để 2 trang không lặp.
// - Có `aside` → split biên tập: trái = khoảnh khắc serif + dấu signal thở; phải = nội dung (form),
//   lề trái rộng. Mobile (390): xếp dọc, `aside` thành phần mở đầu ngắn.
// - Không `aside` → cột hẹp canh giữa (khoảnh khắc đổi mật khẩu).
// Token-only, ease-out, KHÔNG shadow. Không hook → để client page import mà vẫn nhẹ.
import type { ReactNode } from "react";

export function AuthSurface({
  aside,
  children,
}: {
  aside?: ReactNode;
  children: ReactNode;
}) {
  if (!aside) {
    return (
      <main className="bg-paper text-ink flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    );
  }

  return (
    <main className="bg-paper text-ink min-h-screen md:grid md:grid-cols-2">
      <aside className="flex flex-col justify-center gap-6 px-8 pt-20 pb-10 md:px-16 md:py-0 lg:px-24">
        {aside}
      </aside>
      <section className="flex flex-col justify-center px-8 pb-20 md:px-16 md:py-0">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}
