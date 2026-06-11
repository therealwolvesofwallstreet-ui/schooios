"use client";

// RELEASE BURST — khoảnh khắc HS được lắng nghe (stage moment #3, xem docs/motion-architecture.md).
// 2.2A = SHELL: chỉ tier reduced-motion/DOM-fade (mono Case ID + dòng serif xác nhận). Một dấu
// signal DUY NHẤT tụ lại làm tâm. Tier High (R3F particles) + Mid (Canvas 2D) sẽ thêm ở 2.2C.
// Tải qua dynamic(() => import(...), { ssr: false }) — KHÔNG vào ops bundle (luật §6/§8).
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SignalDot } from "@/components/ui/SignalDot";

export interface ReleaseBurstProps {
  /** Case ID server sinh (CASE-YYYY-00001) — KHÔNG tự chế ở FE. */
  caseCode: string;
  /** Đóng moment (vd: điều hướng về danh sách). Tùy chọn. */
  onDone?: () => void;
}

// ease-emerge (tokens.css) cho reveal — ease-out, KHÔNG spring/bounce.
const EASE_EMERGE = [0.16, 1, 0.3, 1] as const;

export default function ReleaseBurst({ caseCode, onDone }: ReleaseBurstProps) {
  // §7 LAW: null (pre-hydration) coi như reduced → KHÔNG lóe fade trước khi hook resolve.
  // Component tải qua dynamic(ssr:false) nên không cần mounted-gate; `?? true` chỉ chạm case null,
  // KHÔNG tắt animation của user không-reduced (false ?? true = false → vẫn animate).
  const reduced = useReducedMotion() ?? true;

  // Reduced-motion: hiện tĩnh tức thì (luật §7). Ngược lại: reveal nhẹ, tuần tự dot → ID → serif.
  const reveal = (delay: number) =>
    reduced
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.32, ease: EASE_EMERGE, delay },
        };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {/* TODO 2.2C: tier High (R3F GPU particles + Bloom) + tier Mid (Canvas 2D) bung→tụ về tâm này. */}
      <motion.div {...reveal(0)}>
        <SignalDot tone="signal" size="lg" />
      </motion.div>

      <motion.p
        {...reveal(0.08)}
        className="text-ink-3 mt-8 font-mono text-xs tracking-[0.18em] uppercase"
      >
        {caseCode}
      </motion.p>

      <motion.h2
        {...reveal(0.16)}
        className="text-ink mt-3 max-w-md font-serif text-2xl leading-snug md:text-3xl"
      >
        Tiếng nói của bạn đã được ghi nhận.
      </motion.h2>

      {onDone && (
        <motion.div {...reveal(0.24)} className="mt-10">
          <Button variant="secondary" onClick={onDone}>
            Xong
          </Button>
        </motion.div>
      )}
    </div>
  );
}
