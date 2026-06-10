#!/usr/bin/env bash
# scripts/test-p9.sh — P9: AUDIT ma trận quyền + error states + rate-limit login, end-to-end qua HTTP.
# Tự quản vòng đời server (dev mode: secure cookie off → round-trip cookie qua http localhost).
# Fixture ephemeral (web/prisma/p9-fixture.ts): 8 user + 8 case phủ ma trận, in KEY=VALUE.
#
# NGUYÊN TẮC: test bám HÀNH VI CODE THẬT (P4–P7), KHÔNG đổi quyền. "Một assertion chuẩn cho mỗi LỚP
#   status" (401/403/404/405/429/200-mutation) — không nhồi ô đồng nghĩa. Hai nuance CODE-TRUE:
#   • STAFF /status ngoài-scope → 404 (KHÔNG 403): scope STAFF == caseWhereForRole nên case vô hình →
#     404 trước; nhánh 403 trong /status là dead-code phòng thủ (chủ ý, không phải bug).
#   • STAFF /assign 403 CÓ reachable: thấy case mình giữ nhưng status∉{NEW,TRIAGED} (!isAssignable).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
ALLBODIES="$(mktemp)"   # MỌI response (gồm login) → quét passwordHash
P9BODIES="$(mktemp)"    # CHỈ response endpoint P9 (KHÔNG login) → quét PII (login echo email/sbd chính chủ là hợp lệ)
SERVER_PID=""
SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STAFF1="$(mktemp)"; JAR_AUD="$(mktemp)"; JAR_STU1="$(mktemp)"
JAR_MCP="$(mktemp)"; JAR_INACTIVE="$(mktemp)"; JAR_EMPTY="$(mktemp)"; JAR_RL="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$ALLBODIES" "$P9BODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF1" "$JAR_AUD" "$JAR_STU1" \
        "$JAR_MCP" "$JAR_INACTIVE" "$JAR_EMPTY" "$JAR_RL"
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
track() { printf '%s\n' "$1" >> "$ALLBODIES"; }
trk()   { printf '%s\n' "$1" >> "$ALLBODIES"; printf '%s\n' "$1" >> "$P9BODIES"; }
has()   { echo "$1" | grep -q "$2"; }
jnum()  { echo "$1" | grep -o "\"$2\":[0-9]*" | head -1 | cut -d: -f2; }
# Đếm side-effect EMERGENCY của 1 case qua fixture --counts → set AUDIT_EMERG/NOTIF_EMERG (no-op Δ test).
counts_of() {
  local out; out="$( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts --counts "$1" 2>/dev/null )"
  AUDIT_EMERG="$(echo "$out" | grep '^AUDIT_EMERG=' | cut -d= -f2)"; NOTIF_EMERG="$(echo "$out" | grep '^NOTIF_EMERG=' | cut -d= -f2)"
  AUDIT_EMERG="${AUDIT_EMERG:-0}"; NOTIF_EMERG="${NOTIF_EMERG:-0}"
}
# Tổng case sống (deletedAt:null) ngay thời điểm gọi → so khớp dashboard.totalCases (guard soft-delete).
live_total() { ( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts --live-total 2>/dev/null ) | grep '^LIVE_TOTAL=' | cut -d= -f2; }

# jar theo role (ANON = jar rỗng → proxy 401).
jar_for() {
  case "$1" in
    ADMIN) echo "$JAR_ADMIN";; STAFF) echo "$JAR_STAFF1";; STUDENT) echo "$JAR_STU1";;
    AUDITOR) echo "$JAR_AUD";; ANON) echo "$JAR_EMPTY";;
  esac
}
# Ma trận DẠNG DỮ LIỆU: 1 dòng = (method,path,body) × 5 role, assert ĐÚNG status mỗi ô.
LAST_BODY=""
matrix() { # METHOD PATH BODY expADMIN expSTAFF expSTUDENT expAUDITOR expANON LABEL
  local m="$1" p="$2" body="$3" ea="$4" es="$5" est="$6" eau="$7" ean="$8" label="$9"
  local role exp jar r s
  for role in ADMIN STAFF STUDENT AUDITOR ANON; do
    case "$role" in
      ADMIN) exp="$ea";; STAFF) exp="$es";; STUDENT) exp="$est";; AUDITOR) exp="$eau";; ANON) exp="$ean";;
    esac
    jar="$(jar_for "$role")"
    r=$(api "$jar" "$m" "$p" "$body"); s=$(_split_status "$r"); LAST_BODY="$(_split_body "$r")"; trk "$LAST_BODY"
    expect_status "$label [$role]" "$exp" "$s"
  done
}
# Ô đơn (cell) khi expected khác nhau theo case/role → assert tường minh. Set LAST_BODY để check kèm.
cell() { # LABEL JAR METHOD PATH BODY EXPECTED
  local label="$1" jar="$2" m="$3" p="$4" body="$5" exp="$6" r s
  r=$(api "$jar" "$m" "$p" "$body"); s=$(_split_status "$r"); LAST_BODY="$(_split_body "$r")"; trk "$LAST_BODY"
  expect_status "$label" "$exp" "$s"
}

# ─────────────────────────── 1. Fixture ───────────────────────────
echo "  → setup fixture"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
STAFF1="$(getv P9FX_STAFF1)"
CAT="$(getv P9FX_CAT)"
C_PUBLIC="$(getv P9FX_C_PUBLIC)"; C_SENS="$(getv P9FX_C_SENS)"; C_STAFF2="$(getv P9FX_C_STAFF2)"; C_EMERG="$(getv P9FX_C_EMERG)"
C_EMERG_PUB="$(getv P9FX_C_EMERG_PUB)"; C_EMERG_SENS_UN="$(getv P9FX_C_EMERG_SENS_UN)"; NOTIF_SEEDED="$(getv P9FX_NOTIF_SEEDED)"
C_EMERG_PUB2="$(getv P9FX_C_EMERG_PUB2)"; C_SOFT_DELETED="$(getv P9FX_C_SOFT_DELETED)"; C_EMERG_FLIP="$(getv P9FX_C_EMERG_FLIP)"; RL_SBD="$(getv P9FX_RL_SBD)"
C_ASSIGN_ADMIN="$(getv P9FX_C_ASSIGN_ADMIN)"; C_ASSIGN_STAFF="$(getv P9FX_C_ASSIGN_STAFF)"
C_STATUS_ADMIN="$(getv P9FX_C_STATUS_ADMIN)"; C_STATUS_STAFF="$(getv P9FX_C_STATUS_STAFF)"
ADMIN_EMAIL="$(getv P9FX_ADMIN_EMAIL)"; STAFF1_EMAIL="$(getv P9FX_STAFF1_EMAIL)"; AUDITOR_EMAIL="$(getv P9FX_AUDITOR_EMAIL)"
MCP_EMAIL="$(getv P9FX_MCP_EMAIL)"; INACTIVE_EMAIL="$(getv P9FX_INACTIVE_EMAIL)"; STUDENT1_SBD="$(getv P9FX_STUDENT1_SBD)"
if [ -z "$STAFF1" ] || [ -z "$CAT" ] || [ -z "$C_PUBLIC" ] || [ -z "$C_SENS" ] || [ -z "$C_STAFF2" ] || [ -z "$C_EMERG" ] \
   || [ -z "$C_ASSIGN_ADMIN" ] || [ -z "$C_STATUS_STAFF" ] || [ -z "$INACTIVE_EMAIL" ]; then
  echo "    ✗ fixture thiếu dữ liệu. Output:"; echo "$FIXTURE_OUT"; exit 1
fi
CREATE_BODY="{\"title\":\"[P9FX] matrix probe\",\"description\":\"P9 matrix create probe body\",\"categoryId\":\"$CAT\"}"

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

# ─────────────────────── 3. Đăng nhập (4 role + mcp) ───────────────────────
login() { local jar="$1" id="$2"; local r; r=$(api "$jar" POST /api/auth/login "{\"identifier\":\"$id\",\"password\":\"$PW\"}"); track "$(_split_body "$r")"; [ "$(_split_status "$r")" = "200" ]; }
login "$JAR_ADMIN"  "$ADMIN_EMAIL"   || { echo "    ✗ login admin fail";   exit 1; }
login "$JAR_STAFF1" "$STAFF1_EMAIL"  || { echo "    ✗ login staff1 fail";  exit 1; }
login "$JAR_AUD"    "$AUDITOR_EMAIL" || { echo "    ✗ login auditor fail"; exit 1; }
login "$JAR_STU1"   "$STUDENT1_SBD"  || { echo "    ✗ login student1 fail";exit 1; }
login "$JAR_MCP"    "$MCP_EMAIL"     || { echo "    ✗ login mcpUser fail (login phải 200, chặn ở proxy)"; exit 1; }

echo "  → A. MA TRẬN QUYỀN (data-driven, 5 role/ô)"
# Read + role-gate thuần (không clobber state) → ma trận đầy đủ 5 role.
matrix GET   "/api/cases"                       ""            200 200 200 200 401 "A. GET /cases"
matrix GET   "/api/cases/$C_PUBLIC"             ""            200 200 200 200 401 "A. GET /cases/[id] (thấy: C_PUBLIC)"
matrix GET   "/api/cases/$C_PUBLIC/comments"    ""            200 200 200 200 401 "A. GET /comments (thấy: C_PUBLIC)"
matrix GET   "/api/cases/emergency"             ""            200 200 403 200 401 "A. GET /cases/emergency (lane)"
matrix GET   "/api/dashboard"                   ""            200 403 403 200 401 "A. GET /dashboard"
matrix GET   "/api/notifications"               ""            200 200 200 200 401 "A. GET /notifications"
matrix PATCH "/api/notifications/read-all"      ""            200 200 200 200 401 "A. PATCH /notifications/read-all"
matrix POST  "/api/cases"                       "$CREATE_BODY" 201 201 201 403 401 "A. POST /cases"

echo "  → A. ASSIGN (mutating-200 trên case riêng; 403 reachable; 403/401 role-gate)"
cell "A. assign ADMIN→staff1 (C_ASSIGN_ADMIN)"  "$JAR_ADMIN"  PATCH "/api/cases/$C_ASSIGN_ADMIN/assign" "{\"assignedToId\":\"$STAFF1\"}" 200
cell "A. assign STAFF self (C_ASSIGN_STAFF)"    "$JAR_STAFF1" PATCH "/api/cases/$C_ASSIGN_STAFF/assign" "{\"assignedToId\":\"$STAFF1\"}" 200
cell "A. assign STAFF owns non-NEW → 403 (C_EMERG)" "$JAR_STAFF1" PATCH "/api/cases/$C_EMERG/assign" "{\"assignedToId\":\"$STAFF1\"}" 403
cell "A. assign STUDENT → 403 (role-gate)"      "$JAR_STU1"   PATCH "/api/cases/$C_PUBLIC/assign"   "{\"assignedToId\":\"$STAFF1\"}" 403
cell "A. assign AUDITOR → 403 (role-gate)"      "$JAR_AUD"    PATCH "/api/cases/$C_PUBLIC/assign"   "{\"assignedToId\":\"$STAFF1\"}" 403
cell "A. assign ANON → 401"                     "$JAR_EMPTY"  PATCH "/api/cases/$C_PUBLIC/assign"   "{\"assignedToId\":\"$STAFF1\"}" 401

echo "  → A. STATUS (mutating-200; STAFF ngoài-scope → 404 KHÔNG 403; 403/401 role-gate)"
cell "A. status ADMIN NEW→TRIAGED (C_STATUS_ADMIN)" "$JAR_ADMIN"  PATCH "/api/cases/$C_STATUS_ADMIN/status" "{\"status\":\"TRIAGED\"}" 200
cell "A. status STAFF NEW→TRIAGED (C_STATUS_STAFF)" "$JAR_STAFF1" PATCH "/api/cases/$C_STATUS_STAFF/status" "{\"status\":\"TRIAGED\"}" 200
cell "A. status STAFF ngoài-scope → 404 (C_STAFF2)" "$JAR_STAFF1" PATCH "/api/cases/$C_STAFF2/status" "{\"status\":\"TRIAGED\"}" 404
cell "A. status STUDENT → 403 (role-gate)"      "$JAR_STU1"   PATCH "/api/cases/$C_PUBLIC/status"   "{\"status\":\"TRIAGED\"}" 403
cell "A. status AUDITOR → 403 (role-gate)"      "$JAR_AUD"    PATCH "/api/cases/$C_PUBLIC/status"   "{\"status\":\"TRIAGED\"}" 403
cell "A. status ANON → 401"                     "$JAR_EMPTY"  PATCH "/api/cases/$C_PUBLIC/status"   "{\"status\":\"TRIAGED\"}" 401

echo "  → A. EMERGENCY (no-op 200; STAFF ngoài-scope → 404; 403/401 role-gate)"
cell "A. emergency ADMIN no-op (C_EMERG)"       "$JAR_ADMIN"  PATCH "/api/cases/$C_EMERG/emergency"  "{\"isEmergency\":true}" 200
cell "A. emergency STAFF no-op (C_EMERG owner)" "$JAR_STAFF1" PATCH "/api/cases/$C_EMERG/emergency"  "{\"isEmergency\":true}" 200
cell "A. emergency STAFF ngoài-scope → 404 (C_STAFF2)" "$JAR_STAFF1" PATCH "/api/cases/$C_STAFF2/emergency" "{\"isEmergency\":true}" 404
cell "A. emergency STUDENT → 403 (role-gate)"   "$JAR_STU1"   PATCH "/api/cases/$C_PUBLIC/emergency" "{\"isEmergency\":true}" 403
cell "A. emergency AUDITOR → 403 (role-gate)"   "$JAR_AUD"    PATCH "/api/cases/$C_PUBLIC/emergency" "{\"isEmergency\":true}" 403
cell "A. emergency ANON → 401"                  "$JAR_EMPTY"  PATCH "/api/cases/$C_PUBLIC/emergency" "{\"isEmergency\":true}" 401

echo "  → A. COMMENTS POST (thấy 201; không thấy 404; STUDENT internal 403; AUDITOR 403)"
cell "A. comment ADMIN (C_PUBLIC)"   "$JAR_ADMIN"  POST "/api/cases/$C_PUBLIC/comments" "{\"body\":\"admin comment p9\"}" 201
cell "A. comment STAFF (C_PUBLIC)"   "$JAR_STAFF1" POST "/api/cases/$C_PUBLIC/comments" "{\"body\":\"staff comment p9\"}" 201
cell "A. comment STUDENT thấy (C_PUBLIC)" "$JAR_STU1" POST "/api/cases/$C_PUBLIC/comments" "{\"body\":\"student comment p9\"}" 201
cell "A. comment STUDENT không thấy → 404 (C_SENS)" "$JAR_STU1" POST "/api/cases/$C_SENS/comments" "{\"body\":\"student sens p9\"}" 404
cell "A. comment STUDENT internal → 403 (C_PUBLIC)" "$JAR_STU1" POST "/api/cases/$C_PUBLIC/comments" "{\"body\":\"x\",\"isInternal\":true}" 403
cell "A. comment AUDITOR → 403 (role-gate)" "$JAR_AUD" POST "/api/cases/$C_PUBLIC/comments" "{\"body\":\"auditor p9\"}" 403
cell "A. comment ANON → 401"         "$JAR_EMPTY"  POST "/api/cases/$C_PUBLIC/comments" "{\"body\":\"anon p9\"}" 401

echo "  → A. 404 anti-enumeration (không thấy → 404, KHÔNG 403) + ADMIN/AUDITOR see-all"
cell "A. ADMIN GET sensitive → 200 (see-all, C_SENS)"   "$JAR_ADMIN" GET "/api/cases/$C_SENS" "" 200
cell "A. AUDITOR GET sensitive → 200 (see-all, C_SENS)" "$JAR_AUD"   GET "/api/cases/$C_SENS" "" 200
cell "A. STUDENT GET sensitive khác → 404 (C_SENS)"     "$JAR_STU1"  GET "/api/cases/$C_SENS" "" 404
cell "A. STAFF GET ngoài-scope → 404 (C_STAFF2)"        "$JAR_STAFF1" GET "/api/cases/$C_STAFF2" "" 404
cell "A. STAFF GET comments ngoài-scope → 404 (C_STAFF2)" "$JAR_STAFF1" GET "/api/cases/$C_STAFF2/comments" "" 404
cell "A. STUDENT GET comments sensitive → 404 (C_SENS)" "$JAR_STU1"  GET "/api/cases/$C_SENS/comments" "" 404

echo "  → B. ERROR STATES"
# B1) bad JSON → 400
cell "B1. bad JSON POST /cases → 400" "$JAR_ADMIN" POST "/api/cases" "{" 400
has "$LAST_BODY" '"error":' && ok "B1. body có field error" || no "B1. body thiếu error"
# B2) zod fail (status:FOO) → 400 + details
cell "B2. zod fail PATCH /status → 400" "$JAR_ADMIN" PATCH "/api/cases/$C_PUBLIC/status" "{\"status\":\"FOO\"}" 400
has "$LAST_BODY" '"details"' && ok "B2. body có field details (zod issues)" || no "B2. body thiếu details"
# B3) sai method (DELETE /assign chỉ export PATCH) → 405 (Next.js auto)
cell "B3. sai method DELETE /assign → 405" "$JAR_ADMIN" DELETE "/api/cases/$C_PUBLIC/assign" "" 405
# B4) cổng ép-đổi-MK: mcpUser (login 200) GET /cases → 403 code MUST_CHANGE_PASSWORD (chặn ở proxy)
cell "B4. mcpUser GET /cases → 403" "$JAR_MCP" GET "/api/cases" "" 403
has "$LAST_BODY" 'MUST_CHANGE_PASSWORD' && ok "B4. code MUST_CHANGE_PASSWORD" || no "B4. thiếu code MUST_CHANGE_PASSWORD"
# B5) inactiveUser login → 403 "Account is inactive" (KHÔNG dùng login helper vì kỳ vọng fail)
r=$(api "$JAR_INACTIVE" POST /api/auth/login "{\"identifier\":\"$INACTIVE_EMAIL\",\"password\":\"$PW\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "B5. inactiveUser login → 403" 403 "$s"
has "$b" 'Account is inactive' && ok "B5. message 'Account is inactive'" || no "B5. message inactive sai"
# B6) Uniform shape: mọi LỚP body lỗi (401/403/404/400) có field error:string (1 đại diện/lớp, không nhồi)
shape() { has "$2" '"error":"' && ok "B6. $1 có error:string" || no "B6. $1 thiếu error:string"; }
r=$(api "$JAR_EMPTY" GET "/api/cases"); track "$(_split_body "$r")"; shape "401(anon)" "$(_split_body "$r")"
r=$(api "$JAR_AUD" POST "/api/cases" "$CREATE_BODY"); trk "$(_split_body "$r")"; shape "403(auditor)" "$(_split_body "$r")"
r=$(api "$JAR_STU1" GET "/api/cases/$C_SENS"); trk "$(_split_body "$r")"; shape "404(student sens)" "$(_split_body "$r")"
r=$(api "$JAR_ADMIN" POST "/api/cases" "{"); trk "$(_split_body "$r")"; shape "400(bad json)" "$(_split_body "$r")"

echo "  → C. RATE-LIMIT login (10×401 → 429 + Retry-After; per-identifier không khoá user thật)"
# Identifier DÙNG-MỘT-LẦN duy nhất theo run (PID+RANDOM) → bền với server tái dùng (bucket sạch mỗi run).
RL_ID="p9-rl-$$-${RANDOM}@nope.local"
rl_fail=0; rl_body_ok=1
for _ in $(seq 1 10); do
  r=$(api "$JAR_EMPTY" POST /api/auth/login "{\"identifier\":\"$RL_ID\",\"password\":\"x\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
  [ "$s" = "401" ] || rl_fail=1
  has "$b" '"error":"Invalid credentials"' || rl_body_ok=0
done
[ "$rl_fail" = "0" ] && ok "C9. 10 lần đầu đều 401" || no "C9. có lần != 401 trong 10 lần đầu (rate-limit chặn quá sớm?)"
[ "$rl_body_ok" = "1" ] && ok "C9. body trước-giới-hạn = 'Invalid credentials' (không lộ tồn tại định danh)" || no "C9. body trước-giới-hạn KHÔNG phải Invalid credentials"
# Lần 11 → 429: kiểm CẢ body lẫn GIÁ TRỊ Retry-After (không chỉ presence — COV-7).
RL_HDR="$(mktemp)"; RL_BODY="$(mktemp)"
s=$(curl -s -D "$RL_HDR" -o "$RL_BODY" -w '%{http_code}' --max-time 30 -X POST -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$RL_ID\",\"password\":\"x\"}" "$BASE_URL/api/auth/login")
trk "$(cat "$RL_BODY")"
expect_status "C9. lần 11 → 429" 429 "$s"
has "$(cat "$RL_BODY")" '"error":"Too many requests"' && ok "C9. body 429 = 'Too many requests'" || no "C9. body 429 sai"
ra="$(grep -i '^retry-after:' "$RL_HDR" | head -1 | tr -d '\r' | sed 's/.*: *//')"
{ [ -n "$ra" ] && [ "$ra" -ge 1 ] 2>/dev/null && [ "$ra" -le 60 ] 2>/dev/null; } && ok "C9. Retry-After=$ra hợp lệ (số nguyên 1..60)" || no "C9. Retry-After không hợp lệ ($ra)"
rm -f "$RL_HDR" "$RL_BODY"
# C10) user thật (key khác) vẫn login được → rate-limit theo TỪNG identifier
r=$(api "$JAR_ADMIN" POST /api/auth/login "{\"identifier\":\"$ADMIN_EMAIL\",\"password\":\"$PW\"}"); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "C10. admin thật vẫn 200 (per-identifier)" 200 "$s"
# C11 (COV-6) per-identifier bucketing: identifier KHÁC từ CÙNG IP còn nguyên quota → 401 (KHÔNG 429).
#   Chứng minh key gồm identifier (nếu key chỉ theo IP, request này đã 429 vì RL_ID vừa làm tràn).
RL_ID2="p9-rl2-$$-${RANDOM}@nope.local"
r=$(api "$JAR_EMPTY" POST /api/auth/login "{\"identifier\":\"$RL_ID2\",\"password\":\"x\"}"); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "C11. identifier KHÁC (cùng IP) → 401 không 429 (key theo identifier)" 401 "$s"

echo "  → E. DASHBOARD INVARIANTS (sum sanity + 10 key — không chỉ status)"
r=$(api "$JAR_ADMIN" GET "/api/dashboard"); s=$(_split_status "$r"); b_dash=$(_split_body "$r"); trk "$b_dash"
expect_status "E. ADMIN GET dashboard" 200 "$s"
miss=""
for k in totalCases newToday emergencyOpen unassigned stale byStatus byPriority byCategory byLocation unlocated; do
  has "$b_dash" "\"$k\":" || miss="$miss $k"
done
[ -z "$miss" ] && ok "E. đủ 10 key dashboard" || no "E. thiếu key:$miss"
printf '%s' "$b_dash" | node -e '
  const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const ss=d.byStatus.reduce((a,x)=>a+x._count,0);
  const sp=d.byPriority.reduce((a,x)=>a+x._count,0);
  const sc=d.byCategory.reduce((a,x)=>a+x.count,0);
  const sl=d.byLocation.reduce((a,x)=>a+x.count,0);
  const e=[];
  if(ss!==d.totalCases) e.push("Σ byStatus "+ss+"!=total "+d.totalCases);
  if(sp!==d.totalCases) e.push("Σ byPriority "+sp+"!=total "+d.totalCases);
  if(sc!==d.totalCases) e.push("Σ byCategory "+sc+"!=total "+d.totalCases);
  if(sl+d.unlocated!==d.totalCases) e.push("Σ byLocation+unlocated "+(sl+d.unlocated)+"!=total "+d.totalCases);
  if(e.length){console.error(e.join("; "));process.exit(1)}
' && ok "E. Σ byStatus/byPriority/byCategory==total ; Σ byLocation+unlocated==total" || no "E. dashboard sum-invariant SAI"
# E2 (P9-E-1) GUARD soft-delete: dashboard.totalCases PHẢI == số case sống thật (deletedAt:null).
#   Mutation bỏ deletedAt:null ở MỌI count → total phồng (gồm C_SOFT_DELETED) → lệch LIVE_TOTAL → FAIL.
#   (sum-invariant ở trên KHÔNG bắt được mutation đồng loạt này vì mọi bucket phồng cùng nhau.)
LT="$(live_total)"; DT="$(jnum "$b_dash" totalCases)"
{ [ -n "$LT" ] && [ "$DT" = "$LT" ]; } && ok "E2. dashboard.totalCases=$DT == live(deletedAt:null)=$LT (soft-delete KHÔNG lọt aggregate)" || no "E2. totalCases=$DT != live=$LT (soft-delete lọt dashboard?)"
# E3 anti-soft-delete trên đường đọc: ADMIN (thấy tất) GET case soft-deleted → 404 (guard caseWhereForRole base deletedAt:null).
cell "E3. ADMIN GET soft-deleted → 404 (deletedAt:null guard)" "$JAR_ADMIN" GET "/api/cases/$C_SOFT_DELETED" "" 404

echo "  → F. NOTIFICATIONS PAGINATION (tất định: không skip/lặp; cô lập theo user)"
STU1ID="$(getv P9FX_NOTIF_USER)"
r=$(api "$JAR_STU1" GET "/api/notifications?page=1&limit=10"); b=$(_split_body "$r"); trk "$b"
TOTAL="$(jnum "$b" total)"; TOTAL="${TOTAL:-0}"
[ "$TOTAL" -ge "${NOTIF_SEEDED:-25}" ] && ok "F. total=$TOTAL >= seeded ${NOTIF_SEEDED}" || no "F. total=$TOTAL < seeded ${NOTIF_SEEDED}"
PAGES_FILE="$(mktemp)"; pg=1
while :; do
  r=$(api "$JAR_STU1" GET "/api/notifications?page=$pg&limit=10"); b=$(_split_body "$r"); trk "$b"
  # emit "createdAtMs<TAB>id<TAB>userId" theo ĐÚNG thứ tự server trả → tái dựng chuỗi phân trang toàn cục.
  printf '%s' "$b" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));for(const n of d.notifications)console.log(new Date(n.createdAt).getTime()+"\t"+n.id+"\t"+n.userId)' >> "$PAGES_FILE"
  cnt=$(printf '%s' "$b" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(d.notifications.length)')
  [ "${cnt:-0}" -lt 10 ] && break
  pg=$((pg+1)); [ "$pg" -gt 50 ] && break
done
collected=$(wc -l < "$PAGES_FILE" | tr -d ' ')
distinct=$(awk -F'\t' '{print $2}' "$PAGES_FILE" | sort -u | wc -l | tr -d ' ')
foreign=$(awk -F'\t' -v u="$STU1ID" '$3!=u' "$PAGES_FILE" | wc -l | tr -d ' ')
[ "$collected" = "$distinct" ] && ok "F. phân trang KHÔNG lặp dòng ($collected thu = $distinct distinct)" || no "F. phân trang LẶP dòng ($collected thu, $distinct distinct)"
[ "$distinct" = "$TOTAL" ] && ok "F. phân trang KHÔNG bỏ sót (distinct $distinct == total $TOTAL)" || no "F. phân trang bỏ sót/dư (distinct $distinct vs total $TOTAL)"
[ "$foreign" = "0" ] && ok "F. feed CHỈ của student1 (0 notif user khác)" || no "F. LỌT $foreign notif user khác (isolation thủng)"
# F2 (P9-F-1) tiebreaker LOAD-BEARING: chuỗi phân trang toàn cục PHẢI giảm chặt theo (createdAt desc, id desc).
#   25 notif seed TRÙNG createdAt → nếu thiếu {id:desc} thì trong khối trùng, id KHÔNG desc → FAIL.
node -e '
  const fs=require("fs");
  const rows=fs.readFileSync(process.argv[1],"utf8").trim().split("\n").filter(Boolean).map(l=>{const[t,id]=l.split("\t");return{t:Number(t),id}});
  for(let i=1;i<rows.length;i++){
    const a=rows[i-1], b=rows[i];
    const ok = a.t>b.t || (a.t===b.t && a.id>b.id);
    if(!ok){console.error("order vi phạm tại "+i+": ("+a.t+","+a.id+") -> ("+b.t+","+b.id+")");process.exit(1)}
  }
' "$PAGES_FILE" && ok "F2. chuỗi phân trang giảm chặt theo (createdAt desc, id desc) — tiebreaker tất định" || no "F2. thứ tự phân trang KHÔNG tất định (tiebreaker thủng)"
rm -f "$PAGES_FILE"

echo "  → G. EMERGENCY no-op idempotent — positive control (Δ>0) RỒI no-op (Δ0) trên C_EMERG_FLIP"
# G1 POSITIVE CONTROL: flip THẬT false→true PHẢI ghi (audit +1, notify ≥1) → chứng minh write-path SỐNG
#   (nếu không, nhánh Δ0 bên dưới vacuous: một write-path chết cũng thoả Δ0).
counts_of "$C_EMERG_FLIP"; au_b="$AUDIT_EMERG"; nt_b="$NOTIF_EMERG"
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$C_EMERG_FLIP/emergency" "{\"isEmergency\":true,\"reason\":\"p9 flip\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "G1. flip THẬT false→true" 200 "$s"
counts_of "$C_EMERG_FLIP"; au_a="$AUDIT_EMERG"; nt_a="$NOTIF_EMERG"
{ [ "$((au_a-au_b))" -eq 1 ] && [ "$((nt_a-nt_b))" -ge 1 ]; } && ok "G1. flip ghi audit +1 & notify ≥1 (write-path sống)" || no "G1. flip KHÔNG ghi đúng (audit $au_b→$au_a, notify $nt_b→$nt_a)"
# G2 NO-OP: lặp true→true PHẢI Δ0 audit & Δ0 notify (idempotent, chống phantom write).
counts_of "$C_EMERG_FLIP"; au_b="$AUDIT_EMERG"; nt_b="$NOTIF_EMERG"
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$C_EMERG_FLIP/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "G2. no-op true→true" 200 "$s"
counts_of "$C_EMERG_FLIP"; au_a="$AUDIT_EMERG"; nt_a="$NOTIF_EMERG"
{ [ "$((au_a-au_b))" -eq 0 ] && [ "$((nt_a-nt_b))" -eq 0 ]; } && ok "G2. no-op KHÔNG ghi thừa (audit Δ0, notify Δ0)" || no "G2. no-op ghi thừa (audit $au_b→$au_a, notify $nt_b→$nt_a)"

echo "  → H. EMERGENCY LANE (sort desc + sensitivity gate — không chỉ status)"
r=$(api "$JAR_STAFF1" GET "/api/cases/emergency"); s=$(_split_status "$r"); b_staff=$(_split_body "$r"); trk "$b_staff"
expect_status "H. STAFF GET lane" 200 "$s"
has "$b_staff" "$C_EMERG_PUB" && ok "H. STAFF thấy emergency CÔNG KHAI (lane bỏ scope)" || no "H. STAFF KHÔNG thấy C_EMERG_PUB"
has "$b_staff" "$C_EMERG" && ok "H. STAFF thấy emergency NHẠY CẢM ĐƯỢC GIAO mình" || no "H. STAFF KHÔNG thấy C_EMERG (assignee)"
has "$b_staff" "$C_EMERG_SENS_UN" && no "H. STAFF LỌT sensitive-unassigned (RÒ RỈ)" || ok "H. STAFF KHÔNG thấy sensitive-unassigned (gate đúng)"
printf '%s' "$b_staff" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const t=d.cases.map(c=>new Date(c.createdAt).getTime());for(let i=1;i<t.length;i++){if(t[i]>t[i-1]){console.error("không desc tại "+i);process.exit(1)}}' \
  && ok "H. lane sort createdAt desc (tất định)" || no "H. lane KHÔNG sort desc"
r=$(api "$JAR_AUD" GET "/api/cases/emergency"); b_aud=$(_split_body "$r"); trk "$b_aud"
has "$b_aud" "$C_EMERG_SENS_UN" && ok "H. AUDITOR thấy sensitive-unassigned (STAFF thì không → gate role-đúng)" || no "H. AUDITOR KHÔNG thấy sensitive-unassigned"
# H2 (P9-H-1) tiebreaker {id:desc} + soft-delete loại, trên lane ADMIN.
ord_of() { printf '%s' "$1" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const a=process.argv[1],b=process.argv[2];const ids=d.cases.map(c=>c.id);const ia=ids.indexOf(a),ib=ids.indexOf(b);if(ia<0||ib<0){console.log("MISSING");process.exit(0)}console.log(ia<ib?a:b)' "$2" "$3"; }
r=$(api "$JAR_ADMIN" GET "/api/cases/emergency"); b_admin=$(_split_body "$r"); trk "$b_admin"
has "$b_admin" "$C_SOFT_DELETED" && no "H2. lane LỌT case soft-deleted (deletedAt filter thủng)" || ok "H2. lane loại case soft-deleted"
hi="$(printf '%s\n%s\n' "$C_EMERG_PUB" "$C_EMERG_PUB2" | sort | tail -1)"  # id lexicographically cao nhất → PHẢI đứng trước (id desc)
order1="$(ord_of "$b_admin" "$C_EMERG_PUB" "$C_EMERG_PUB2")"
[ "$order1" = "$hi" ] && ok "H2. tie createdAt → id desc (id cao đứng trước): $hi" || no "H2. tie KHÔNG theo id desc (trước='$order1', mong '$hi')"
r=$(api "$JAR_ADMIN" GET "/api/cases/emergency"); b_admin2=$(_split_body "$r"); trk "$b_admin2"
order2="$(ord_of "$b_admin2" "$C_EMERG_PUB" "$C_EMERG_PUB2")"
[ "$order1" = "$order2" ] && ok "H2. thứ tự tie ỔN ĐỊNH qua 2 lần GET ($order1)" || no "H2. thứ tự tie ĐỔI giữa 2 GET ($order1 vs $order2)"

echo "  → I. CHANGE-PASSWORD rate-limit (chống brute-force currentPassword qua phiên hợp lệ)"
# Dùng user RL-probe DÙNG-MỘT-LẦN (sbd P9RL-<run>, id mới mỗi run) → bucket pwchange LUÔN sạch kể cả khi
# tái dùng dev-server (in-memory Map còn state) → §I không flaky/vacuous theo tiến trình tái dùng.
login "$JAR_RL" "$RL_SBD" || { echo "    ✗ login RL-probe fail"; exit 1; }
# currentPassword luôn SAI → MK KHÔNG đổi → 10×401, lần 11→429.
cp_fail=0
for _ in $(seq 1 10); do
  r=$(api "$JAR_RL" POST /api/auth/change-password "{\"currentPassword\":\"wrong-$RANDOM\",\"newPassword\":\"Whatever@12345\"}"); s=$(_split_status "$r"); track "$(_split_body "$r")"
  [ "$s" = "401" ] || cp_fail=1
done
[ "$cp_fail" = "0" ] && ok "I. 10 lần currentPassword sai đều 401" || no "I. có lần != 401 trong 10 lần đầu"
r=$(api "$JAR_RL" POST /api/auth/change-password "{\"currentPassword\":\"wrong-final\",\"newPassword\":\"Whatever@12345\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); track "$b"
expect_status "I. lần 11 change-password → 429" 429 "$s"
has "$b" '"error":"Too many requests"' && ok "I. body 429 = 'Too many requests'" || no "I. body 429 sai"
# I2 (P9-TEST-I-VACUITY-02) NEGATIVE CONTROL per-user keying: user KHÁC (student1, bucket riêng) thử 1 lần
#   → 401 (KHÔNG 429). Chứng minh key theo payload.sub; nếu key per-IP/global thì student1 đã bị 429 lây.
r=$(api "$JAR_STU1" POST /api/auth/change-password "{\"currentPassword\":\"wrong-ne\",\"newPassword\":\"Whatever@12345\"}"); s=$(_split_status "$r"); track "$(_split_body "$r")"
expect_status "I2. user KHÁC vẫn 401 không 429 (key theo user, không lây)" 401 "$s"

echo "  → D. LEAK SCAN"
if grep -qi "passwordHash\|password_hash" "$ALLBODIES"; then no "D. rò passwordHash"; else ok "D. không rò passwordHash"; fi
if grep -Eq '"(sbd|dob|email|admissionYear)":' "$P9BODIES"; then no "D. rò PII trong response P9"; else ok "D. response P9 không rò PII"; fi

# ─────────────────────────── Tổng kết ───────────────────────────
echo ""
echo "  P9: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
