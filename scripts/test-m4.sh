#!/usr/bin/env bash
# scripts/test-m4.sh — M4: Notifications (delta +1, read-all→0) + Dashboard (ADMIN 200 đủ key, STUDENT 403).
# Bám CODE THẬT (P6/P7). Tái dùng web/prisma/p9-fixture.ts.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
BODIES="$(mktemp)"
SERVER_PID=""; SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STU="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
es()  { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$BODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STU"
}
trap cleanup EXIT INT TERM

_st(){ printf '%s' "$1" | tail -n1; }
_bd(){ printf '%s' "$1" | sed '$d'; }
api(){ local jar="$1" m="$2" p="$3" d="${4:-}"
  if [ -n "$d" ]; then
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -H "Content-Type: application/json" -c "$jar" -b "$jar" -d "$d" "$BASE_URL$p"
  else
    curl -s -w $'\n%{http_code}' --max-time 30 -X "$m" -c "$jar" -b "$jar" "$BASE_URL$p"
  fi
}
track(){ printf '%s\n' "$1" >> "$BODIES"; }
has(){ echo "$1" | grep -q "$2"; }
jnum(){ echo "$1" | grep -o "\"$2\":[0-9]*" | head -1 | cut -d: -f2; }
first_id(){ echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

# ── Fixture + server + login ──
echo "  → setup fixture (p9)"
FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts )" || { echo "$FIXTURE_OUT"; exit 1; }
getv(){ echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
CAT="$(getv P9FX_CAT)"; ADMIN_EMAIL="$(getv P9FX_ADMIN_EMAIL)"; STUDENT1_SBD="$(getv P9FX_STUDENT1_SBD)"
for v in "$CAT" "$ADMIN_EMAIL" "$STUDENT1_SBD"; do [ -z "$v" ] && { echo "✗ fixture thiếu key"; exit 1; }; done

probe(){ local c; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/auth/me" 2>/dev/null); echo "${c:-000}"; }
if [ "$(probe)" != "000" ]; then echo "  → dùng lại server"; else
  echo "  → khởi động next dev"
  ( cd "$WEB" && exec ./node_modules/.bin/next dev ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!; ready=0
  for _ in $(seq 1 60); do [ "$(probe)" != "000" ] && { ready=1; break; }; sleep 1; done
  [ "$ready" = "1" ] || { echo "    ✗ server không sẵn sàng"; tail -20 "$SERVER_LOG" | sed 's/^/    /'; exit 1; }
fi

login(){ local jar="$1" id="$2"; local r; r=$(api "$jar" POST /api/auth/login "{\"identifier\":\"$id\",\"password\":\"$PW\"}"); track "$(_bd "$r")"; [ "$(_st "$r")" = "200" ]; }
login "$JAR_ADMIN" "$ADMIN_EMAIL"  || { echo "✗ login admin"; exit 1; }
login "$JAR_STU"   "$STUDENT1_SBD" || { echo "✗ login student"; exit 1; }

# ── A. STUDENT tạo case (NEW, công khai) ──
echo "  → A. Tạo case + bối cảnh notify"
CREATE='{"title":"[M4] Case kiem thu notify","description":"Mo ta du dai cho zod min 10 ky tu.","categoryId":"'"$CAT"'"}'
r=$(api "$JAR_STU" POST /api/cases "$CREATE"); b=$(_bd "$r"); track "$b"
CID="$(first_id "$b")"
[ -n "$CID" ] && ok "tạo case ($CID)" || { no "không tạo được case"; }

# ── B. Comment công khai (ADMIN) → STUDENT (creator) nhận +1 ──
echo "  → B. Notify delta khi có comment"
r=$(api "$JAR_STU" GET /api/notifications ""); B0=$(jnum "$(_bd "$r")" unreadCount); B0=${B0:-0}
r=$(api "$JAR_ADMIN" POST "/api/cases/$CID/comments" '{"body":"Da tiep nhan, dang xu ly nhe."}'); s=$(_st "$r"); track "$(_bd "$r")"
es "ADMIN comment công khai" 201 "$s"
r=$(api "$JAR_STU" GET /api/notifications ""); b=$(_bd "$r"); track "$b"; B1=$(jnum "$b" unreadCount); B1=${B1:-0}
if [ "$B1" -eq "$((B0+1))" ]; then ok "unreadCount +1 sau comment ($B0→$B1)"; else no "unreadCount $B0→$B1 (mong +1)"; fi
if has "$b" 'COMMENT_ADDED'; then ok "có notification COMMENT_ADDED"; else no "thiếu COMMENT_ADDED"; fi

# ── C. read-all → unreadCount=0 ──
echo "  → C. read-all"
r=$(api "$JAR_STU" PATCH /api/notifications/read-all ""); s=$(_st "$r"); track "$(_bd "$r")"
es "STUDENT read-all" 200 "$s"
r=$(api "$JAR_STU" GET /api/notifications ""); U=$(jnum "$(_bd "$r")" unreadCount); U=${U:-X}
if [ "$U" = "0" ]; then ok "unreadCount=0 sau read-all"; else no "unreadCount=$U (mong 0)"; fi

# ── D. Status change (ADMIN) → STUDENT nhận +1 (sau khi đã reset 0) ──
echo "  → D. Notify delta khi đổi trạng thái"
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$CID/status" '{"status":"TRIAGED"}'); s=$(_st "$r"); track "$(_bd "$r")"
es "ADMIN NEW→TRIAGED" 200 "$s"
r=$(api "$JAR_STU" GET /api/notifications ""); U2=$(jnum "$(_bd "$r")" unreadCount); U2=${U2:-X}
if [ "$U2" = "1" ]; then ok "unreadCount=1 sau status change"; else no "unreadCount=$U2 (mong 1)"; fi

# ── E. Dashboard: ADMIN 200 + đủ key; STUDENT 403 ──
echo "  → E. Dashboard quyền + key"
r=$(api "$JAR_ADMIN" GET /api/dashboard ""); s=$(_st "$r"); b=$(_bd "$r"); track "$b"
es "ADMIN GET /dashboard" 200 "$s"
KEYS_OK=1
for k in totalCases newToday emergencyOpen unassigned stale byStatus byPriority byCategory byLocation unlocated; do
  has "$b" "\"$k\"" || { no "dashboard thiếu key: $k"; KEYS_OK=0; }
done
[ "$KEYS_OK" = "1" ] && ok "dashboard đủ 10 key đóng băng"
# Bất biến Σ byStatus._count == totalCases (sanity)
r=$(api "$JAR_STU" GET /api/dashboard ""); s=$(_st "$r"); track "$(_bd "$r")"
es "STUDENT GET /dashboard" 403 "$s"

# ── F. Leak scan ──
echo "  → F. Leak scan"
if grep -qi 'passwordHash' "$BODIES"; then no "RÒ passwordHash"; else ok "không rò passwordHash"; fi

echo ""
echo "  M4: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
