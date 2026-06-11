"use client";

// HomeView = bộ định tuyến role CLIENT của trang chủ (§1.6). LUẬT:
//  1) isLoading → skeleton TRUNG TÍNH (CHƯA branch role, CHƯA mount data-hook nào) → chống "flash"
//     dashboard/list sai-role trước khi /me resolve.
//  2) Sau khi role resolve mới BRANCH bằng CONDITIONAL RENDER (không if-trong-hook).
//  3) useDashboardMetrics CHỈ nằm trong cây AdminHome (ADMIN/AUDITOR) ⇒ STAFF/STUDENT = 0 call /dashboard.
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/app/states";
import { AdminHome } from "./AdminHome";
import { StaffHome } from "./StaffHome";
import { StudentHome } from "./StudentHome";

export function HomeView() {
  const { user, role, isLoading, isError, refetch } = useSession();

  // GATE: chưa biết role → skeleton trung tính. KHÔNG render bất kỳ home cụ thể nào (no-flash).
  if (isLoading || (!user && !isError)) return <HomeSkeleton />;
  if (isError || !user || !role) return <ErrorState onRetry={() => void refetch()} />;

  // BRANCH theo role — mỗi nhánh sở hữu data-hook RIÊNG (Admin: /dashboard; Staff/Student: /cases).
  if (role === "ADMIN" || role === "AUDITOR") {
    return <AdminHome readOnly={role === "AUDITOR"} />;
  }
  if (role === "STAFF") return <StaffHome user={user} />;
  return <StudentHome user={user} />;
}

// Skeleton trung tính: KHÔNG để lộ cấu trúc theo role (không metric grid, không bucket) — chỉ "khung".
function HomeSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" data-testid="home-skeleton">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-2/3" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-5/6" />
        <Skeleton className="h-12 w-4/6" />
      </div>
    </div>
  );
}
