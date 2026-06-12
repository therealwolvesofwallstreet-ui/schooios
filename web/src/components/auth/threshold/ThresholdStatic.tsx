"use client";
// THRESHOLD · REDUCED tier [LAW] — prefers-reduced-motion / SSR. DOM THUẦN trên nền DEPTH Cowhide warm:
// wordmark HAI GIỌNG là TEXT thật (Cormorant "Schoo" + Plex "IOS"), một dấu signal TĨNH, phụ đề mono khẽ.
// KHÔNG canvas, KHÔNG animation. Đây là thứ runner e2e (reduced-motion) thấy — phải đọc được, tĩnh.
import { SignalDot } from "@/components/ui/SignalDot";

export default function ThresholdStatic() {
  return (
    <div className="bg-depth absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
      <SignalDot tone="signal" size="lg" />
      <p className="text-3xl leading-none md:text-5xl">
        <span className="font-display text-on-depth italic">Schoo</span>
        <span className="text-on-depth-3">·</span>
        <span className="text-link-lift font-sans font-semibold">IOS</span>
      </p>
      <p className="text-on-depth-3 font-mono text-[11px] tracking-[0.3em] uppercase">Lưu khố sống</p>
    </div>
  );
}
