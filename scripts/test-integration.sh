#!/usr/bin/env bash
# scripts/test-integration.sh — GATE TỔNG hợp nhất (chạy RIÊNG, không qua glob test-all).
#   1) Contract-guard grep (web/src/{store,app,components}): KHÔNG isConfidential / 'SOS-' /
#      localStorage / persist( / status-VN literal ở tầng dữ liệu.
#   2) e2e (best-effort): chạy nếu Playwright đã cài; nếu không → TODO thủ công (KHÔNG block).
#   3) Full gate: test-all.sh (build + tsc + prisma validate + test-p3..p9 + test-m1..m4).
# PASS = guard sạch + test-all xanh.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
SRC="$WEB/src"
GUARD_FAIL=0

echo "=== SchooIOS · test-integration ==="

# ── 1. Contract guard ──
echo "▶ Contract guard (tầng dữ liệu: store/app/components)"
guard() { # REGEX LABEL
  local hits
  hits=$(grep -rnE "$1" "$SRC/store" "$SRC/app" "$SRC/components" 2>/dev/null)
  if [ -n "$hits" ]; then
    echo "  ✗ FOUND $2:"; echo "$hits" | sed 's/^/      /'; GUARD_FAIL=1
  else
    echo "  ✓ no $2"
  fi
}
guard 'isConfidential'                                                            "isConfidential (phải dùng isSensitive)"
guard 'SOS-'                                                                      "client-gen id 'SOS-'"
guard 'localStorage\[|localStorage\.|window\.localStorage'                        "localStorage access (lưu phía client)"
guard 'persist\('                                                                 "zustand persist"
guard 'Chờ tiếp nhận|Đang xử lý|Đã giải quyết|Đã phân loại|Đã giao|Chờ phản hồi|Đã đóng' "status-VN literal ở tầng dữ liệu (chỉ được ở lib/case-display.ts)"

# ── 2. e2e best-effort ──
echo "▶ E2E (Playwright, best-effort)"
if [ -d "$WEB/node_modules/@playwright/test" ]; then
  echo "  → Playwright đã cài. Chạy: (cd web && E2E_* npx playwright test). (Không chạy tự động trong gate.)"
else
  echo "  ⏭ Playwright CHƯA cài → e2e = TODO thủ công:"
  echo "     cd web && npm i -D @playwright/test && npx playwright install chromium && \\"
  echo "     E2E_PASSWORD=.. E2E_STUDENT_SBD=.. E2E_STAFF_EMAIL=.. E2E_ADMIN_EMAIL=.. npx playwright test"
  echo "     (Gate cứng KHÔNG phụ thuộc e2e — critical path đã phủ bởi test-m1..m4 + test-p3..p9.)"
fi

# ── 3. Full gate ──
echo "▶ Full gate (test-all.sh: build + tsc + prisma + test-p3..p9 + test-m1..m4)"
if bash "$SCRIPT_DIR/test-all.sh"; then ALL_FAIL=0; else ALL_FAIL=1; fi

echo ""
echo "=== KẾT QUẢ test-integration ==="
echo "  contract-guard: $([ "$GUARD_FAIL" = 0 ] && echo PASS || echo FAIL)"
echo "  full test-all : $([ "$ALL_FAIL" = 0 ] && echo PASS || echo FAIL)"
if [ "$GUARD_FAIL" = 0 ] && [ "$ALL_FAIL" = 0 ]; then
  echo "✅ INTEGRATION GATE PASS"
  exit 0
else
  echo "❌ INTEGRATION GATE FAIL"
  exit 1
fi
