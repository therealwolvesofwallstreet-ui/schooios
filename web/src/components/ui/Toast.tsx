"use client";

// Toast renderer — đọc store/toast (Zustand). Vào/ra bằng framer-motion (ease-emerge, KHÔNG bounce).
// Giọng: info = hairline/ink · success = gold · error = signal (dot báo nghĩa). Tự dismiss ~4.5s.
// reduced-motion: globals.css ép duration ~0 → vẫn hiển thị, không animate (ổn định screenshot).
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToastQueue, type ToastItem, type ToastTone } from "@/store/toast";
import { SignalDot, type SignalTone } from "./SignalDot";
import { cn } from "@/lib/cn";

const TONE_DOT: Record<ToastTone, SignalTone> = {
  info: "running",
  success: "gold",
  error: "signal",
};
const TONE_BORDER: Record<ToastTone, string> = {
  info: "border-line",
  success: "border-gold",
  error: "border-signal",
};

const AUTO_DISMISS_MS = 4500;

function ToastRow({ toast }: { toast: ToastItem }) {
  const dismiss = useToastQueue((s) => s.dismiss);
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      className={cn(
        "bg-paper-raised text-ink flex items-center gap-3 rounded-md border px-4 py-3 text-sm",
        TONE_BORDER[toast.tone],
      )}
    >
      <SignalDot tone={TONE_DOT[toast.tone]} size="sm" />
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Đóng thông báo"
        className="text-ink-3 hover:text-ink transition-colors duration-150 ease-quiet"
      >
        ×
      </button>
    </motion.div>
  );
}

export function Toast() {
  const toasts = useToastQueue((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastRow toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
