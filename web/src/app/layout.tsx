import { Fraunces, Be_Vietnam_Pro } from "next/font/google";
import type { Metadata, Viewport } from "next"; 
import SmoothScrollProvider from "@/components/motion/SmoothScrollProvider";
import WorldWrapper from "@/components/layout/WorldWrapper";
import Navbar from "@/components/layout/Navbar";
import AuthGuard from "@/components/layout/AuthGuard";
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

// 🛠️ ĐÃ CỨU NGUY: Giữ nguyên viewport và metadata chạy ở môi trường Server Component
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "SchoolOS - Hệ thống vận hành sự vụ số",
  description: "Bảng tin, điều phối và xử lý sự cố học đường thế hệ mới",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${beVietnamPro.variable} antialiased`}>
      <body className="font-body selection:bg-cyan selection:text-ink">
        <SmoothScrollProvider>
          <WorldWrapper>
            <AuthGuard>
              <Navbar /> 
              {children}
            </AuthGuard>
          </WorldWrapper>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}