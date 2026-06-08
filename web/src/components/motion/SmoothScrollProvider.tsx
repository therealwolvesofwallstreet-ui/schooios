"use client";

import { ReactLenis } from '@studio-freight/react-lenis';
import { ReactNode } from 'react';

// 🛠️ PHÁ ĐẢO LỖI TYPE: Ép component lỗi về any và tắt cảnh báo ESLint CHỈ cho dòng này
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const SafeLenisApp = ReactLenis as any;

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return (
    <SafeLenisApp root options={{ lerp: 0.08, duration: 1.5, smoothWheel: true }}>
      {children}
    </SafeLenisApp>
  );
}