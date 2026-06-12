"use client";

// Route error boundary cho /cases/[id] — bắt MỌI throw lúc render (vd buildSpine gặp shape lạ nếu
// server vi phạm hợp đồng) → hiện lỗi ĐIỀM TĨNH + "Thử lại" (reset) thay vì màn lỗi mặc định của Next.
// Không phơi message kỹ thuật (anti-leak); reset() re-render lại segment.
export default function CaseDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-24">
      <p className="text-ink-3 font-mono text-xs">Không hiển thị được hồ sơ này.</p>
      <button
        type="button"
        onClick={reset}
        className="text-ink-2 hover:text-ink focus-visible:outline-ink rounded-sm text-xs underline-offset-4 transition-colors duration-150 ease-quiet hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Thử lại
      </button>
    </div>
  );
}
