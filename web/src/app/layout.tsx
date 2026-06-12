import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Newsreader, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

// Giọng chữ (xem FRONTEND.md): Cormorant Garamond = display HERO (warm, latin/latin-ext) ·
// Plex Sans = UI · Plex Mono = dữ liệu/định danh · Newsreader = serif VN (khoảnh khắc người + fallback
// glyph tiếng Việt cho display — Cormorant thiếu dấu Việt → tự rớt sang Newsreader theo --font-display).
// Biến gắn lên <html>, tokens.css ánh xạ ra font-display/sans/mono/serif.
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SchooIOS",
  description: "Hệ thống vận hành sự vụ học đường số",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${cormorant.variable} ${plexSans.variable} ${plexMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
