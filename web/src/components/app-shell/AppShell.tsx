"use client";

// Khung 4 role: rail Sidebar (desktop) / drawer (mobile) + TopBar + main.
// Nguồn role = useSession (server-truth). Đang tải → skeleton thở. min-w-0 ở cột nội dung
// để mobile KHÔNG cuộn ngang. Drawer mobile trượt ease-emerge (tắt dưới reduced-motion).
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "@/hooks/useSession";
import { NAV_BY_ROLE } from "./nav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Skeleton } from "@/components/ui/Skeleton";

function SidebarSkeleton() {
  return (
    <div className="bg-authority flex h-full w-60 shrink-0 flex-col gap-2 p-4">
      <Skeleton className="mb-4 h-10 w-32 bg-white/10" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full bg-white/5" />
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = role ? NAV_BY_ROLE[role] : [];

  return (
    <div className="flex min-h-screen">
      {/* Rail desktop */}
      <aside className="hidden md:block">
        {isLoading ? <SidebarSkeleton /> : <Sidebar items={items} />}
      </aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              className="bg-authority/40 absolute inset-0"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              className="absolute inset-y-0 left-0"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <Sidebar items={items} onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cột nội dung */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} onToggleNav={() => setDrawerOpen(true)} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
