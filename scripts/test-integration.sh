#!/usr/bin/env bash
# scripts/test-integration.sh — GATE TỔNG hợp nhất (chạy RIÊNG, không qua glob test-all).
# Khác test-all: dùng MỘT next dev DÙNG CHUNG cho mọi phase test thay vì để mỗi test tự
# boot/kill server. Boot 11 lần liên tiếp làm CẠN connection-pool Supabase (dev) + tranh chấp
# port → fixture lỗi PrismaError/000 GIẢ (không phải bug sản phẩm). Shared-server loại churn đó.
# Trình tự: contract-guard → static (tsc/prisma/build, KHÔNG server) → boot 1 server →
#   test-{p3..p7,p9,m1..m4} (reuse server) → kill server → test-p8 (hermetic, cần build riêng) → verdict.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
SRC="$WEB/src"
BASE_URL="${BASE_URL:-http://localhost:3000}"
GUARD_FAIL=0
FAILED=()
SERVER_LOG="$(mktemp)"
SERVER_PID=""

cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1; rm -f "$SERVER_LOG"; }
trap cleanup EXIT INT TERM

echo "=== SchooIOS · test-integration (shared-server) ==="

# ── 1. Contract guard (store/app/components/lib, trừ case-display.ts) ──
echo "▶ Contract guard"
guard() {
  local hits
  hits=$(grep -rnE "$1" "$SRC/store" "$SRC/app" "$SRC/components" "$SRC/lib" 2>/dev/null | grep -v '/case-display\.ts:')
  if [ -n "$hits" ]; then echo "  ✗ FOUND $2:"; echo "$hits" | sed 's/^/      /'; GUARD_FAIL=1; else echo "  ✓ no $2"; fi
}
guard 'isConfidential' "isConfidential (phải dùng isSensitive)"
guard 'SOS-' "client-gen id 'SOS-'"
guard 'localStorage\[|localStorage\.|window\.localStorage' "localStorage access (lưu phía client)"
guard 'persist\(' "zustand persist"
guard 'Chờ tiếp nhận|Đang xử lý|Đã giải quyết|Đã phân loại|Đã giao|Chờ phản hồi|Đã đóng' "status-VN literal ở tầng dữ liệu"

# ── 2. Static checks (KHÔNG có server đang chạy → build an toàn) ──
echo "▶ Static (tsc / prisma validate / next build)"
( cd "$WEB" && npx --no-install tsc --noEmit ) >/dev/null 2>&1 && echo "  ✓ tsc --noEmit" || { echo "  ✗ tsc"; FAILED+=(tsc); }
( cd "$WEB" && npx --no-install prisma validate ) >/dev/null 2>&1 && echo "  ✓ prisma validate" || { echo "  ✗ prisma validate"; FAILED+=(prisma); }
( cd "$WEB" && npm run build --silent ) >/dev/null 2>"$ROOT/.intbuild.log" && echo "  ✓ next build" || { echo "  ✗ next build"; tail -15 "$ROOT/.intbuild.log" | sed 's/^/      /'; FAILED+=(build); }
rm -f "$ROOT/.intbuild.log"

# ── 3. Boot 1 shared next dev ──
probe() { local c; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/auth/me" 2>/dev/null); echo "${c:-000}"; }
echo "▶ Boot shared next dev"
if [ "$(probe)" != "000" ]; then
  echo "  → dùng lại server tại $BASE_URL"
else
  ( cd "$WEB" && exec ./node_modules/.bin/next dev ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  ready=0
  for _ in $(seq 1 90); do [ "$(probe)" != "000" ] && { ready=1; break; }; sleep 1; done
  [ "$ready" = "1" ] && echo "  ✓ server ready (pid $SERVER_PID)" || { echo "  ✗ server không sẵn sàng"; tail -20 "$SERVER_LOG" | sed 's/^/      /'; FAILED+=(server); }
fi

# ── 4. Phase tests trên SHARED server (export BASE_URL → mỗi test probe thấy → reuse, KHÔNG boot/kill) ──
export BASE_URL
echo "▶ Phase tests (shared server)"
for t in p3 p4 p5 p6 p7 p9 m1 m2 m3 m4; do
  f="$SCRIPT_DIR/test-$t.sh"; [ -f "$f" ] || continue
  if bash "$f" >"/tmp/int-$t.log" 2>&1; then
    echo "  ✓ test-$t.sh   $(grep -oE '(P[0-9]|M[0-9]): PASS=[0-9]+  FAIL=[0-9]+' "/tmp/int-$t.log" | tail -1)"
  else
    echo "  ✗ test-$t.sh"; grep -E "✗|FAIL=|mong|sẵn sàng|fixture" "/tmp/int-$t.log" | tail -8 | sed 's/^/      /'; FAILED+=("test-$t")
  fi
  sleep 2 # settle: teardown fixture + nhả connection trước test kế (tránh churn)
done

# ── 5. Kill shared server TRƯỚC test-p8 (p8 tự next build hermetic — tránh tranh chấp .next) ──
if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" >/dev/null 2>&1; SERVER_PID=""; sleep 3; fi
echo "▶ test-p8.sh (CI-mirror hermetic — chạy sau khi tắt dev server)"
if bash "$SCRIPT_DIR/test-p8.sh" >"/tmp/int-p8.log" 2>&1; then
  echo "  ✓ test-p8.sh   $(grep -oE 'P8: PASS=[0-9]+  FAIL=[0-9]+' /tmp/int-p8.log | tail -1)"
else
  echo "  ✗ test-p8.sh"; grep -E "✗|FAIL=" /tmp/int-p8.log | tail -10 | sed 's/^/      /'; FAILED+=(test-p8)
fi

# ── 6. e2e best-effort ──
echo "▶ E2E (best-effort)"
if [ -d "$WEB/node_modules/@playwright/test" ]; then
  echo "  → Playwright đã cài (chạy tay: cd web && npx playwright test)"
else
  echo "  ⏭ Playwright chưa cài → e2e = TODO thủ công (gate cứng KHÔNG phụ thuộc e2e)"
fi

# ── 7. Verdict ──
echo ""
echo "=== KẾT QUẢ test-integration ==="
echo "  contract-guard: $([ "$GUARD_FAIL" = 0 ] && echo PASS || echo FAIL)"
echo "  failed steps  : ${FAILED[*]:-none}"
if [ "$GUARD_FAIL" = 0 ] && [ "${#FAILED[@]}" -eq 0 ]; then
  echo "✅ INTEGRATION GATE PASS"; exit 0
else
  echo "❌ INTEGRATION GATE FAIL"; exit 1
fi
