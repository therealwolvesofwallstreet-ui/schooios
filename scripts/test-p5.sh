#!/usr/bin/env bash
# scripts/test-p5.sh — kiểm thử Workflow + Assignment (P5) end-to-end qua HTTP (v2, sau audit).
# Tự quản vòng đời server (dev mode: secure cookie off → round-trip cookie qua http localhost).
# Fixture ephemeral (web/prisma/p5-fixture.ts) tạo user test + case ở từng trạng thái, in KEY=VALUE.
# Phủ: state machine 7 trạng thái (gồm WAITING_FOR_USER), assign/reassign, scope, optimistic-lock
#   song song (status + reassign), side-effect transaction (HIST/AUDIT/NOTIF), no-op, PII leak.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
ALLBODIES="$(mktemp)"   # mọi response → quét passwordHash
CASEBODIES="$(mktemp)"  # chỉ response endpoint case → quét PII (sbd/dob/email…)
SERVER_PID=""
SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STAFF1="$(mktemp)"; JAR_STAFF2="$(mktemp)"; JAR_AUD="$(mktemp)"; JAR_STU="$(mktemp)"
JAR_R1="$(mktemp)"; JAR_R2="$(mktemp)"; RF1="$(mktemp)"; RF2="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p5-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$ALLBODIES" "$CASEBODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF1" "$JAR_STAFF2" "$JAR_AUD" \
        "$JAR_STU" "$JAR_R1" "$JAR_R2" "$RF1" "$RF2"
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
trk()   { printf '%s\n' "$1" >> "$ALLBODIES"; printf '%s\n' "$1" >> "$CASEBODIES"; } # response endpoint case
jget()  { echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }
has()   { echo "$1" | grep -q "$2"; }
# Đếm side-effect đã ghi của 1 case (qua fixture --counts) → set HIST/AUDIT/NOTIF.
counts_of() {
  local out; out="$( cd "$WEB" && npx --no-install tsx prisma/p5-fixture.ts --counts "$1" 2>/dev/null )"
  HIST="$(echo "$out" | grep '^HIST=' | cut -d= -f2)"; AUDIT="$(echo "$out" | grep '^AUDIT=' | cut -d= -f2)"
  NOTIF="$(echo "$out" | grep '^NOTIF=' | cut -d= -f2)"
  HIST="${HIST:-0}"; AUDIT="${AUDIT:-0}"; NOTIF="${NOTIF:-0}"
}
# Bắn 2 request SONG SONG (mỗi cái có jar/method/path/data RIÊNG) → set RS1/RS2 + track body.
# Bất biến kiểm sau đó (audit-count) mới là PASS/FAIL — không phụ thuộc việc 2 request có overlap hay không.
fire2() { # JARA MA PA DA  JARB MB PB DB
  api "$1" "$2" "$3" "$4" > "$RF1" 2>/dev/null & local pa=$!
  api "$5" "$6" "$7" "$8" > "$RF2" 2>/dev/null & local pb=$!
  wait "$pa" "$pb"
  RS1=$(_split_status "$(cat "$RF1")"); RS2=$(_split_status "$(cat "$RF2")")
  trk "$(_split_body "$(cat "$RF1")")"; trk "$(_split_body "$(cat "$RF2")")"
}

# ─────────────────────────── 1. Fixture ───────────────────────────
echo "  → setup fixture"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p5-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
ADMIN="$(getv P5FX_ADMIN)"; STAFF1="$(getv P5FX_STAFF1)"; STAFF2="$(getv P5FX_STAFF2)"
STAFF3="$(getv P5FX_STAFF3_INACTIVE)"; STUDENT1="$(getv P5FX_STUDENT1)"; CAT="$(getv P5FX_CAT)"
NEW_ASSIGN="$(getv P5FX_NEW_ASSIGN)"; NEW_SELFASSIGN="$(getv P5FX_NEW_SELFASSIGN)"
NEW_STAFF4="$(getv P5FX_NEW_STAFF4)"; NEW_BADASSIGNEE="$(getv P5FX_NEW_BADASSIGNEE)"
NEW_ADMIN2ADMIN="$(getv P5FX_NEW_ADMIN2ADMIN)"; NEW_BADTRANS="$(getv P5FX_NEW_BADTRANS)"
NEW_TRIAGE="$(getv P5FX_NEW_TRIAGE)"; NEW_STAFFTRIAGE="$(getv P5FX_NEW_STAFFTRIAGE)"
ASSIGNED="$(getv P5FX_ASSIGNED)"; INPROG="$(getv P5FX_INPROG)"; INPROG_W="$(getv P5FX_INPROG_W)"
REASSIGN_RACE="$(getv P5FX_REASSIGN_RACE)"; RESOLVED="$(getv P5FX_RESOLVED)"; CLOSED="$(getv P5FX_CLOSED)"
STAFF1_RUN="$(getv P5FX_STAFF1_RUN)"
STATUS_RACE="$(getv P5FX_STATUS_RACE)"; LOCKCHECK="$(getv P5FX_LOCKCHECK)"
CROSS1="$(getv P5FX_CROSS1)"; CROSS2="$(getv P5FX_CROSS2)"; CROSS3="$(getv P5FX_CROSS3)"
CROSS4="$(getv P5FX_CROSS4)"; CROSS5="$(getv P5FX_CROSS5)"; CROSSDET="$(getv P5FX_CROSSDET)"
if [ -z "$STAFF1" ] || [ -z "$CAT" ] || [ -z "$NEW_ASSIGN" ] || [ -z "$ASSIGNED" ] || [ -z "$STAFF3" ] || [ -z "$CROSS1" ] || [ -z "$LOCKCHECK" ]; then
  echo "    ✗ fixture thiếu dữ liệu. Output:"; echo "$FIXTURE_OUT"; exit 1
fi

# ─────────────────────── 2. Server (reuse / dev) ───────────────────────
probe() { local c; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/auth/me" 2>/dev/null); echo "${c:-000}"; }
if [ "$(probe)" != "000" ]; then
  echo "  → dùng lại server đang chạy tại $BASE_URL"
else
  echo "  → khởi động next dev (secure cookie off cho http)"
  ( cd "$WEB" && exec env P5_TEST_HOOKS=1 ./node_modules/.bin/next dev ) >"$SERVER_LOG" 2>&1 &
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
login() { local jar="$1" id="$2"; local r; r=$(api "$jar" POST /api/auth/login "{\"identifier\":\"$id\",\"password\":\"$PW\"}"); track "$(_split_body "$r")"; [ "$(_split_status "$r")" = "200" ]; }
login "$JAR_ADMIN"  "p5-admin@test.local"    || { echo "    ✗ login admin fail";  exit 1; }
login "$JAR_STAFF1" "p5-staff1@test.local"   || { echo "    ✗ login staff1 fail"; exit 1; }
login "$JAR_STAFF2" "p5-staff2@test.local"   || { echo "    ✗ login staff2 fail"; exit 1; }
login "$JAR_AUD"    "p5-auditor@test.local"  || { echo "    ✗ login auditor fail";exit 1; }
login "$JAR_STU"    "P5-0001"                || { echo "    ✗ login student fail"; exit 1; }

echo "  → ASSIGN"

# 1) ADMIN assign NEW_ASSIGN → staff1: 200, ASSIGNED, assignedTo staff1 + side-effect đã ghi
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_ASSIGN/assign" "{\"assignedToId\":\"$STAFF1\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "1. ADMIN assign NEW→staff1" 200 "$s"
has "$b" '"status":"ASSIGNED"' && ok "1. status=ASSIGNED" || no "1. status != ASSIGNED"
has "$b" "\"assignedToId\":\"$STAFF1\"" && ok "1. assignedTo=staff1" || no "1. assignedTo != staff1"
counts_of "$NEW_ASSIGN"
{ [ "$HIST" -ge 1 ] && [ "$AUDIT" -ge 1 ] && [ "$NOTIF" -ge 1 ]; } && ok "1. side-effect ghi thật (HIST=$HIST AUDIT=$AUDIT NOTIF=$NOTIF)" || no "1. side-effect thiếu (HIST=$HIST AUDIT=$AUDIT NOTIF=$NOTIF)"

# 2) ADMIN assign NEW_ASSIGN → student1: 400 (assignee không phải STAFF/ADMIN)
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_ASSIGN/assign" "{\"assignedToId\":\"$STUDENT1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "2. ADMIN assign → student (invalid assignee)" 400 "$s"

# 3) STAFF1 self-assign NEW_SELFASSIGN: 200 ASSIGNED
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$NEW_SELFASSIGN/assign" "{\"assignedToId\":\"$STAFF1\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "3. STAFF1 self-assign NEW" 200 "$s"
has "$b" '"status":"ASSIGNED"' && ok "3. status=ASSIGNED" || no "3. status != ASSIGNED"

# 4) STAFF1 assign NEW_STAFF4 (fresh NEW) → staff2: 403 — 403 CHỈ do self-restriction (case vẫn assignable)
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$NEW_STAFF4/assign" "{\"assignedToId\":\"$STAFF2\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "4. STAFF1 assign cho staff2 (chỉ self)" 403 "$s"
# 4b) positive control: STAFF1 self-assign NEW_STAFF4 → 200 (chứng minh case đã assignable; 403 trên là self-guard)
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$NEW_STAFF4/assign" "{\"assignedToId\":\"$STAFF1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "4b. STAFF1 self-assign cùng case (control)" 200 "$s"
# 4c) STAFF1 self-assign case đang chạy (ASSIGNED owned staff1): 403 (!isAssignable)
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$ASSIGNED/assign" "{\"assignedToId\":\"$STAFF1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "4c. STAFF1 self-assign case ASSIGNED (running)" 403 "$s"
# 4d) STAFF1 self-assign case IN_PROGRESS owned staff1: 403 (!isAssignable)
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$STAFF1_RUN/assign" "{\"assignedToId\":\"$STAFF1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "4d. STAFF1 self-assign case IN_PROGRESS (running)" 403 "$s"

# 5) STUDENT assign: 403; AUDITOR assign: 403
r=$(api "$JAR_STU" PATCH "/api/cases/$NEW_BADTRANS/assign" "{\"assignedToId\":\"$STAFF1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "5. STUDENT assign" 403 "$s"
r=$(api "$JAR_AUD" PATCH "/api/cases/$NEW_BADTRANS/assign" "{\"assignedToId\":\"$STAFF1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "5. AUDITOR assign" 403 "$s"

# 6) ADMIN reassign INPROG → staff2: status VẪN IN_PROGRESS; assignedTo staff1→staff2; KHÔNG sinh history
r=$(api "$JAR_ADMIN" GET "/api/cases/$INPROG"); b=$(_split_body "$r"); trk "$b"
has "$b" "\"assignedToId\":\"$STAFF1\"" && ok "6. pre: assignedTo=staff1" || no "6. pre: assignedTo != staff1"
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$INPROG/assign" "{\"assignedToId\":\"$STAFF2\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "6. ADMIN reassign IN_PROGRESS→staff2" 200 "$s"
has "$b" '"status":"IN_PROGRESS"' && ok "6. status VẪN IN_PROGRESS" || no "6. status bị đổi"
has "$b" "\"assignedToId\":\"$STAFF2\"" && ok "6. assignedTo=staff2" || no "6. assignedTo != staff2"
r=$(api "$JAR_ADMIN" GET "/api/cases/$INPROG"); b=$(_split_body "$r"); trk "$b"
has "$b" '"statusHistory":\[\]' && ok "6. reassign KHÔNG sinh status-history" || no "6. reassign sinh history sai"

# 6e) No-op reassign (→ staff2 lần nữa): 200, KHÔNG audit/notify thừa
counts_of "$INPROG"; A_BEFORE="$AUDIT"; N_BEFORE="$NOTIF"
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$INPROG/assign" "{\"assignedToId\":\"$STAFF2\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "6e. no-op reassign (cùng người)" 200 "$s"
counts_of "$INPROG"
{ [ "$AUDIT" = "$A_BEFORE" ] && [ "$NOTIF" = "$N_BEFORE" ]; } && ok "6e. no-op KHÔNG ghi audit/notify thừa (AUDIT $AUDIT, NOTIF $NOTIF)" || no "6e. no-op ghi thừa (AUDIT $A_BEFORE→$AUDIT, NOTIF $N_BEFORE→$NOTIF)"

# 7) ADMIN assign CLOSED: 409
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$CLOSED/assign" "{\"assignedToId\":\"$STAFF1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "7. ADMIN assign case CLOSED" 409 "$s"
# 7b) ADMIN assign → id không tồn tại: 400
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_BADASSIGNEE/assign" "{\"assignedToId\":\"khong-ton-tai-xyz\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "7b. ADMIN assign → assignee không tồn tại" 400 "$s"
# 7c) ADMIN assign → staff3 (inactive): 400
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_BADASSIGNEE/assign" "{\"assignedToId\":\"$STAFF3\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "7c. ADMIN assign → staff inactive" 400 "$s"
# 7d) ADMIN assign → admin (ADMIN target hợp lệ): 200 ASSIGNED, assignedTo admin
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_ADMIN2ADMIN/assign" "{\"assignedToId\":\"$ADMIN\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "7d. ADMIN assign → admin (ADMIN target)" 200 "$s"
has "$b" '"status":"ASSIGNED"' && has "$b" "\"assignedToId\":\"$ADMIN\"" && ok "7d. ASSIGNED + assignedTo=admin" || no "7d. sai status/assignedTo"

echo "  → STATUS"

# 8) NEW → CLOSED: 400 + message
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_BADTRANS/status" "{\"status\":\"CLOSED\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "8. NEW→CLOSED (invalid)" 400 "$s"
has "$b" "Cannot transition from NEW to CLOSED" && ok "8. message đúng" || no "8. message sai ($b)"

# 9) ADMIN NEW → TRIAGED: 200
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_TRIAGE/status" "{\"status\":\"TRIAGED\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "9. ADMIN NEW→TRIAGED" 200 "$s"
has "$b" '"status":"TRIAGED"' && ok "9. status=TRIAGED" || no "9. status != TRIAGED"
# 9b) STAFF1 triage NEW → TRIAGED (case không assigned cho mình): 200 — nhánh inTriage của STAFF
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$NEW_STAFFTRIAGE/status" "{\"status\":\"TRIAGED\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "9b. STAFF1 triage NEW→TRIAGED" 200 "$s"

# 10) ADMIN status=ASSIGNED trên case TRIAGED: 400 (ASSIGNED chỉ qua assign)
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_TRIAGE/status" "{\"status\":\"ASSIGNED\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "10. TRIAGED→ASSIGNED (chỉ qua assign)" 400 "$s"

# 11) staff1 lifecycle trên ASSIGNED: →IN_PROGRESS →RESOLVED(resolvedAt) →CLOSED(closedAt) + check trước/sau
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$ASSIGNED/status" "{\"status\":\"IN_PROGRESS\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "11a. ASSIGNED→IN_PROGRESS" 200 "$s"
has "$b" '"resolvedAt":null' && ok "11a. resolvedAt còn null" || no "11a. resolvedAt sai (mong null)"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$ASSIGNED/status" "{\"status\":\"RESOLVED\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "11b. IN_PROGRESS→RESOLVED" 200 "$s"
has "$b" '"resolvedAt":"' && ok "11b. resolvedAt được set" || no "11b. resolvedAt chưa set"
has "$b" '"closedAt":null' && ok "11b. closedAt còn null" || no "11b. closedAt sai (mong null)"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$ASSIGNED/status" "{\"status\":\"CLOSED\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "11c. RESOLVED→CLOSED" 200 "$s"
has "$b" '"closedAt":"' && ok "11c. closedAt được set" || no "11c. closedAt chưa set"
counts_of "$ASSIGNED"
{ [ "$HIST" -ge 3 ] && [ "$AUDIT" -ge 3 ] && [ "$NOTIF" -ge 3 ]; } && ok "11. side-effect lifecycle (HIST=$HIST AUDIT=$AUDIT NOTIF=$NOTIF)" || no "11. side-effect lifecycle thiếu (HIST=$HIST AUDIT=$AUDIT NOTIF=$NOTIF)"

# 12) RESOLVED → IN_PROGRESS (reopen): 200, resolvedAt về null, closedAt vẫn null
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$RESOLVED/status" "{\"status\":\"IN_PROGRESS\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "12. RESOLVED→IN_PROGRESS (reopen)" 200 "$s"
has "$b" '"resolvedAt":null' && ok "12. resolvedAt về null" || no "12. resolvedAt chưa clear"
has "$b" '"closedAt":null' && ok "12. closedAt vẫn null" || no "12. closedAt bị đụng sai"

# 13) CLOSED → IN_PROGRESS: 400 (terminal)
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$CLOSED/status" "{\"status\":\"IN_PROGRESS\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "13. CLOSED→IN_PROGRESS (terminal)" 400 "$s"

# 14) Anti-enumeration: owner (staff1) THẤY case (control 200) còn staff2 KHÔNG (404)
r=$(api "$JAR_STAFF1" GET "/api/cases/$STAFF1_RUN"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "14a. owner staff1 GET STAFF1_RUN (control)" 200 "$s"
r=$(api "$JAR_STAFF2" PATCH "/api/cases/$STAFF1_RUN/status" "{\"status\":\"WAITING_FOR_USER\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "14b. STAFF2 status case ngoài scope (404)" 404 "$s"

# 14W) WAITING_FOR_USER — phủ cả 3 cạnh (staff1 owner trên INPROG_W)
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$INPROG_W/status" "{\"status\":\"WAITING_FOR_USER\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "14W-a. IN_PROGRESS→WAITING_FOR_USER" 200 "$s"
has "$b" '"status":"WAITING_FOR_USER"' && ok "14W-a. status=WAITING_FOR_USER" || no "14W-a. status sai"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$INPROG_W/status" "{\"status\":\"IN_PROGRESS\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "14W-b. WAITING_FOR_USER→IN_PROGRESS" 200 "$s"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$INPROG_W/status" "{\"status\":\"WAITING_FOR_USER\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "14W-c. IN_PROGRESS→WAITING_FOR_USER (lần 2)" 200 "$s"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$INPROG_W/status" "{\"status\":\"RESOLVED\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "14W-d. WAITING_FOR_USER→RESOLVED" 200 "$s"
has "$b" '"resolvedAt":"' && ok "14W-d. resolvedAt được set" || no "14W-d. resolvedAt chưa set"

# 15) STUDENT status: 403; AUDITOR status: 403
r=$(api "$JAR_STU" PATCH "/api/cases/$NEW_BADTRANS/status" "{\"status\":\"TRIAGED\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "15. STUDENT status" 403 "$s"
r=$(api "$JAR_AUD" PATCH "/api/cases/$NEW_BADTRANS/status" "{\"status\":\"TRIAGED\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "15. AUDITOR status" 403 "$s"

# 16) Body status rác: 400
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$NEW_BADTRANS/status" "{\"status\":\"FOO\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "16. status rác (Zod nativeEnum)" 400 "$s"

echo "  → RACE & LOCK (PASS/FAIL theo BẤT BIẾN audit, không phụ thuộc timing)"
CONC=0  # số lần quan sát 409 (đua thật xảy ra) — chỉ để quan sát, không quyết định PASS/FAIL
note_conc() { { [ "$RS1" = "409" ] || [ "$RS2" = "409" ]; } && CONC=$((CONC+1)); }

# 17) reassign ∥ reassign (cùng admin) trên case đang chạy — version-lock của ASSIGN route
cp "$JAR_ADMIN" "$JAR_R1"; cp "$JAR_ADMIN" "$JAR_R2"
fire2 "$JAR_R1" PATCH "/api/cases/$REASSIGN_RACE/assign" "{\"assignedToId\":\"$STAFF2\"}" \
      "$JAR_R2" PATCH "/api/cases/$REASSIGN_RACE/assign" "{\"assignedToId\":\"$STAFF2\"}"
echo "    · 17 reassign∥reassign → $RS1/$RS2"; note_conc

# 18) status ∥ status — version/status-lock của STATUS route
cp "$JAR_ADMIN" "$JAR_R1"; cp "$JAR_ADMIN" "$JAR_R2"
fire2 "$JAR_R1" PATCH "/api/cases/$STATUS_RACE/status" "{\"status\":\"TRIAGED\"}" \
      "$JAR_R2" PATCH "/api/cases/$STATUS_RACE/status" "{\"status\":\"TRIAGED\"}"
echo "    · 18 status∥status → $RS1/$RS2"; note_conc

# 19) CROSS: assign ∥ status (×5) — ĐÂY là test DUY NHẤT thực thi `updatedAt` của STATUS route
#     (xoá updatedAt khỏi status route ⇒ khi assign thắng trước, status vẫn ghi đè ⇒ 2 audit ⇒ FAIL).
CROSS_IDS="$CROSS1 $CROSS2 $CROSS3 $CROSS4 $CROSS5"
for cid in $CROSS_IDS; do
  cp "$JAR_ADMIN" "$JAR_R1"; cp "$JAR_STAFF1" "$JAR_R2"
  fire2 "$JAR_R1" PATCH "/api/cases/$cid/assign"  "{\"assignedToId\":\"$STAFF2\"}" \
        "$JAR_R2" PATCH "/api/cases/$cid/status"  "{\"status\":\"RESOLVED\"}"
  echo "    · 19 cross($cid) → $RS1/$RS2"; note_conc
done

# BẤT BIẾN: mỗi case đua phải có ĐÚNG 1 mutation-audit (winner ghi 1; loser bị 409 ghi 0).
#   correct → luôn 1 (dù chạy đua hay serialize); lock thủng & đua thật → 2 ⇒ FAIL. KHÔNG false-fail.
RACE_CASES="$REASSIGN_RACE $STATUS_RACE $CROSS_IDS"
AUDIT_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p5-fixture.ts --audit $RACE_CASES 2>/dev/null )"
audit_of() { echo "$AUDIT_OUT" | grep "^AUDIT_$1=" | head -1 | cut -d= -f2; }
race_ok=1; bad=""
for cid in $RACE_CASES; do
  n="$(audit_of "$cid")"; n="${n:-?}"
  [ "$n" = "1" ] || { race_ok=0; bad="$bad $cid=$n"; }
done
[ "$race_ok" = "1" ] && ok "17-19. mọi case đua có ĐÚNG 1 mutation-audit (không lost-update)" \
                     || no "17-19. >1 mutation-audit ⇒ optimistic-lock THỦNG ($bad)"
[ "$CONC" -ge 1 ] && ok "17-19. quan sát $CONC lần đua thật (409) — lock được THỰC THI" \
                  || echo "    ~ 17-19. không quan sát 409 nào (môi trường serialize hết; bất biến audit vẫn giữ)"

# 19det) CROSS TẤT ĐỊNH — ép interleaving "assign commit GIỮA read↔write của STATUS" bằng hook delay
#   (server do script này khởi động đã bật P5_TEST_HOOKS=1). Đây là test DUY NHẤT chứng minh TẤT ĐỊNH
#   rằng STATUS route thực sự chặn ghi-đè theo version. Lock đúng → status thức dậy thấy updatedAt đổi
#   → 409, case chỉ 1 mutation-audit. Lock thủng (status thiếu updatedAt) → status ghi đè → 2 audit ⇒ FAIL.
cp "$JAR_STAFF1" "$JAR_R2"
curl -s -w $'\n%{http_code}' --max-time 30 -X PATCH -H "Content-Type: application/json" \
  -H "x-p5-test-delay-ms: 800" -c "$JAR_R2" -b "$JAR_R2" \
  -d "{\"status\":\"RESOLVED\"}" "$BASE_URL/api/cases/$CROSSDET/status" > "$RF2" 2>/dev/null & pstat=$!
sleep 0.3   # để status kịp đọc cur & vào vùng delay TRƯỚC khi assign commit
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$CROSSDET/assign" "{\"assignedToId\":\"$STAFF2\"}"); sdet_a=$(_split_status "$r"); trk "$(_split_body "$r")"
wait "$pstat"
sdet_s=$(_split_status "$(cat "$RF2")"); trk "$(_split_body "$(cat "$RF2")")"
echo "    · 19det cross(delay 800ms): assign=$sdet_a status=$sdet_s"
DET_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p5-fixture.ts --audit $CROSSDET 2>/dev/null )"
ndet="$(echo "$DET_OUT" | grep "^AUDIT_$CROSSDET=" | head -1 | cut -d= -f2)"; ndet="${ndet:-?}"
[ "$ndet" = "1" ] && ok "19det. cross TẤT ĐỊNH: ĐÚNG 1 mutation-audit (STATUS chặn ghi-đè theo version)" \
                  || no "19det. cross TẤT ĐỊNH: $ndet mutation-audit ⇒ STATUS-route optimistic-lock THỦNG"
if [ "$sdet_a" = "200" ] && [ "$sdet_s" = "409" ]; then
  ok "19det. interleaving ép đúng (assign=200 commit trước, status=409 — hook hoạt động)"
else
  echo "    ~ 19det. interleaving khác kỳ vọng (assign=$sdet_a status=$sdet_s) — server tái dùng không bật hook? Vẫn dựa bất biến audit ở trên."
fi

# 20) LOCKCHECK — semantics optimistic-lock theo updatedAt trên Postgres THẬT (mục D, TẤT ĐỊNH):
#     writer mang updatedAt CŨ → updateMany khớp 0 dòng; writer mang updatedAt MỚI → khớp 1 dòng.
LC_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p5-fixture.ts --lockcheck "$LOCKCHECK" 2>/dev/null )"
LC_STALE="$(echo "$LC_OUT" | grep '^LOCKCHECK_STALE=' | cut -d= -f2)"
LC_FRESH="$(echo "$LC_OUT" | grep '^LOCKCHECK_FRESH=' | cut -d= -f2)"
[ "$LC_STALE" = "0" ] && ok "20. updatedAt cũ (stale) → updateMany khớp 0 dòng (lock từ chối)" || no "20. stale updatedAt khớp '$LC_STALE' dòng (mong 0)"
[ "$LC_FRESH" = "1" ] && ok "20. updatedAt mới (fresh) → updateMany khớp 1 dòng" || no "20. fresh updatedAt khớp '$LC_FRESH' dòng (mong 1)"

# 21) Leak-check CUỐI CÙNG (sau khi mọi body đã track): passwordHash trên mọi response; PII trên response case
if grep -qi "passwordHash\|password_hash" "$ALLBODIES"; then no "21. rò passwordHash trong response"; else ok "21. không rò passwordHash"; fi
if grep -Eq '"(sbd|dob|email|admissionYear)":' "$CASEBODIES"; then no "21. rò PII (sbd/dob/email/admissionYear) trong response case"; else ok "21. response case không rò PII"; fi

# ─────────────────────────── Tổng kết ───────────────────────────
echo ""
echo "  P5: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
