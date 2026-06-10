import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🛠️ ĐỔI CHIẾN THUẬT: Di tản cục đỏ xuống góc dưới bên trái cho hợp lệ Type và không che Navbar
  devIndicators: {
    position: "bottom-left",
  },
};

export default nextConfig;