#!/usr/bin/env bash
# scripts/test-all.sh — Master verification script cho SchooIOS backend.
# Chạy sau khi implement xong mỗi phase: build pass? TypeScript sạch? schema hợp lệ?
# Dùng:
#   ./scripts/test-all.sh           # chạy tất cả check + mọi scripts/test-*.sh
#   ./scripts/test-all.sh p4        # chạy check + CHỈ scripts/test-p4.sh
# Exit 0 nếu tất cả pass; exit 1 + message rõ ràng nếu có lỗi.

set -uo pipefail

# --- Vị trí: tự tính repo root từ đường dẫn script (chạy được từ bất kỳ đâu) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"

# --- Màu (tắt nếu không phải terminal) ---
if [ -t 1 ]; then
  R='\033[31m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; B='\033[1m'; X='\033[0m'
else
  R=''; G=''; Y=''; C=''; B=''; X=''
fi

FAILED=()   # tên các bước fail
PHASE="${1:-}"

step()  { printf "${C}${B}▶ %s${X}\n" "$1"; }
pass()  { printf "${G}  ✓ %s${X}\n" "$1"; }
skip()  { printf "${Y}  ⏭ %s${X}\n" "$1"; }
fail()  { printf "${R}  ✗ %s${X}\n" "$1"; FAILED+=("$1"); }

printf "${B}=== SchooIOS · test-all ===${X}\n"
printf "root: %s\n\n" "$ROOT"

# --- Guard: dependencies đã cài chưa ---
if [ ! -d "$WEB/node_modules" ]; then
  printf "${R}${B}✗ Thiếu web/node_modules.${X} Chạy: ${B}cd web && npm install${X} rồi thử lại.\n"
  exit 1
fi

# --- 1. Build ---
step "Build (next build)"
BUILD_LOG="$ROOT/.build.log"
if (cd "$WEB" && npm run build --silent) >/dev/null 2>"$BUILD_LOG"; then
  pass "build pass"
else
  fail "build (next build)"
  printf "${R}    --- 30 dòng cuối build log ---${X}\n"
  tail -30 "$BUILD_LOG" 2>/dev/null | sed 's/^/    /'
fi
rm -f "$BUILD_LOG"

# --- 2. TypeScript ---
step "TypeScript (tsc --noEmit)"
TSC_OUT="$(cd "$WEB" && npx --no-install tsc --noEmit 2>&1)"
if [ $? -eq 0 ]; then
  pass "type-check sạch"
else
  fail "tsc --noEmit"
  printf "%s\n" "$TSC_OUT" | head -30 | sed 's/^/    /'
fi

# --- 3. Prisma (skip duyên dáng nếu chưa có schema/prisma) ---
step "Prisma (prisma validate)"
if [ ! -f "$WEB/prisma/schema.prisma" ]; then
  skip "chưa có prisma/schema.prisma (bỏ qua tới P2)"
elif [ ! -x "$WEB/node_modules/.bin/prisma" ] && [ ! -f "$WEB/node_modules/.bin/prisma" ]; then
  skip "prisma chưa cài (bỏ qua)"
else
  PRISMA_OUT="$(cd "$WEB" && npx --no-install prisma validate 2>&1)"
  if [ $? -eq 0 ]; then
    pass "schema hợp lệ"
  else
    fail "prisma validate"
    printf "%s\n" "$PRISMA_OUT" | head -30 | sed 's/^/    /'
  fi
fi

# --- 4. Phase-specific tests ---
step "Phase tests (scripts/test-*.sh)"
run_one() {
  local f="$1"
  printf "${C}  → %s${X}\n" "$(basename "$f")"
  if bash "$f"; then
    pass "$(basename "$f")"
  else
    fail "$(basename "$f")"
  fi
}

if [ -n "$PHASE" ]; then
  TARGET="$SCRIPT_DIR/test-$PHASE.sh"
  if [ -f "$TARGET" ]; then
    run_one "$TARGET"
  else
    fail "không tìm thấy scripts/test-$PHASE.sh"
  fi
else
  found=0
  for f in "$SCRIPT_DIR"/test-*.sh; do
    [ -e "$f" ] || continue
    [ "$(basename "$f")" = "test-all.sh" ] && continue
    found=1
    run_one "$f"
  done
  [ "$found" -eq 0 ] && skip "chưa có test-*.sh nào"
fi

# --- Tổng kết ---
echo ""
if [ "${#FAILED[@]}" -eq 0 ]; then
  printf "${G}${B}✅ ALL CHECKS PASSED${X}\n"
  exit 0
else
  printf "${R}${B}❌ FAILED (%d):${X}\n" "${#FAILED[@]}"
  for s in "${FAILED[@]}"; do printf "${R}   - %s${X}\n" "$s"; done
  exit 1
fi
