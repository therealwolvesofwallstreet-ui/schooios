// Input gạch-chân hairline (KHÔNG box). Có label (sans, uppercase nhỏ) + error (mono, signal).
// forwardRef để React Hook Form register() gắn trực tiếp. Lỗi field 400 hiển thị qua prop error.
import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-ink-3 text-[11px] font-medium tracking-wider uppercase"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "border-line text-ink placeholder:text-ink-3 w-full border-0 border-b bg-transparent px-0 py-2 text-sm transition-colors duration-150 ease-quiet outline-none",
          "focus:border-ink",
          error && "border-signal focus:border-signal",
          className,
        )}
        {...rest}
      />
      {error && <span className="text-signal font-mono text-xs">{error}</span>}
    </div>
  );
});
