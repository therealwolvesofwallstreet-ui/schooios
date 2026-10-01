import type { Metadata, Viewport } from "next";
import { Montserrat, Lexend } from "next/font/google";
import "./globals.css";

// Giọng chữ: Montserrat = display/tiêu đề · Lexend = UI + dữ liệu (mono fallback "Courier New").
// Biến gắn lên <html>, tokens.css ánh xạ ra font-display/sans/mono/serif.
const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const lexend = Lexend({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LTT SchooIOS",
  description: "Hệ thống vận hành sự vụ học đường số",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${lexend.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
