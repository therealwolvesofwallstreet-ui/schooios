#!/usr/bin/env bash
# scripts/test-m2.sh — M2: Auth thật (4 role) + proxy gác trang (redirect chống-loop) + API 401/403.
# Tái dùng web/prisma/p9-fixture.ts (admin/staff/auditor/student mustChange=false; mcpUser mustChange=true).
# ⚠ Thử sai mật khẩu bằng identifier RIÊNG (P9 rate-limit 10/60s theo ip+identifier → tránh khoá user thật).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
SERVER_PID=""; SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STAFF="$(mktemp)"; JAR_AUD="$(mktemp)"; JAR_STU="$(mktemp)"
JAR_MCP="$(mktemp)"; JAR_EMPTY="$(mktemp)"; JAR_WRONG="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF" "$JAR_AUD" "$JAR_STU" "$JAR_MCP" "$JAR_EMPTY" "$JAR_WRONG"
}
trap cleanup EXIT INT TERM

_split_status() { printf '%s' "$1" | tail -n1; }
_split_body()   { printf '%s' "$1" | sed '$d'; }
api() { local jar="$1" m="$2" p="$3" d="${4:-}"
  if [ -n "$d" ]; then
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -H "Content-Type: application/json" -c "$jar" -b "$jar" -d "$d" "$BASE_URL$p"
  else
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -c "$jar" -b "$jar" "$BASE_URL$p"
  fi
}
has() { echo "$1" | grep -q "$2"; }
# Probe trang (KHÔNG follow redirect) → "STATUS REDIRECT_URL"
pageprobe() { curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 30 -c "$1" -b "$1" "$BASE_URL$2"; }

# ── 1. Fixture ──
echo "  → setup fixture (p9)"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
ADMIN_EMAIL="$(getv P9FX_ADMIN_EMAIL)"; STAFF1_EMAIL="$(getv P9FX_STAFF1_EMAIL)"
AUDITOR_EMAIL="$(getv P9FX_AUDITOR_EMAIL)"; STUDENT1_SBD="$(getv P9FX_STUDENT1_SBD)"
MCP_EMAIL="$(getv P9FX_MCP_EMAIL)"
for v in "$ADMIN_EMAIL" "$STAFF1_EMAIL" "$AUDITOR_EMAIL" "$STUDENT1_SBD" "$MCP_EMAIL"; do
  [ -z "$v" ] && { echo "    ✗ fixture thiếu login keys"; echo "$FIXTURE_OUT"; exit 1; }
done

# ── 2. Server ──
probe() { local c; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/auth/me" 2>/dev/null); echo "${c:-000}"; }
if [ "$(probe)" != "000" ]; then echo "  → dùng lại server tại $BASE_URL"; else
  echo "  → khởi động next dev"
  ( cd "$WEB" && exec ./node_modules/.bin/next dev ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!; ready=0
  for _ in $(seq 1 60); do [ "$(probe)" != "000" ] && { ready=1; break; }; sleep 1; done
  [ "$ready" = "1" ] || { echo "    ✗ server không sẵn sàng"; tail -20 "$SERVER_LOG" | sed 's/^/    /'; exit 1; }
fi

# ── 3. Đăng nhập đúng pw (4 role) → 200 + /me đúng role ──
echo "  → A. Login 4 role (đúng pw) + /me role"
login() { local jar="$1" id="$2"; api "$jar" POST /api/auth/login "{\"identifier\":\"$id\",\"password\":\"$PW\"}"; }
declare -A WANT=( [ADMIN]="$ADMIN_EMAIL" [STAFF]="$STAFF1_EMAIL" [AUDITOR]="$AUDITOR_EMAIL" [STUDENT]="$STUDENT1_SBD" )
declare -A JARS=( [ADMIN]="$JAR_ADMIN" [STAFF]="$JAR_STAFF" [AUDITOR]="$JAR_AUD" [STUDENT]="$JAR_STU" )
for r in ADMIN STAFF AUDITOR STUDENT; do
  out=$(login "${JARS[$r]}" "${WANT[$r]}"); s=$(_split_status "$out")
  expect_status "login $r" 200 "$s"
  me=$(api "${JARS[$r]}" GET /api/auth/me ""); mb=$(_split_body "$me")
  if has "$mb" "\"role\":\"$r\""; then ok "/me role=$r"; else no "/me role≠$r"; fi
done
# Cookie thật được set?
if grep -qi 'token' "$JAR_ADMIN"; then ok "cookie 'token' được set sau login"; else no "không thấy cookie token"; fi

# ── 4. Sai mật khẩu (identifier RIÊNG) → 401 ──
echo "  → B. Sai mật khẩu"
out=$(api "$JAR_WRONG" POST /api/auth/login "{\"identifier\":\"m2-wrongpw-probe@nobody.test\",\"password\":\"definitely-wrong\"}"); s=$(_split_status "$out")
expect_status "login sai pw (id riêng)" 401 "$s"

# ── 5. Proxy gác trang ──
echo "  → C. Proxy gác trang (redirect chống-loop)"
# anon → trang trong → /login
read -r st url <<<"$(pageprobe "$JAR_EMPTY" /report)"
expect_status "anon GET /report" 307 "$st"
case "$url" in *"/login") ok "anon /report → /login";; *) no "anon /report redirect = $url (mong /login)";; esac
# anon → /login → 200 (render, không loop)
read -r st url <<<"$(pageprobe "$JAR_EMPTY" /login)"
expect_status "anon GET /login (render)" 200 "$st"
# admin (đã auth, không mustChange) → /login → /
read -r st url <<<"$(pageprobe "$JAR_ADMIN" /login)"
expect_status "admin GET /login" 307 "$st"
case "$url" in *"://"*"/") ok "admin /login → / (vào app)";; *"/") ok "admin /login → /";; *) no "admin /login redirect = $url (mong /)";; esac
# admin → trang trong → 200
read -r st url <<<"$(pageprobe "$JAR_ADMIN" /report)"
expect_status "admin GET /report (vào được)" 200 "$st"

# ── 6. mustChangePassword (mcpUser) ──
echo "  → D. Ép đổi mật khẩu (mustChangePassword=true)"
out=$(login "$JAR_MCP" "$MCP_EMAIL"); s=$(_split_status "$out")
expect_status "login mcp (mustChange) — login vẫn 200" 200 "$s"
read -r st url <<<"$(pageprobe "$JAR_MCP" /report)"
expect_status "mcp GET /report" 307 "$st"
case "$url" in *"/change-password") ok "mcp /report → /change-password";; *) no "mcp /report redirect = $url (mong /change-password)";; esac
read -r st url <<<"$(pageprobe "$JAR_MCP" /change-password)"
expect_status "mcp GET /change-password (render, không loop)" 200 "$st"
out=$(api "$JAR_MCP" GET /api/cases ""); s=$(_split_status "$out"); b=$(_split_body "$out")
expect_status "mcp GET /api/cases" 403 "$s"
if has "$b" 'MUST_CHANGE_PASSWORD'; then ok "mcp /api → code MUST_CHANGE_PASSWORD"; else no "thiếu code MUST_CHANGE_PASSWORD"; fi

# ── 7. API thiếu token → 401 ──
echo "  → E. API thiếu token"
out=$(api "$JAR_EMPTY" GET /api/cases ""); s=$(_split_status "$out")
expect_status "anon GET /api/cases" 401 "$s"

echo ""
echo "  M2: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
