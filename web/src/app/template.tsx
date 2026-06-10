"use client";

import { useEffect, useState } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Kích hoạt hiệu ứng trễ một nhịp cực nhỏ để trình duyệt kịp bắt sóng animation
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 20);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`transition-all duration-500 ease-out-expo ${
        isMounted 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4"
      }`}
    >
      {children}
    </div>
  );
}