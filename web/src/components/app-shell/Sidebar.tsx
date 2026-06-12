"use client";

// Sidebar = surface quyền lực (authority = Cowhide #442d1c, KHÔNG navy). Nav theo role; active = signal + mực sáng.
// Icon Phosphor weight "light" (~1.5px). Dùng chung cho rail desktop & drawer mobile.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav";
import { SignalDot } from "@/components/ui/SignalDot";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Điều hướng chính"
      className="bg-authority flex h-full w-60 shrink-0 flex-col gap-1 p-4"
    >
      <div className="px-2 py-4">
        <span className="text-paper text-base font-semibold tracking-tight">SchooIOS</span>
        <p className="text-[11px] tracking-wider text-white/60 uppercase">Lưu khố sống</p>
      </div>

      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ease-quiet",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
                  active ? "bg-white/10 text-paper" : "text-white/65 hover:bg-white/5 hover:text-paper",
                )}
              >
                <Icon size={18} weight="light" className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && <SignalDot tone="signal" size="sm" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
