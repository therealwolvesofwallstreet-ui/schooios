"use client";
// LANDING POINTER-PARALLAX (F5d) — theo dõi con trỏ cho hiệu ứng "phù điêu thở theo con trỏ" (Immersive
// Garden). Trả MỘT ref vị trí con trỏ ĐÃ CHUẨN HÓA [-1,1] (0 = giữa màn). GHI THẲNG ref (KHÔNG setState)
// ⇒ KHÔNG re-render, KHÔNG đụng React #418 (giữ nguyên fix F5c). Consumer TỰ nội suy ease-out:
//   • LandingStage (high): lerp uMouse TRONG useFrame → smoothing gắn vào frameloop, TỰ ĐÓNG BĂNG khi F5c
//     pause canvas off-screen (single active canvas KHÔNG vỡ — parallax chỉ "sống" trên canvas đang chạy).
//   • LandingCanvas (mid): lerp transform trong rAF riêng (DỪNG khi tới đích — KHÔNG loop nhàn rỗi).
//
// CHỈ pointer fine (chuột/trackpad). Touch/coarse → KHÔNG gắn listener, ref đứng yên {0,0} → KHÔNG parallax,
// KHÔNG lỗi (theo NĂNG LỰC, KHÔNG prefers-reduced-motion — owner "immersive cho mọi người"). Listener gắn ở
// WINDOW vì lớp trang trí landing là pointer-events-none (canvas KHÔNG nhận pointermove) → window là nguồn
// pointermove tin cậy; vòng đời bó theo mount của canvas landing. rAF-throttle (≤1 ghi/khung); cleanup gỡ
// listener + hủy rAF + reset ref khi unmount (0 leak).
import { useEffect, useRef } from "react";

export interface LandingPointer {
  x: number; // [-1,1] · âm = trái, dương = phải
  y: number; // [-1,1] · âm = trên, dương = dưới
}

export function useLandingPointer() {
  const ref = useRef<LandingPointer>({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Pointer fine-only: touch/coarse bỏ qua theo NĂNG LỰC (không gắn gì, không lỗi).
    if (!window.matchMedia("(pointer: fine)").matches) return;

    // ref.current là object useRef ỔN ĐỊNH (không phải DOM node, không reassign) → chụp 1 lần dùng ở cả
    // flush lẫn cleanup (đúng khuyến nghị react-hooks/exhaustive-deps, tránh đọc ref.current trong cleanup).
    const pt = ref.current;
    let frame = 0;
    let px = 0;
    let py = 0;
    const flush = () => {
      frame = 0;
      pt.x = px;
      pt.y = py;
    };
    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
      if (frame === 0) frame = requestAnimationFrame(flush); // rAF-throttle: ≤1 ghi/khung
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame !== 0) cancelAnimationFrame(frame);
      pt.x = 0;
      pt.y = 0;
    };
  }, []);

  return ref;
}
