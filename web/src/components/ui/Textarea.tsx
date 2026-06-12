// Textarea gạch-chân hairline (anh em của Input.tsx — KHÔNG box). label (sans, uppercase nhỏ) +
// error (mono, signal). forwardRef để React Hook Form / ref gắn trực tiếp. resize dọc nhẹ nhàng.
import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, rows = 4, ...rest },
  ref,
) {
  const reactId = useId();
  const textareaId = id ?? reactId;
  const errorId = `${textareaId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-ink-3 text-[11px] font-medium tracking-wider uppercase"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "border-line text-ink placeholder:text-ink-3 w-full resize-y border-0 border-b bg-transparent px-0 py-2 text-sm leading-relaxed transition-colors duration-150 ease-quiet outline-none",
          "focus:border-ink",
          error && "border-signal focus:border-signal",
          className,
        )}
        {...rest}
      />
      {error && (
        <span id={errorId} role="alert" className="text-signal font-mono text-xs">
          {error}
        </span>
      )}
    </div>
  );
});
