"use client";
// F5c MOTION-BUDGET — "single active canvas" cho cảnh crossfade /login. ScrollController PHÁT phiên hiệu
// (landing/login/both) theo tiến trình cuộn; LandingStage + ThresholdStage NGHE để TẠM DỪNG frameloop khi
// layer của mình KHÔNG hiển thị → ở trạng thái nghỉ chỉ MỘT canvas render (hết LAG 2 context always-on).
// Sự kiện window thuần — KHÔNG thread state qua Stage seam / auth surface (giữ rủi ro thấp). Ngoài /login
// (vd /styleguide/landing) KHÔNG ai phát → phase mặc định "both" → cả hai chạy như cũ (harness KHÔNG đổi).
// Cũng pause khi tab ẩn (visibility API). KHÔNG prefers-reduced-motion — pause = năng lực/hiển thị.
import { useEffect, useState } from "react";

export type ScenePhase = "landing" | "login" | "both";
const PHASE_EVENT = "schoo:scene-phase";

// Pha HIỆN TẠI (singleton/lần-tải) — để canvas mount TRỄ (ThresholdStage nạp async qua dynamic+Suspense+
// dựng word-texture) đọc đúng pha ban đầu thay vì lỡ lần phát "landing" của ScrollController (nếu chỉ
// nghe event sẽ kẹt ở "both" → render thừa). emit cập nhật biến này + phát event cho ai đang nghe.
let current: ScenePhase = "both";

/** ScrollController phát phiên hiệu khi pha crossfade ĐỔI (KHÔNG mỗi frame). */
export function emitScenePhase(phase: ScenePhase): void {
  current = phase;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ScenePhase>(PHASE_EVENT, { detail: phase }));
}

/** Pha hiện tại — canvas mount trễ đọc làm state ban đầu (không lỡ lần phát trước khi nó kịp nghe). */
export function getScenePhase(): ScenePhase {
  return current;
}

/** Canvas có nên render KHÔNG: visible (tab) ∧ layer của mình đang hiển thị theo phase. layer=null
 *  (vd PulseField — không crossfade) → chỉ phụ thuộc visibility. Mặc định "both"/visible = an toàn. */
export function useCanvasActive(layer: "landing" | "login" | null): boolean {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<ScenePhase>(getScenePhase); // pha hiện tại lúc mount (kể cả mount trễ)
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    const onPhase = (e: Event) => setPhase((e as CustomEvent<ScenePhase>).detail);
    window.addEventListener(PHASE_EVENT, onPhase);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(PHASE_EVENT, onPhase);
    };
  }, []);
  if (!visible) return false;
  if (layer === "landing") return phase !== "login";
  if (layer === "login") return phase !== "landing";
  return true;
}

/** Nhịp frame để VERIFY single-active: rig đọc window.__mframe, đo Δ giữa 2 mẫu (canvas paused → Δ=0).
 *  Một phép gán đếm nhỏ mỗi frame — vô hại ở prod (đúng "frameloop log" mà gate F5c yêu cầu). */
export function bumpFrame(name: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __mframe?: Record<string, number> };
  const m = (w.__mframe ??= {});
  m[name] = (m[name] ?? 0) + 1;
}
