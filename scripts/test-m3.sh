#!/usr/bin/env bash
# scripts/test-m3.sh — M3: Cases/Report flows mà FE dùng (create/list/detail/comment/status).
# Bám CODE THẬT (P4–P7). Tái dùng web/prisma/p9-fixture.ts.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
BODIES="$(mktemp)"
SERVER_PID=""; SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STAFF="$(mktemp)"; JAR_STU="$(mktemp)"; JAR_AUD="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
es()  { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$BODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF" "$JAR_STU" "$JAR_AUD"
}
trap cleanup EXIT INT TERM

_st() { printf '%s' "$1" | tail -n1; }
_bd() { printf '%s' "$1" | sed '$d'; }
api() { local jar="$1" m="$2" p="$3" d="${4:-}"
  if [ -n "$d" ]; then
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -H "Content-Type: application/json" -c "$jar" -b "$jar" -d "$d" "$BASE_URL$p"
  else
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -c "$jar" -b "$jar" "$BASE_URL$p"
  fi
}
track(){ printf '%s\n' "$1" >> "$BODIES"; }
has() { echo "$1" | grep -q "$2"; }
first_id(){ echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

# ── Fixture ──
echo "  → setup fixture (p9)"
FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts )" || { echo "$FIXTURE_OUT"; exit 1; }
getv(){ echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
CAT="$(getv P9FX_CAT)"; C_PUBLIC="$(getv P9FX_C_PUBLIC)"; C_SENS="$(getv P9FX_C_SENS)"
ADMIN_EMAIL="$(getv P9FX_ADMIN_EMAIL)"; STAFF1_EMAIL="$(getv P9FX_STAFF1_EMAIL)"
AUDITOR_EMAIL="$(getv P9FX_AUDITOR_EMAIL)"; STUDENT1_SBD="$(getv P9FX_STUDENT1_SBD)"
for v in "$CAT" "$C_PUBLIC" "$C_SENS" "$ADMIN_EMAIL" "$STAFF1_EMAIL" "$STUDENT1_SBD"; do
  [ -z "$v" ] && { echo "    ✗ fixture thiếu key"; echo "$FIXTURE_OUT"; exit 1; }
done

# ── Server ──
probe(){ local c; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/auth/me" 2>/dev/null); echo "${c:-000}"; }
if [ "$(probe)" != "000" ]; then echo "  → dùng lại server"; else
  echo "  → khởi động next dev"
  ( cd "$WEB" && exec ./node_modules/.bin/next dev ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!; ready=0
  for _ in $(seq 1 60); do [ "$(probe)" != "000" ] && { ready=1; break; }; sleep 1; done
  [ "$ready" = "1" ] || { echo "    ✗ server không sẵn sàng"; tail -20 "$SERVER_LOG" | sed 's/^/    /'; exit 1; }
fi

# ── Login ──
login(){ local jar="$1" id="$2"; local r; r=$(api "$jar" POST /api/auth/login "{\"identifier\":\"$id\",\"password\":\"$PW\"}"); track "$(_bd "$r")"; [ "$(_st "$r")" = "200" ]; }
login "$JAR_ADMIN" "$ADMIN_EMAIL"  || { echo "✗ login admin"; exit 1; }
login "$JAR_STAFF" "$STAFF1_EMAIL" || { echo "✗ login staff"; exit 1; }
login "$JAR_STU"   "$STUDENT1_SBD" || { echo "✗ login student"; exit 1; }
login "$JAR_AUD"   "$AUDITOR_EMAIL"|| { echo "✗ login auditor"; exit 1; }

# ── A. STUDENT tạo case → 201 + caseCode ──
echo "  → A. Create (FE body shape)"
CREATE='{"title":"[M3] Su vu kiem thu tao moi","description":"Mo ta chi tiet du dai de qua zod min 10 ky tu.","categoryId":"'"$CAT"'","priority":"MEDIUM","emergency":false,"sensitive":false}'
r=$(api "$JAR_STU" POST /api/cases "$CREATE"); s=$(_st "$r"); b=$(_bd "$r"); track "$b"
es "STUDENT POST /cases" 201 "$s"
if has "$b" '"caseCode":"CASE-'; then ok "có caseCode (DB-gen)"; else no "thiếu caseCode"; fi
NEW_ID="$(first_id "$b")"
[ -n "$NEW_ID" ] && ok "lấy được case id" || no "không parse được case id"

# AUDITOR không được tạo
r=$(api "$JAR_AUD" POST /api/cases "$CREATE"); s=$(_st "$r"); track "$(_bd "$r")"
es "AUDITOR POST /cases" 403 "$s"

# ── B. List scope STUDENT (công khai + của mình; KHÔNG thấy nhạy cảm của người khác) ──
echo "  → B. List scope STUDENT"
r=$(api "$JAR_STU" GET /api/cases ""); s=$(_st "$r"); b=$(_bd "$r"); track "$b"
es "STUDENT GET /cases" 200 "$s"
if has "$b" "$NEW_ID"; then ok "list chứa case của mình"; else no "list thiếu case của mình"; fi
if has "$b" "$C_SENS"; then no "RÒ case nhạy cảm của người khác vào list STUDENT"; else ok "list KHÔNG có case nhạy cảm của người khác"; fi

# ── C. Detail sensitive của người khác → 404 đồng nhất ──
echo "  → C. Sensitive of others → 404"
r=$(api "$JAR_STU" GET "/api/cases/$C_SENS" ""); s=$(_st "$r"); track "$(_bd "$r")"
es "STUDENT GET /cases/[C_SENS]" 404 "$s"

# ── D. Comment nội bộ: STUDENT → 403; công khai → 201 ──
echo "  → D. Comment quyền"
r=$(api "$JAR_STU" POST "/api/cases/$NEW_ID/comments" '{"body":"thu ghi chu noi bo","isInternal":true}'); s=$(_st "$r"); track "$(_bd "$r")"
es "STUDENT comment isInternal=true" 403 "$s"
r=$(api "$JAR_STU" POST "/api/cases/$NEW_ID/comments" '{"body":"phan hoi cong khai cua hoc sinh"}'); s=$(_st "$r"); track "$(_bd "$r")"
es "STUDENT comment công khai" 201 "$s"

# ── E. Workflow: STAFF NEW→CLOSED=400, NEW→TRIAGED=200 (case vẫn NEW khi bắt đầu) ──
echo "  → E. Status transitions"
r=$(api "$JAR_STAFF" PATCH "/api/cases/$NEW_ID/status" '{"status":"CLOSED"}'); s=$(_st "$r"); track "$(_bd "$r")"
es "STAFF NEW→CLOSED (transition sai)" 400 "$s"
r=$(api "$JAR_STAFF" PATCH "/api/cases/$NEW_ID/status" '{"status":"TRIAGED"}'); s=$(_st "$r"); b=$(_bd "$r"); track "$b"
es "STAFF NEW→TRIAGED" 200 "$s"
if has "$b" '"status":"TRIAGED"'; then ok "status đổi sang TRIAGED"; else no "status chưa đổi"; fi

# ── F. Leak scan ──
echo "  → F. Leak scan"
if grep -qi 'passwordHash' "$BODIES"; then no "RÒ passwordHash"; else ok "không rò passwordHash"; fi

echo ""
echo "  M3: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
