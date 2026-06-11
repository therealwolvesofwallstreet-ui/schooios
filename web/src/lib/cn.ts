// Nối className tối giản (không kéo clsx/tailwind-merge — primitives tự kỷ luật token).
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
