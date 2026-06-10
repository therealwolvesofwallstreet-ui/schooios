#!/usr/bin/env bash
# scripts/test-m1.sh — M1: 3 endpoint đọc mới (categories/locations/audit) + ma trận quyền.
# Bám hành vi CODE THẬT + docs/API.md. Tự quản vòng đời server (dev: secure cookie off).
# Tái dùng web/prisma/p9-fixture.ts để có login ADMIN + STUDENT hợp lệ (mustChangePassword=false).
# Dữ liệu lookup (categories≈11, locations≈96) đến từ SEED THẬT (prisma/seed.ts), không phải fixture.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
BODIES="$(mktemp)"        # mọi response → leak scan passwordHash
SERVER_PID=""; SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STU="$(mktemp)"; JAR_EMPTY="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$BODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STU" "$JAR_EMPTY"
}
trap cleanup EXIT INT TERM

_split_status() { printf '%s' "$1" | tail -n1; }
_split_body()   { printf '%s' "$1" | sed '$d'; }
api() { # JAR METHOD PATH [DATA]
  local jar="$1" m="$2" p="$3" d="${4:-}"
  if [ -n "$d" ]; then
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -H "Content-Type: application/json" \
      -c "$jar" -b "$jar" -d "$d" "$BASE_URL$p"
  else
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -c "$jar" -b "$jar" "$BASE_URL$p"
  fi
}
track() { printf '%s\n' "$1" >> "$BODIES"; }
has()   { echo "$1" | grep -q "$2"; }
jnum()  { echo "$1" | grep -o "\"$2\":[0-9]*" | head -1 | cut -d: -f2; }
# Đếm item top-level theo field DUY NHẤT ở mỗi object (tránh đếm nhầm field lồng nhau).
jcount(){ echo "$1" | grep -o "$2" | wc -l | tr -d ' '; }

# ─────────── 1. Fixture (login hợp lệ) ───────────
echo "  → setup fixture (p9)"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
ADMIN_EMAIL="$(getv P9FX_ADMIN_EMAIL)"; STUDENT1_SBD="$(getv P9FX_STUDENT1_SBD)"
if [ -z "$ADMIN_EMAIL" ] || [ -z "$STUDENT1_SBD" ]; then
  echo "    ✗ fixture thiếu login keys"; echo "$FIXTURE_OUT"; exit 1
fi

# ─────────── 2. Server (reuse / dev) ───────────
probe() { local c; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/auth/me" 2>/dev/null); echo "${c:-000}"; }
if [ "$(probe)" != "000" ]; then
  echo "  → dùng lại server đang chạy tại $BASE_URL"
else
  echo "  → khởi động next dev"
  ( cd "$WEB" && exec ./node_modules/.bin/next dev ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  ready=0
  for _ in $(seq 1 60); do
    if [ "$(probe)" != "000" ]; then ready=1; break; fi
    sleep 1
  done
  if [ "$ready" != "1" ]; then
    echo "    ✗ server không sẵn sàng sau 60s"; tail -20 "$SERVER_LOG" | sed 's/^/    /'; exit 1
  fi
fi

# ─────────── 3. Đăng nhập (login ghi AuditLog → /audit có dữ liệu) ───────────
login() { local jar="$1" id="$2"; local r; r=$(api "$jar" POST /api/auth/login "{\"identifier\":\"$id\",\"password\":\"$PW\"}"); track "$(_split_body "$r")"; [ "$(_split_status "$r")" = "200" ]; }
login "$JAR_ADMIN" "$ADMIN_EMAIL"   || { echo "    ✗ login admin fail"; exit 1; }
login "$JAR_STU"   "$STUDENT1_SBD"  || { echo "    ✗ login student fail"; exit 1; }

# ─────────── 4. /api/categories ───────────
echo "  → A. /api/categories"
r=$(api "$JAR_ADMIN" GET /api/categories ""); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "GET /categories [ADMIN]" 200 "$s"
CAT_N=$(jcount "$b" '"defaultSensitive"')
if [ "${CAT_N:-0}" -ge 10 ]; then ok "categories seeded thật (n=$CAT_N ≈ 11)"; else no "categories quá ít (n=$CAT_N, mong ≥10)"; fi
if has "$b" '"categories"'; then ok "categories: key bọc đúng"; else no "categories: thiếu key bọc"; fi

r=$(api "$JAR_STU" GET /api/categories ""); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "GET /categories [STUDENT] (mọi role auth)" 200 "$s"
r=$(api "$JAR_EMPTY" GET /api/categories ""); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "GET /categories [ANON]" 401 "$s"

# ─────────── 5. /api/locations ───────────
echo "  → B. /api/locations"
r=$(api "$JAR_ADMIN" GET /api/locations ""); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "GET /locations [ADMIN]" 200 "$s"
LOC_N=$(jcount "$b" '"buildingId"')
if [ "${LOC_N:-0}" -ge 90 ]; then ok "locations seeded thật (n=$LOC_N ≈ 96)"; else no "locations quá ít (n=$LOC_N, mong ≥90)"; fi
if has "$b" '"building"'; then ok "locations: có quan hệ building"; else no "locations: thiếu building"; fi

r=$(api "$JAR_STU" GET /api/locations ""); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "GET /locations [STUDENT]" 200 "$s"
r=$(api "$JAR_EMPTY" GET /api/locations ""); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "GET /locations [ANON]" 401 "$s"

# ─────────── 6. /api/audit (ADMIN/AUDITOR only) ───────────
echo "  → C. /api/audit"
r=$(api "$JAR_ADMIN" GET /api/audit ""); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "GET /audit [ADMIN]" 200 "$s"
A_TOTAL=$(jnum "$b" total)
if [ "${A_TOTAL:-0}" -ge 1 ]; then ok "audit có dữ liệu (total=$A_TOTAL, ≥1 do LOGIN)"; else no "audit total=$A_TOTAL (mong ≥1)"; fi
if has "$b" '"logs"' && has "$b" '"page"' && has "$b" '"totalPages"'; then ok "audit: envelope {logs,total,page,totalPages}"; else no "audit: envelope sai"; fi
if has "$b" '"entityType"' && has "$b" '"action"'; then ok "audit: log item có action+entityType"; else no "audit: log item thiếu field"; fi

# Phân trang tất định: limit=1 → đúng 1 item, page=1
r=$(api "$JAR_ADMIN" GET "/api/audit?limit=1" ""); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "GET /audit?limit=1 [ADMIN]" 200 "$s"
P1_N=$(jcount "$b" '"entityType"'); P1_PAGE=$(jnum "$b" page)
if [ "${P1_N:-0}" -eq 1 ]; then ok "audit limit=1 → đúng 1 log"; else no "audit limit=1 → $P1_N log (mong 1)"; fi
if [ "${P1_PAGE:-0}" = "1" ]; then ok "audit page=1"; else no "audit page=$P1_PAGE (mong 1)"; fi

# Query sai (page=0 < min 1) → 400
r=$(api "$JAR_ADMIN" GET "/api/audit?page=0" ""); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "GET /audit?page=0 (zod fail)" 400 "$s"

# Role gate: STUDENT → 403, ANON → 401
r=$(api "$JAR_STU" GET /api/audit ""); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "GET /audit [STUDENT]" 403 "$s"
r=$(api "$JAR_EMPTY" GET /api/audit ""); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "GET /audit [ANON]" 401 "$s"

# ─────────── 7. Leak scan (passwordHash KHÔNG bao giờ xuất hiện) ───────────
echo "  → D. leak scan"
if grep -qi 'passwordHash' "$BODIES"; then no "RÒ passwordHash trong response!"; else ok "không rò passwordHash"; fi

echo ""
echo "  M1: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
