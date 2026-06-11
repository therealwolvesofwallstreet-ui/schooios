"use client";

// PULSEFIELD — "mạch hệ thống" trên Đài quan sát (AdminHome). HIỆN TẠI là PLACEHOLDER có SEAM CỨNG:
// interface + ngữ nghĩa ĐÓNG BĂNG để F4 thả "dashboard sống" vào mà KHÔNG refactor kiến trúc.
//
// ──────────────────────────────────────────────────────────────────────────────────────────────
// SEAM CONTRACT (ĐÓNG BĂNG cho F4 — freeze cả KIỂU lẫn Ý NGHĨA, F4 chỉ thay RUỘT bên trong):
//   • metrics      — payload dashboard sống (DashboardResponse | null). Placeholder NHẬN nhưng KHÔNG
//                    bắt buộc render từ nó; bản sống F4 đọc CHÍNH object này. KHÔNG fetch bên trong
//                    PulseField — dữ liệu do parent (AdminHome) sở hữu & truyền xuống.
//   • isLoading    — true khi metrics đang bay; placeholder/bản sống render trạng thái ĐIỀM TĨNH,
//                    KHÔNG spinner.
//   • reducedMotion— LUẬT: true ⇒ render TĨNH HOÀN TOÀN (no anim); mặc định = useReducedMotion() ?? true
//                    (null pre-hydration → reduced). Bản sống F4 PHẢI tôn trọng.
//   • className    — parent ĐỊNH kích thước; PulseField fill hộp, KHÔNG hardcode w/h.
//   • children     — slot phủ nội dung lên field.
//   Ranh giới placeholder↔sống: F4 thay NỘI BỘ; props + luật-kích-thước + luật-reduced-motion +
//   "data do parent sở hữu" là BẤT BIẾN. Sẵn sàng dynamic import ssr:false như ReleaseBurst.
// SEAM: F4 thay nội bộ, GIỮ PulseFieldProps + semantics ở trên.
// ──────────────────────────────────────────────────────────────────────────────────────────────
import { useReducedMotion } from "framer-motion";
import { SignalDot } from "@/components/ui/SignalDot";
import { cn } from "@/lib/cn";
import type { DashboardResponse } from "@/lib/api-types";

export interface PulseFieldProps {
  metrics: DashboardResponse | null;
  isLoading?: boolean;
  reducedMotion?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PulseField({ reducedMotion, className, children }: PulseFieldProps) {
  // reducedMotion mặc định theo hệ thống (null pre-hydration → reduced). Placeholder vốn TĨNH nên cờ
  // này hiện chưa đổi gì — nhưng GIỮ trong chữ ký để bản sống F4 dùng đúng từ render đầu (no flash).
  const systemReduced = useReducedMotion() ?? true;
  void (reducedMotion ?? systemReduced);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      aria-hidden="true"
      data-testid="pulsefield-placeholder"
    >
      {/* Nền tĩnh tối giản trong luật Lắng: lưới hairline mờ + 1 dấu signal NGỦ ở tâm. KHÔNG chiếm
          signal (đỏ), KHÔNG chuyển động — "đúng nhìn" cho placeholder. F4 thay khối này. */}
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <SignalDot tone="dormant" size="lg" />
      </div>
      {children}
    </div>
  );
}

export default PulseField;
