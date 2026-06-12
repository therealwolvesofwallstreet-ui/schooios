"use client";

// Hook MỎNG: đọc role từ useSession + tra PERMISSION_TABLE. Toàn bộ luật nằm ở
// lib/permission-view.ts (data table) để hook không phình thành "God Hook".
// can() chỉ để FE quyết RENDER hay không — KHÔNG thay enforcement của server.
import { useSession } from "./useSession";
import {
  PERMISSION_TABLE,
  type PermissionAction,
  type PermissionCtx,
} from "@/lib/permission-view";

export function usePermissionView() {
  const { role } = useSession();

  function can(action: PermissionAction, ctx?: PermissionCtx): boolean {
    if (!role) return false;
    return PERMISSION_TABLE[action](role, ctx);
  }

  return { role, can };
}
