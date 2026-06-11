// Đích điều hướng sau đăng nhập, theo VAI TRÒ.
// HIỆN TẠI (F2-1): mọi role → "/" — proxy cũng đẩy người đã-đăng-nhập về "/", và "/dashboard"
// CHƯA tồn tại (dựng ở F2-4). Giữ chữ ký nhận `role` để F2-4 chỉ cần đổi thân hàm
// (ADMIN/AUDITOR → "/dashboard") mà không phải sửa nơi gọi.
import type { Role } from "@/lib/api-types";

export function landingForRole(_role: Role): string {
  return "/";
}
