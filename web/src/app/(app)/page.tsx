// Trang chủ (app) = SERVER SHELL MỎNG: KHÔNG fetch, KHÔNG đọc session — chỉ render 1 client view.
// Mọi quyết định role + data-hook nằm trong <HomeView/> ("use client") để biên fetch gọn 1 chỗ
// (§1.6 fetch-boundary): server shell → client view → hook theo từng NHÁNH role.
import { HomeView } from "@/components/app/home/HomeView";

export default function HomePage() {
  return <HomeView />;
}
