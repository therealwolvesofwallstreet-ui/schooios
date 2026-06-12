"use client";

// RELEASE BURST — Animation 01 "VOICE" (moodboard 3-KEY-ANIMATIONS): khoảnh khắc HS được lắng nghe.
// 7 NHỊP KỂ CHUYỆN bằng VECTOR/SVG + framer-motion (KHÔNG hạt GPU — moodboard là chuyển động UI, không
// particle; bản particle cũ "nhanh/kì/xấu" đã bỏ):
//   ① chấm xuất hiện · ② vòng sóng lan tỏa · ③ các node (đúng người) hiện · ④ đường kết nối hình thành ·
//   ⑤ hành trình xử lý hé lộ · ⑥ tín hiệu xác nhận ✓ · ⑦ thẻ "đã ghi nhận" + Case ID + nút Mở hồ sơ.
// Tông ẤM: --color-signal (Spiced Wine, KHÔNG đỏ tươi) · --color-mute (camel) · --color-ink*. Ease-out only
// (EASE_EMERGE). DỪNG ở nhịp ⑦ + nút "Mở hồ sơ" — caller điều hướng /cases/[id] (KHÔNG tự nhảy về home).
// 3-tier: reduced → thẻ TĨNH tức thì (KHÔNG narrative). A11y: vùng role=status (Case ID + lời xác nhận)
// render TỪ MOUNT + focus tiêu đề lúc mount → SR/keyboard đáp xuống xác nhận NGAY (không đợi ~5s); lớp SVG
// narrative aria-hidden (trang trí). Tải dynamic ssr:false từ caller → client-only (tính tier ở initializer).
import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SignalDot } from "@/components/ui/SignalDot";
import { detectBurstTier, type BurstTier } from "./release-burst/burst-tier";
import { EASE_EMERGE_BEZIER } from "@/lib/cubic-bezier";

export interface ReleaseBurstProps {
  /** Case ID server sinh (CASE-YYYY-00001) — KHÔNG tự chế ở FE. */
  caseCode: string;
  /** Đóng moment → caller điều hướng vào hồ sơ /cases/[id]. Tùy chọn. */
  onDone?: () => void;
  /** DEV-only: ép tier ở /styleguide/burst. reduced = thẻ tĩnh; high/mid = narrative. */
  forceTier?: BurstTier;
}

const EASE = EASE_EMERGE_BEZIER;

// 5 node "đúng người" trên vòng quanh tâm (viewBox 320×320, tâm 160,160).
const NODES = [
  { x: 160, y: 48 },
  { x: 266, y: 126 },
  { x: 226, y: 252 },
  { x: 94, y: 252 },
  { x: 54, y: 126 },
];

// ⑤ Hành trình xử lý (preview) — bước đầu SÁNG (đã ghi nhận), còn lại mờ (chặng phía trước).
const JOURNEY = ["Tiếng nói được ghi nhận", "Đang được xem xét", "Đã có người phụ trách", "Đang xử lý"];

// Lịch nhịp (ms từ mount): ① ② ③ ④ ⑤ ⑥ ⑦ — chậm-có-chủ-đích (~5.3s tới thẻ), rồi DỪNG chờ nút.
const BEATS = [0, 700, 1500, 2400, 3400, 4600, 5300];

export default function ReleaseBurst({ caseCode, onDone, forceTier }: ReleaseBurstProps) {
  // Client-only (dynamic ssr:false) → tính tier ngay ở initializer (không flash, reduced bắt từ render đầu).
  const [tier] = useState<BurstTier>(() => forceTier ?? detectBurstTier());
  const animated = tier !== "reduced";
  // beat: 0 chấm · 1 sóng · 2 node · 3 nối · 4 hành trình · 5 hội tụ/✓ · 6 thẻ. reduced → thẳng nhịp ⑦.
  const [beat, setBeat] = useState(animated ? 0 : 6);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const caseCodeId = useId();

  // SR/keyboard đáp xuống lời xác nhận NGAY (đọc accessible name dù opacity 0 + describedby Case ID).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Chuỗi nhịp (cleanup mọi timer khi unmount → 0 leak / 0 setState sau khi rời).
  useEffect(() => {
    if (!animated) return;
    const timers = BEATS.map((ms, i) => setTimeout(() => setBeat(i), ms));
    return () => timers.forEach(clearTimeout);
  }, [animated]);

  const showRipples = beat >= 1 && beat < 5;
  const showNetwork = beat >= 2 && beat < 5;
  const showJourney = beat >= 4 && beat < 5;
  const showCheck = beat >= 5;
  const showCard = beat >= 6;
  const nodeOrigin = { transformBox: "fill-box" as const, transformOrigin: "center" };

  return (
    <div className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* ── Lớp narrative (trang trí, aria-hidden, pointer-events-none) ── */}
      {animated && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <AnimatePresence>
            {beat < 6 && (
              <motion.svg
                key="net"
                viewBox="0 0 320 320"
                className="h-[min(74vmin,420px)] w-[min(74vmin,420px)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {/* ② vòng sóng lan tỏa */}
                <AnimatePresence>
                  {showRipples &&
                    [0, 0.9].map((d, i) => (
                      <motion.circle
                        key={`r${i}`}
                        cx={160}
                        cy={160}
                        fill="none"
                        stroke="var(--color-signal)"
                        strokeWidth={1.5}
                        initial={{ r: 8, opacity: 0.5 }}
                        animate={{ r: 92, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.8, ease: EASE, repeat: 1, delay: d }}
                      />
                    ))}
                </AnimatePresence>

                {/* ④ đường kết nối tiếng-nói → đúng người (vẽ dần) */}
                <AnimatePresence>
                  {showNetwork &&
                    NODES.map((n, i) => (
                      <motion.line
                        key={`l${i}`}
                        x1={160}
                        y1={160}
                        x2={n.x}
                        y2={n.y}
                        stroke="var(--color-mute)"
                        strokeWidth={1.25}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: EASE, delay: beat === 3 ? 0.05 * i : 0 }}
                      />
                    ))}
                </AnimatePresence>

                {/* ③ node "đúng người" */}
                <AnimatePresence>
                  {showNetwork &&
                    NODES.map((n, i) => (
                      <motion.circle
                        key={`n${i}`}
                        cx={n.x}
                        cy={n.y}
                        r={5}
                        fill="var(--color-mute)"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE, delay: beat === 2 ? 0.08 * i : 0 }}
                        style={nodeOrigin}
                      />
                    ))}
                </AnimatePresence>

                {/* ① chấm trung tâm → ⑥ nở thành đĩa xác nhận */}
                <motion.circle
                  cx={160}
                  cy={160}
                  fill="var(--color-signal)"
                  initial={{ r: 0 }}
                  animate={{ r: showCheck ? 26 : 7 }}
                  transition={{ duration: showCheck ? 0.5 : 0.6, ease: EASE }}
                />

                {/* ⑥ dấu ✓ (vẽ dần trên đĩa) */}
                {showCheck && (
                  <motion.path
                    d="M148 161 L157 170 L173 150"
                    fill="none"
                    stroke="var(--color-paper-raised)"
                    strokeWidth={3.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.45, ease: EASE, delay: 0.15 }}
                  />
                )}
              </motion.svg>
            )}
          </AnimatePresence>

          {/* ⑤ hành trình xử lý — hé lộ rồi nhường chỗ cho thẻ xác nhận */}
          <AnimatePresence>
            {showJourney && (
              <motion.ul
                key="journey"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="absolute bottom-[11%] left-1/2 flex -translate-x-1/2 flex-col gap-2.5 text-left"
              >
                {JOURNEY.map((s, i) => (
                  <motion.li
                    key={s}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.32, ease: EASE, delay: 0.12 * i }}
                    className="flex items-center gap-2.5"
                  >
                    <span
                      className={
                        i === 0 ? "bg-signal size-1.5 rounded-full" : "bg-line-2 size-1.5 rounded-full"
                      }
                    />
                    <span className={i === 0 ? "text-ink-2 text-xs" : "text-ink-3/70 text-xs"}>{s}</span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Xác nhận (VẬT MANG NGHĨA, role=status — render từ mount cho SR; reveal ở nhịp ⑦) ── */}
      <div role="status" aria-live="polite" className="relative z-10 flex flex-col items-center">
        <AnimatePresence>
          {showCard && (
            <motion.div
              key="confirm-dot"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mb-8"
            >
              <SignalDot tone="signal" size="lg" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          id={caseCodeId}
          initial={false}
          animate={{ opacity: showCard ? 1 : 0, y: showCard ? 0 : 8 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="text-ink-3 font-mono text-xs tracking-[0.18em] uppercase"
        >
          {caseCode}
        </motion.p>

        <motion.h2
          ref={headingRef}
          tabIndex={-1}
          aria-describedby={caseCodeId}
          initial={false}
          animate={{ opacity: showCard ? 1 : 0, y: showCard ? 0 : 8 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.06 }}
          className="text-ink mt-3 max-w-md font-serif text-2xl leading-snug outline-none md:text-3xl"
        >
          Báo cáo của bạn đã được ghi nhận
        </motion.h2>

        <motion.p
          initial={false}
          animate={{ opacity: showCard ? 1 : 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.12 }}
          className="text-ink-3 mt-3 max-w-sm text-sm"
        >
          Hồ sơ đã được mở. Trường sẽ tiếp nhận và phản hồi.
        </motion.p>

        {onDone && showCard && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.18 }}
            className="mt-10"
          >
            <Button variant="secondary" onClick={onDone}>
              Mở hồ sơ →
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
