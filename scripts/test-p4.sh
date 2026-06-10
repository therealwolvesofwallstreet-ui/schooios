#!/usr/bin/env bash
# scripts/test-p4.sh — kiểm thử Cases API (P4) end-to-end qua HTTP.
# Tự quản vòng đời server (dev mode: secure cookie off → round-trip cookie qua http localhost).
# Fixture ephemeral (web/prisma/cases-fixture.ts) tạo 5 user test + 3 case kịch bản, in KEY=VALUE.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
ALLBODIES="$(mktemp)"
SERVER_PID=""
SERVER_LOG="$(mktemp)"
# Cookie jar riêng cho từng role.
JAR_S1="$(mktemp)"; JAR_S2="$(mktemp)"; JAR_ADMIN="$(mktemp)"; JAR_STAFF="$(mktemp)"; JAR_AUD="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/cases-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$ALLBODIES" "$SERVER_LOG" "$JAR_S1" "$JAR_S2" "$JAR_ADMIN" "$JAR_STAFF" "$JAR_AUD"
}
trap cleanup EXIT INT TERM

# --- curl helper: in body + dòng cuối = http_code; tham số 1 = jar file ---
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
track() { printf '%s\n' "$1" >> "$ALLBODIES"; } # gom body cho leak-check (case 15)
jget()  { echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; } # field string đầu tiên

# ─────────────────────────── 1. Fixture ───────────────────────────
echo "  → setup fixture"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/cases-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
CAT_NORMAL="$(getv P4FX_CAT_NORMAL)"
CAT_SENSITIVE="$(getv P4FX_CAT_SENSITIVE)"
A_ID="$(getv P4FX_A_ID)"; A_CODE="$(getv P4FX_A_CODE)"
B_ID="$(getv P4FX_B_ID)"; C_ID="$(getv P4FX_C_ID)"
if [ -z "$CAT_NORMAL" ] || [ -z "$CAT_SENSITIVE" ] || [ -z "$A_CODE" ]; then
  echo "    ✗ fixture thiếu dữ liệu (category/case). Output:"; echo "$FIXTURE_OUT"; exit 1
fi

# ─────────────────────── 2. Server (reuse / dev) ───────────────────────
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
    echo "    ✗ server không sẵn sàng sau 60s"; tail -20 "$SERVER_LOG" | sed 's/^/    /'; exit 1
  fi
fi

# ─────────────────────── 3. Đăng nhập từng role ───────────────────────
login() { # JAR IDENTIFIER
  local jar="$1" id="$2"
  local r; r=$(api "$jar" POST /api/auth/login "{\"identifier\":\"$id\",\"password\":\"$PW\"}")
  track "$(_split_body "$r")"
  [ "$(_split_status "$r")" = "200" ]
}
login "$JAR_S1"    "P4-0001"            || { echo "    ✗ login student1 fail"; exit 1; }
login "$JAR_S2"    "P4-0002"            || { echo "    ✗ login student2 fail"; exit 1; }
login "$JAR_ADMIN" "p4-admin@test.local"   || { echo "    ✗ login admin fail"; exit 1; }
login "$JAR_STAFF" "p4-staff@test.local"   || { echo "    ✗ login staff fail"; exit 1; }
login "$JAR_AUD"   "p4-auditor@test.local" || { echo "    ✗ login auditor fail"; exit 1; }

echo "  → chạy test cases"
NORMAL_BODY="{\"title\":\"Su co den hanh lang test\",\"description\":\"Mo ta chi tiet hon muoi ky tu.\",\"categoryId\":\"$CAT_NORMAL\"}"

# 1) POST student1 (category thường) → 201; caseCode đúng format; status NEW; isEmergency false
r=$(api "$JAR_S1" POST /api/cases "$NORMAL_BODY"); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "1. POST tạo case thường" 201 "$s"
C1_CODE="$(jget "$b" caseCode)"; C1_ID="$(jget "$b" id)"
echo "$C1_CODE" | grep -Eq '^CASE-[0-9]{4}-[0-9]{5}$' && ok "1. caseCode đúng format ($C1_CODE)" || no "1. caseCode sai format ($C1_CODE)"
echo "$b" | grep -q '"status":"NEW"' && ok "1. status=NEW" || no "1. status != NEW"
echo "$b" | grep -q '"isEmergency":false' && ok "1. isEmergency=false" || no "1. isEmergency != false"

# 2) POST emergency=true → studentFlaggedEmergency=true VÀ isEmergency=false (Hybrid)
r=$(api "$JAR_S1" POST /api/cases "{\"title\":\"Tinh huong khan cap test\",\"description\":\"Mo ta chi tiet hon muoi ky tu.\",\"categoryId\":\"$CAT_NORMAL\",\"emergency\":true}")
s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "2. POST emergency=true" 201 "$s"
C2_CODE="$(jget "$b" caseCode)"
echo "$b" | grep -q '"studentFlaggedEmergency":true' && ok "2. studentFlaggedEmergency=true" || no "2. studentFlaggedEmergency != true"
echo "$b" | grep -q '"isEmergency":false' && ok "2. isEmergency vẫn false (Hybrid)" || no "2. isEmergency bị bật sai"

# 3) POST category nhạy cảm → isSensitive=true (auto). Dùng cho test 6 (own sensitive visible).
r=$(api "$JAR_S1" POST /api/cases "{\"title\":\"Vu viec nhay cam test\",\"description\":\"Mo ta chi tiet hon muoi ky tu.\",\"categoryId\":\"$CAT_SENSITIVE\"}")
s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "3. POST category nhạy cảm" 201 "$s"
S1_SENS_CODE="$(jget "$b" caseCode)"
echo "$b" | grep -q '"isSensitive":true' && ok "3. isSensitive=true (auto từ category)" || no "3. isSensitive != true"

# 4) POST auditor → 403
r=$(api "$JAR_AUD" POST /api/cases "$NORMAL_BODY"); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "4. POST bằng AUDITOR bị cấm" 403 "$s"

# 5) POST title ngắn → 400; categoryId rác → 400
r=$(api "$JAR_S1" POST /api/cases "{\"title\":\"hi\",\"description\":\"short\",\"categoryId\":\"$CAT_NORMAL\"}")
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "5. title ngắn (Zod)" 400 "$s"
r=$(api "$JAR_S1" POST /api/cases "{\"title\":\"Tieu de hop le\",\"description\":\"Mo ta chi tiet hon muoi ky tu.\",\"categoryId\":\"khong-ton-tai\"}")
s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "5. categoryId rác" 400 "$s"

# 6) GET list student1 → thấy public + sensitive CỦA MÌNH; KHÔNG thấy sensitive của student2 (a)
r=$(api "$JAR_S1" GET "/api/cases?limit=100"); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "6. list student1" 200 "$s"
echo "$b" | grep -q "$C1_CODE" && ok "6. thấy case công khai của mình" || no "6. thiếu case công khai của mình"
echo "$b" | grep -q "$S1_SENS_CODE" && ok "6. thấy case nhạy cảm CỦA MÌNH" || no "6. thiếu case nhạy cảm của mình"
echo "$b" | grep -q "$A_CODE" && no "6. KHÔNG được thấy case nhạy cảm của student2" || ok "6. ẩn case nhạy cảm của student2"

# 7) GET list admin & auditor → thấy CẢ case (a)
r=$(api "$JAR_ADMIN" GET "/api/cases?limit=100"); b=$(_split_body "$r"); track "$b"
echo "$b" | grep -q "$A_CODE" && ok "7. admin thấy case (a)" || no "7. admin KHÔNG thấy case (a)"
r=$(api "$JAR_AUD" GET "/api/cases?limit=100"); b=$(_split_body "$r"); track "$b"
echo "$b" | grep -q "$A_CODE" && ok "7. auditor thấy case (a)" || no "7. auditor KHÔNG thấy case (a)"

# 8) GET list staff → thấy case status NEW (vừa tạo)
r=$(api "$JAR_STAFF" GET "/api/cases?limit=100"); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "8. list staff" 200 "$s"
echo "$b" | grep -q "$C1_CODE" && ok "8. staff thấy case NEW" || no "8. staff KHÔNG thấy case NEW"

# 9) GET list limit=1 → cases length=1; totalPages == total
r=$(api "$JAR_ADMIN" GET "/api/cases?limit=1"); b=$(_split_body "$r"); track "$b"
ncases=$(echo "$b" | grep -o '"caseCode"' | wc -l | tr -d ' ')
total=$(echo "$b" | grep -o '"total":[0-9]*' | cut -d: -f2)
totalPages=$(echo "$b" | grep -o '"totalPages":[0-9]*' | cut -d: -f2)
[ "$ncases" = "1" ] && ok "9. trang trả đúng 1 case (limit=1)" || no "9. trả $ncases case (mong 1)"
[ -n "$total" ] && [ "$total" = "$totalPages" ] && ok "9. totalPages == total ($total)" || no "9. totalPages($totalPages) != total($total)"

# 10) Filter: status=NEW chứa case NEW; isEmergency=true LOẠI case chỉ studentFlagged (Hybrid)
r=$(api "$JAR_ADMIN" GET "/api/cases?status=NEW&limit=100"); b=$(_split_body "$r"); track "$b"
echo "$b" | grep -q "$C1_CODE" && ok "10. filter status=NEW chứa case NEW" || no "10. filter status=NEW thiếu case NEW"
r=$(api "$JAR_ADMIN" GET "/api/cases?isEmergency=true&limit=100"); b=$(_split_body "$r"); track "$b"
echo "$b" | grep -q "$C2_CODE" && no "10. isEmergency=true KHÔNG được chứa case chỉ studentFlagged" || ok "10. filter isEmergency=true loại case studentFlagged"

# 11) GET detail case của mình (student1) → 200, có statusHistory & category
r=$(api "$JAR_S1" GET "/api/cases/$C1_ID"); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "11. detail case của mình" 200 "$s"
echo "$b" | grep -q '"statusHistory"' && echo "$b" | grep -q '"toStatus":"NEW"' && ok "11. có statusHistory (NEW)" || no "11. thiếu statusHistory"
echo "$b" | grep -q '"category"' && ok "11. có category" || no "11. thiếu category"

# 12) GET detail case nhạy cảm student2 (a) bằng student1 → 404
r=$(api "$JAR_S1" GET "/api/cases/$A_ID"); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "12. detail case nhạy cảm của student2 (student1)" 404 "$s"

# 13) GET detail (b): student1 KHÔNG thấy comment isInternal; admin CÓ
r=$(api "$JAR_S1" GET "/api/cases/$B_ID"); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "13. detail (b) student1" 200 "$s"
echo "$b" | grep -q '"isInternal":true' && no "13. student1 KHÔNG được thấy comment nội bộ" || ok "13. student1 ẩn comment isInternal"
echo "$b" | grep -q '"isInternal":false' && ok "13. student1 vẫn thấy comment công khai" || no "13. student1 mất comment công khai"
r=$(api "$JAR_ADMIN" GET "/api/cases/$B_ID"); b=$(_split_body "$r"); track "$b"
echo "$b" | grep -q '"isInternal":true' && ok "13. admin thấy comment nội bộ" || no "13. admin KHÔNG thấy comment nội bộ"

# 14) Case soft-deleted (c) không lọt list & detail → 404
r=$(api "$JAR_ADMIN" GET "/api/cases?limit=100"); b=$(_split_body "$r"); track "$b"
echo "$b" | grep -q "$C_ID" && no "14. case xoá mềm lọt list" || ok "14. case xoá mềm vắng mặt trong list"
r=$(api "$JAR_ADMIN" GET "/api/cases/$C_ID"); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "14. detail case xoá mềm" 404 "$s"

# 15) Không response nào chứa passwordHash / password_hash
if grep -qi "passwordHash\|password_hash" "$ALLBODIES"; then
  no "15. PHÁT HIỆN rò passwordHash trong response"
else
  ok "15. không response nào rò passwordHash"
fi

# ─────────────────────────── Tổng kết ───────────────────────────
echo ""
echo "  P4: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
