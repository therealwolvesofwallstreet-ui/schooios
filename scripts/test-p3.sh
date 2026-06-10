#!/usr/bin/env bash
# scripts/test-p3.sh — kiểm thử Auth API (P3) end-to-end qua HTTP.
# Tự quản vòng đời server (dev mode: secure cookie off → round-trip được qua http localhost).
# Dùng fixture ephemeral (web/prisma/auth-fixture.ts) — KHÔNG đụng dữ liệu thật. Rerunnable.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"

PASS=0; FAIL=0
COOKIES="$(mktemp)"
ALLBODIES="$(mktemp)"
SERVER_PID=""
SERVER_LOG="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { # desc expected actual
  if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi
}

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/auth-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$COOKIES" "$ALLBODIES" "$SERVER_LOG"
}
trap cleanup EXIT INT TERM

# --- curl helpers: in body + dòng cuối = http_code ---
_split_status() { printf '%s' "$1" | tail -n1; }
_split_body()   { printf '%s' "$1" | sed '$d'; }

api_jar() { # METHOD PATH [DATA]
  local m="$1" p="$2" d="${3:-}"
  if [ -n "$d" ]; then
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -H "Content-Type: application/json" \
      -c "$COOKIES" -b "$COOKIES" -d "$d" "$BASE_URL$p"
  else
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -c "$COOKIES" -b "$COOKIES" "$BASE_URL$p"
  fi
}
api_anon() { # METHOD PATH [DATA] — không gửi/lưu cookie
  local m="$1" p="$2" d="${3:-}"
  if [ -n "$d" ]; then
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -H "Content-Type: application/json" \
      -d "$d" "$BASE_URL$p"
  else
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" "$BASE_URL$p"
  fi
}
track() { printf '%s\n' "$1" >> "$ALLBODIES"; } # gom body cho leak-check (case 11)

# ─────────────────────────── 1. Fixture ───────────────────────────
echo "  → setup fixture"
if ! ( cd "$WEB" && npx --no-install tsx prisma/auth-fixture.ts ); then
  echo "    ✗ không tạo được fixture"; exit 1
fi

# ─────────────────────── 2. Server (reuse / dev) ───────────────────────
# curl -w đã tự in "000" khi kết nối thất bại — KHÔNG thêm `|| echo 000` (sẽ thành "000\n000").
probe() { local c; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/auth/me" 2>/dev/null); echo "${c:-000}"; }
if [ "$(probe)" != "000" ]; then
  echo "  → dùng lại server đang chạy tại $BASE_URL"
else
  echo "  → khởi động next dev (secure cookie off cho http)"
  ( cd "$WEB" && exec ./node_modules/.bin/next dev ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  ready=0
  for _ in $(seq 1 60); do
    if [ "$(probe)" != "000" ]; then ready=1; break; fi
    sleep 1
  done
  if [ "$ready" != "1" ]; then
    echo "    ✗ server không sẵn sàng sau 60s"; echo "    --- server log (20 dòng cuối) ---"
    tail -20 "$SERVER_LOG" | sed 's/^/    /'; exit 1
  fi
fi

echo "  → chạy test cases"

# 1) Login đúng (sbd) → 200, có Set-Cookie token, mustChangePassword=true, KHÔNG có passwordHash
r=$(api_jar POST /api/auth/login '{"identifier":"T3-0001","password":"123456"}')
s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "1. login đúng" 200 "$s"
echo "$b" | grep -q '"mustChangePassword":true' && ok "1. body có mustChangePassword=true" || no "1. thiếu mustChangePassword=true"
grep -qi "token" "$COOKIES" && ok "1. có cookie token (Set-Cookie)" || no "1. không thấy cookie token"

# 2) Login sai mật khẩu → 401
r=$(api_anon POST /api/auth/login '{"identifier":"T3-0001","password":"WRONGPASS"}')
s2=$(_split_status "$r"); b2=$(_split_body "$r"); track "$b2"
expect_status "2. login sai mật khẩu" 401 "$s2"

# 3) Login định danh không tồn tại → 401, CÙNG thông điệp case 2
r=$(api_anon POST /api/auth/login '{"identifier":"T3-NOPE","password":"whatever"}')
s3=$(_split_status "$r"); b3=$(_split_body "$r"); track "$b3"
expect_status "3. login định danh không tồn tại" 401 "$s3"
[ "$b2" = "$b3" ] && ok "3. thông điệp 401 đồng nhất (chống enumeration)" || no "3. thông điệp 401 KHÁC nhau"

# 4) Thiếu field → 400
r=$(api_anon POST /api/auth/login '{"identifier":"T3-0001"}')
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "4. thiếu field" 400 "$s"

# 5) /me có cookie (đang mustChangePassword=true) → 200, trả user, KHÔNG có passwordHash
r=$(api_jar GET /api/auth/me)
s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "5. /me có cookie" 200 "$s"
echo "$b" | grep -q '"sbd":"T3-0001"' && ok "5. /me trả đúng user" || no "5. /me không trả user mong đợi"

# 5b) proxy chặn route khác khi mustChangePassword=true → 403 + code MUST_CHANGE_PASSWORD
r=$(api_jar GET /api/cases)
s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "5b. proxy chặn route khác (ép đổi MK)" 403 "$s"
echo "$b" | grep -q "MUST_CHANGE_PASSWORD" && ok "5b. có code MUST_CHANGE_PASSWORD" || no "5b. thiếu code MUST_CHANGE_PASSWORD"

# 6) /me KHÔNG cookie → 401
r=$(api_anon GET /api/auth/me)
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "6. /me không cookie" 401 "$s"

# 7) change-password sai currentPassword → 401
r=$(api_jar POST /api/auth/change-password '{"currentPassword":"WRONG","newPassword":"Test@123456"}')
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "7. change-password sai current" 401 "$s"

# 7b) change-password đặt LẠI mật khẩu cũ (123456 → 123456) → 400
r=$(api_jar POST /api/auth/change-password '{"currentPassword":"123456","newPassword":"123456"}')
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "7b. change-password trùng mật khẩu cũ" 400 "$s"

# 8) change-password đúng (123456 → Test@123456) → 200
r=$(api_jar POST /api/auth/change-password '{"currentPassword":"123456","newPassword":"Test@123456"}')
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "8. change-password đúng" 200 "$s"

# 9) /me sau đổi → mustChangePassword=false
r=$(api_jar GET /api/auth/me)
s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "9. /me sau đổi mật khẩu" 200 "$s"
echo "$b" | grep -q '"mustChangePassword":false' && ok "9. mustChangePassword=false" || no "9. mustChangePassword chưa về false"

# 10) logout → 200; /me sau logout → 401
r=$(api_jar POST /api/auth/logout)
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "10. logout" 200 "$s"
r=$(api_jar GET /api/auth/me)
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "10. /me sau logout" 401 "$s"

# 11) Không response nào chứa passwordHash / password_hash
if grep -qi "passwordHash\|password_hash" "$ALLBODIES"; then
  no "11. PHÁT HIỆN rò passwordHash trong response"
else
  ok "11. không response nào rò passwordHash"
fi

# ─────────────────────────── Tổng kết ───────────────────────────
echo ""
echo "  P3: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
