"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Đăng ký ScrollTrigger với GSAP
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface RevealProps {
  children: React.ReactNode;
  delay?: number; // Độ trễ để tạo hiệu ứng lướt sóng (stagger)
  yOffset?: number; // Quãng đường trượt lên
}

export default function Reveal({ children, delay = 0, yOffset = 40 }: RevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      containerRef.current,
      { 
        y: yOffset, 
        opacity: 0 
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.8, // Thời gian tương đương --dur-slow
        delay: delay,
        ease: "power3.out", // Độ mượt chuẩn editorial
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 90%", // Kích hoạt khi phần tử chạm mốc 90% màn hình
          toggleActions: "play none none reverse",
        }
      }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="will-change-transform opacity-0">
      {children}
    </div>
  );
}