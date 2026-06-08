import { Fraunces, Be_Vietnam_Pro } from "next/font/google";
import SmoothScrollProvider from "@/components/motion/SmoothScrollProvider";
import WorldWrapper from "@/components/layout/WorldWrapper";
import Navbar from "@/components/layout/Navbar"; // 🛠️ IMPORT NAVBAR CHÍNH CHỦ
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["vietnamese"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata = {
  title: "SchoolOS - Hệ thống vận hành sự vụ số",
  description: "Bảng tin, điều phối và xử lý sự cố học đường thế hệ mới",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${beVietnamPro.variable} antialiased`}>
      <body className="font-body selection:bg-cyan selection:text-ink">
        <SmoothScrollProvider>
          {/* 🛠️ BỌC WORLD WRAPPER ĐỂ QUẢN LÝ THEME THEO ROLE */}
          <WorldWrapper>
            {/* 🛠️ ĐẶT NAVBAR VÀO ĐÂY ĐỂ NÓ PHỦ SÓNG TOÀN BỘ TRANG WEB */}
            <Navbar /> 
            
            {children}
          </WorldWrapper>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}