<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Known Next.js 16 landmines (verified in node_modules — đừng khám phá lại)
- **Middleware → Proxy.** `middleware.ts` ĐÃ DEPRECATED, đổi tên thành `proxy.ts`. Tạo `web/src/proxy.ts` export `proxy(request: NextRequest)` (hoặc default export) + optional `export const config = { matcher: [...] }`. TUYỆT ĐỐI không tạo `middleware.ts`. (Codemod: `npx @next/codemod@canary middleware-to-proxy .`)
- **Proxy runtime = Node.js mặc định** (không còn Edge-only). `runtime` segment config bị CẤM trong proxy (throw). Dù chạy Node, vẫn KHÔNG đụng Prisma/DB trong proxy — chỉ verify JWT bằng `jose` (stateless), giữ proxy nhẹ.
- **`cookies()` / `headers()` là ASYNC.** Trong route handler: `const c = await cookies()`. Trong proxy: dùng getter sync `request.cookies.get(...)`.
- Ref: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
