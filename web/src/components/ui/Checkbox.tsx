"use client";

import { cn } from "@/lib/cn";

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="border-line accent-signal h-4 w-4 cursor-pointer rounded"
      />
      {label && <span className="text-ink-2 select-none text-sm">{label}</span>}
    </label>
  );
}
