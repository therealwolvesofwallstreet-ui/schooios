// Button token-only (KHÔNG shadcn/shadow/gradient). 3 biến thể:
//  primary  = bg-signal (CTA chính — là phần tử signal DUY NHẤT của màn, dùng tiết chế)
//  secondary= viền hairline trên giấy
//  ghost    = không viền, chỉ mực
// Focus-ring nhìn thấy (a11y). Transition chỉ ease-quiet (ease-out), không spring/bounce.
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 ease-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<Variant, string> = {
  // text-white (không phải paper) để đạt WCAG AA trên signal đỏ: paper→4.45:1 (trượt), white→~4.97:1.
  primary: "bg-signal text-white hover:bg-emergency",
  secondary: "border border-line text-ink bg-transparent hover:bg-sunken",
  ghost: "text-ink-2 hover:text-ink hover:bg-sunken",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, VARIANT[variant], SIZE[size], className)}
      {...rest}
    />
  );
});
