#!/usr/bin/env bash
# scripts/test-p7.sh — kiểm thử Emergency lane + Dashboard (P7) end-to-end qua HTTP.
# Tự quản vòng đời server (dev mode: secure cookie off → round-trip cookie qua http localhost).
# Fixture ephemeral (web/prisma/p7-fixture.ts) tạo user + nhiều case (emergency mở/đóng, stale,
#   unassigned, rải status/priority/location), in KEY=VALUE.
# Phủ: flip isEmergency nguyên tử (no-op không ghi trùng, chỉ false→true mới notify, de-escalate có
#   audit không notify), recipient = mọi ADMIN + assignee trừ actor, lane bỏ scope STAFF cho case CÔNG
#   KHAI (thấy hết kể cả ngoài NEW/TRIAGED + không-được-giao) NHƯNG case NHẠY CẢM chỉ cho ADMIN/AUDITOR
#   + assignee, activeOnly loại CLOSED, soft-deleted loại, dashboard aggregate + sanity Σ, 401/400/403/404,
#   optimistic-lock 409 tất định, PII/passwordHash leak.
#
# GHI CHÚ "MỌI ADMIN": route notify TẤT CẢ admin active (gồm 3 admin THẬT bootstrap). Test khẳng định
#   trên admin FIXTURE (đại diện có kiểm soát) qua DELTA per-user; teardown dọn notif admin-thật qua caseId.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
ALLBODIES="$(mktemp)"   # MỌI response (gồm login) → quét passwordHash
P7BODIES="$(mktemp)"    # CHỈ response endpoint P7 → quét PII (login echo email/sbd chính chủ là hợp lệ)
SERVER_PID=""
SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STAFF1="$(mktemp)"; JAR_AUD="$(mktemp)"; JAR_STU1="$(mktemp)"; JAR_EMPTY="$(mktemp)"
JAR_RACE_A="$(mktemp)"; JAR_RACE_B="$(mktemp)"   # bản sao jar cho 2 request đua (tránh tranh chấp cookie file)

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p7-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$ALLBODIES" "$P7BODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF1" "$JAR_AUD" "$JAR_STU1" "$JAR_EMPTY" \
        "$JAR_RACE_A" "$JAR_RACE_B"
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
trk()   { printf '%s\n' "$1" >> "$ALLBODIES"; printf '%s\n' "$1" >> "$P7BODIES"; }
has()   { echo "$1" | grep -q "$2"; }
jnum()  { echo "$1" | grep -o "\"$2\":[0-9]*" | head -1 | cut -d: -f2; }
# Đếm side-effect EMERGENCY (qua fixture --counts) → set AUDIT_EMERG/NOTIF_CASE/NOTIF_USER.
counts_of() {
  local out; out="$( cd "$WEB" && npx --no-install tsx prisma/p7-fixture.ts --counts "$1" 2>/dev/null )"
  AUDIT_EMERG="$(echo "$out" | grep '^AUDIT_EMERG=' | cut -d= -f2)"
  NOTIF_CASE="$(echo "$out" | grep '^NOTIF_CASE=' | cut -d= -f2)"
  NOTIF_USER="$(echo "$out" | grep '^NOTIF_USER=' | cut -d= -f2)"
  AUDIT_EMERG="${AUDIT_EMERG:-0}"; NOTIF_CASE="${NOTIF_CASE:-0}"; NOTIF_USER="${NOTIF_USER:-0}"
}
# Lấy metadata audit EMERGENCY_FLAG mới nhất của 1 case (JSON) → xác thực NỘI DUNG before/after/reason.
audit_meta_of() {
  META="$( cd "$WEB" && npx --no-install tsx prisma/p7-fixture.ts --audit-meta "$1" 2>/dev/null | grep '^META=' | cut -d= -f2- )"
}

# ─────────────────────────── 1. Fixture ───────────────────────────
echo "  → setup fixture"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p7-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
ADMIN="$(getv P7FX_ADMIN)"; ADMIN2="$(getv P7FX_ADMIN2)"; STAFF1="$(getv P7FX_STAFF1)"; AUDITOR="$(getv P7FX_AUDITOR)"; STUDENT1="$(getv P7FX_STUDENT1)"
CASE_A="$(getv P7FX_CASE_A)"; CASE_NORMAL="$(getv P7FX_CASE_NORMAL)"; CASE_UNASSIGNED="$(getv P7FX_CASE_UNASSIGNED)"; CASE_RACE="$(getv P7FX_CASE_RACE)"
EM_OPEN_1="$(getv P7FX_EM_OPEN_1)"; EM_OPEN_2="$(getv P7FX_EM_OPEN_2)"; EM_CLOSED="$(getv P7FX_EM_CLOSED)"; EM_SOFT_DELETED="$(getv P7FX_EM_SOFT_DELETED)"
EM_SENS_UNASSIGNED="$(getv P7FX_EM_SENS_UNASSIGNED)"; EM_SENS_STAFF1="$(getv P7FX_EM_SENS_STAFF1)"
N_EMERGENCY_OPEN="$(getv P7FX_N_EMERGENCY_OPEN)"; N_STALE="$(getv P7FX_N_STALE)"
if [ -z "$STAFF1" ] || [ -z "$ADMIN" ] || [ -z "$ADMIN2" ] || [ -z "$CASE_A" ] || [ -z "$CASE_RACE" ] || [ -z "$EM_OPEN_2" ] || [ -z "$EM_CLOSED" ] || [ -z "$EM_SOFT_DELETED" ] || [ -z "$EM_SENS_UNASSIGNED" ] || [ -z "$EM_SENS_STAFF1" ]; then
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
login "$JAR_ADMIN"  "p7-admin@test.local"   || { echo "    ✗ login admin fail";   exit 1; }
login "$JAR_STAFF1" "p7-staff1@test.local"  || { echo "    ✗ login staff1 fail";  exit 1; }
login "$JAR_AUD"    "p7-auditor@test.local" || { echo "    ✗ login auditor fail"; exit 1; }
login "$JAR_STU1"   "P7-0001"               || { echo "    ✗ login student1 fail";exit 1; }

echo "  → EMERGENCY FLAG"

# 1) STAFF1 PATCH CASE_A true (case của-mình, đang false) → 200, isEmergency=true
counts_of "$ADMIN";   adm_nu_b="$NOTIF_USER"
counts_of "$STAFF1";  st_nu_b="$NOTIF_USER"
counts_of "$CASE_A";  ca_au_b="$AUDIT_EMERG"; ca_nc_b="$NOTIF_CASE"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$CASE_A/emergency" "{\"isEmergency\":true,\"reason\":\"chay ket\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "1. STAFF1 PATCH true" 200 "$s"
has "$b" '"isEmergency":true' && ok "1b. case.isEmergency=true" || no "1b. isEmergency không true"
counts_of "$ADMIN";   adm_nu_a="$NOTIF_USER"
counts_of "$STAFF1";  st_nu_a="$NOTIF_USER"
counts_of "$CASE_A";  ca_au_a="$AUDIT_EMERG"; ca_nc_a="$NOTIF_CASE"
[ "$((ca_au_a - ca_au_b))" -eq 1 ] && ok "1c. audit EMERGENCY_FLAG +1" || no "1c. audit delta != 1 ($ca_au_b→$ca_au_a)"
# 1d) BẤT BIẾN: endpoint chỉ đụng isEmergency — status & studentFlaggedEmergency KHÔNG đổi (CASE_A IN_PROGRESS, flag HS=false)
{ has "$b" '"status":"IN_PROGRESS"' && has "$b" '"studentFlaggedEmergency":false'; } && ok "1d. status & studentFlaggedEmergency KHÔNG đổi" || no "1d. endpoint đụng status/studentFlaggedEmergency (sai invariant)"
# 1e) audit metadata ĐÚNG NỘI DUNG {before:false, after:true, reason:'chay ket'} (không chỉ đếm dòng)
audit_meta_of "$CASE_A"
printf '%s' "$META" | node -e 'const m=JSON.parse(require("fs").readFileSync(0,"utf8"));if(!(m&&m.before&&m.after&&m.before.isEmergency===false&&m.after.isEmergency===true&&m.reason==="chay ket")){console.error("meta sai:",JSON.stringify(m));process.exit(1)}' \
  && ok "1e. audit metadata {before:false,after:true,reason:'chay ket'}" || no "1e. audit metadata sai nội dung"

# 2) Sau (1): admin FIXTURE nhận EMERGENCY_CONFIRMED (+1); actor STAFF1 KHÔNG nhận (+0)
[ "$((adm_nu_a - adm_nu_b))" -eq 1 ] && ok "2. admin(fixture) nhận EMERGENCY_CONFIRMED ($adm_nu_b→$adm_nu_a)" || no "2. admin notif delta != 1 ($adm_nu_b→$adm_nu_a)"
[ "$((st_nu_a - st_nu_b))" -eq 0 ] && ok "2. actor STAFF1 KHÔNG nhận ($st_nu_b→$st_nu_a)" || no "2. actor STAFF1 lại nhận notif (RÒ! $st_nu_b→$st_nu_a)"

# 3) NO-OP true→true → 200, delta audit==0 VÀ delta notif==0
counts_of "$CASE_A"; au_b="$AUDIT_EMERG"; nc_b="$NOTIF_CASE"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$CASE_A/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "3. NO-OP true→true" 200 "$s"
counts_of "$CASE_A"; au_a="$AUDIT_EMERG"; nc_a="$NOTIF_CASE"
{ [ "$((au_a - au_b))" -eq 0 ] && [ "$((nc_a - nc_b))" -eq 0 ]; } && ok "3. no-op KHÔNG ghi trùng (audit Δ0, notif Δ0)" || no "3. no-op ghi trùng (audit $au_b→$au_a, notif $nc_b→$nc_a)"

# 4) De-escalate true→false → 200; audit +1 (before:true,after:false); notif Δ0 (không notify khi hạ)
counts_of "$CASE_A"; au_b="$AUDIT_EMERG"; nc_b="$NOTIF_CASE"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$CASE_A/emergency" "{\"isEmergency\":false}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "4. de-escalate true→false" 200 "$s"
has "$b" '"isEmergency":false' && ok "4b. case.isEmergency=false" || no "4b. isEmergency không false"
counts_of "$CASE_A"; au_a="$AUDIT_EMERG"; nc_a="$NOTIF_CASE"
[ "$((au_a - au_b))" -eq 1 ] && ok "4. de-escalate audit +1" || no "4. de-escalate audit delta != 1 ($au_b→$au_a)"
[ "$((nc_a - nc_b))" -eq 0 ] && ok "4. de-escalate KHÔNG notify (notif Δ0)" || no "4. de-escalate lại notify ($nc_b→$nc_a)"
# 4c) audit metadata de-escalate {before:true, after:false, reason:null} (body không gửi reason)
audit_meta_of "$CASE_A"
printf '%s' "$META" | node -e 'const m=JSON.parse(require("fs").readFileSync(0,"utf8"));if(!(m&&m.before.isEmergency===true&&m.after.isEmergency===false&&m.reason===null)){console.error("meta sai:",JSON.stringify(m));process.exit(1)}' \
  && ok "4c. de-escalate metadata {before:true,after:false,reason:null}" || no "4c. de-escalate metadata sai"

# 5) NO-OP false→false (CASE_NORMAL, case thường) → 200, delta audit==0 và notif==0
counts_of "$CASE_NORMAL"; au_b="$AUDIT_EMERG"; nc_b="$NOTIF_CASE"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$CASE_NORMAL/emergency" "{\"isEmergency\":false}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "5. NO-OP false→false" 200 "$s"
counts_of "$CASE_NORMAL"; au_a="$AUDIT_EMERG"; nc_a="$NOTIF_CASE"
{ [ "$((au_a - au_b))" -eq 0 ] && [ "$((nc_a - nc_b))" -eq 0 ]; } && ok "5. no-op false→false KHÔNG ghi gì" || no "5. no-op false→false ghi (audit $au_b→$au_a, notif $nc_b→$nc_a)"

# 6) CASE_UNASSIGNED (chưa giao) bật true → CHỈ admin nhận; STAFF1 (actor) KHÔNG
counts_of "$ADMIN";  adm_nu_b="$NOTIF_USER"
counts_of "$STAFF1"; st_nu_b="$NOTIF_USER"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$CASE_UNASSIGNED/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "6. unassigned bật true" 200 "$s"
counts_of "$ADMIN";  adm_nu_a="$NOTIF_USER"
counts_of "$STAFF1"; st_nu_a="$NOTIF_USER"
[ "$((adm_nu_a - adm_nu_b))" -eq 1 ] && ok "6. CHỈ admin nhận (no assignee) ($adm_nu_b→$adm_nu_a)" || no "6. admin notif delta != 1 ($adm_nu_b→$adm_nu_a)"
[ "$((st_nu_a - st_nu_b))" -eq 0 ] && ok "6. STAFF1 actor KHÔNG nhận ($st_nu_b→$st_nu_a)" || no "6. STAFF1 nhận (RÒ! $st_nu_b→$st_nu_a)"

# 7) STAFF1 bật true trên case ĐƯỢC GIAO cho chính mình (CASE_A, đang false sau test 4) → staff1 +0, admin +1
counts_of "$ADMIN";  adm_nu_b="$NOTIF_USER"
counts_of "$STAFF1"; st_nu_b="$NOTIF_USER"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$CASE_A/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "7. STAFF1 bật true case của-mình" 200 "$s"
counts_of "$ADMIN";  adm_nu_a="$NOTIF_USER"
counts_of "$STAFF1"; st_nu_a="$NOTIF_USER"
[ "$((st_nu_a - st_nu_b))" -eq 0 ] && ok "7. STAFF1 (actor==assignee) KHÔNG tự nhận ($st_nu_b→$st_nu_a)" || no "7. STAFF1 tự nhận notif (RÒ! $st_nu_b→$st_nu_a)"
[ "$((adm_nu_a - adm_nu_b))" -eq 1 ] && ok "7. admin vẫn nhận ($adm_nu_b→$adm_nu_a)" || no "7. admin notif delta != 1 ($adm_nu_b→$adm_nu_a)"

# 7c) ADMIN làm ACTOR (flip CASE_NORMAL true) → admin1(actor) bị loại (+0); admin2 (admin KHÁC) nhận (+1)
counts_of "$ADMIN";  a1_b="$NOTIF_USER"
counts_of "$ADMIN2"; a2_b="$NOTIF_USER"
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$CASE_NORMAL/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "7c. ADMIN actor flip true" 200 "$s"
counts_of "$ADMIN";  a1_a="$NOTIF_USER"
counts_of "$ADMIN2"; a2_a="$NOTIF_USER"
[ "$((a1_a - a1_b))" -eq 0 ] && ok "7c. admin1 ACTOR bị loại khỏi notif (+0)" || no "7c. admin1 actor tự nhận (RÒ! $a1_b→$a1_a)"
[ "$((a2_a - a2_b))" -eq 1 ] && ok "7c. admin2 (admin khác) nhận (+1)" || no "7c. admin2 notif delta != 1 ($a2_b→$a2_a)"

# 7d) ADMIN de-escalate (CASE_NORMAL true→false) → 200, audit +1, notif Δ0 (path de-escalate cho ADMIN)
counts_of "$CASE_NORMAL"; n_au_b="$AUDIT_EMERG"; n_nc_b="$NOTIF_CASE"
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$CASE_NORMAL/emergency" "{\"isEmergency\":false}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "7d. ADMIN de-escalate" 200 "$s"
has "$b" '"isEmergency":false' && ok "7d. case.isEmergency=false" || no "7d. isEmergency không false"
counts_of "$CASE_NORMAL"; n_au_a="$AUDIT_EMERG"; n_nc_a="$NOTIF_CASE"
{ [ "$((n_au_a - n_au_b))" -eq 1 ] && [ "$((n_nc_a - n_nc_b))" -eq 0 ]; } && ok "7d. ADMIN de-escalate: audit +1, notif Δ0" || no "7d. ADMIN de-escalate sai (audit $n_au_b→$n_au_a, notif $n_nc_b→$n_nc_a)"

# 8) STUDENT PATCH → 403; AUDITOR PATCH → 403
r=$(api "$JAR_STU1" PATCH "/api/cases/$CASE_A/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "8. STUDENT PATCH emergency" 403 "$s"
r=$(api "$JAR_AUD" PATCH "/api/cases/$CASE_A/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "8. AUDITOR PATCH emergency" 403 "$s"

# 9) Body thiếu isEmergency → 400; PATCH case STAFF1 KHÔNG thấy (EM_OPEN_2: IN_PROGRESS, assigned admin) → 404
r=$(api "$JAR_ADMIN" PATCH "/api/cases/$CASE_A/emergency" "{}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "9. body thiếu isEmergency" 400 "$s"
r=$(api "$JAR_STAFF1" PATCH "/api/cases/$EM_OPEN_2/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "9. STAFF1 PATCH case không thấy" 404 "$s"

# 9c-9e) Chưa đăng nhập (JAR_EMPTY) → 401 cho cả 3 endpoint (PATCH emergency, GET lane, GET dashboard)
r=$(api "$JAR_EMPTY" PATCH "/api/cases/$CASE_A/emergency" "{\"isEmergency\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "9c. PATCH emergency không cookie" 401 "$s"
r=$(api "$JAR_EMPTY" GET "/api/cases/emergency"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "9d. GET lane không cookie" 401 "$s"
r=$(api "$JAR_EMPTY" GET "/api/dashboard"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "9e. GET dashboard không cookie" 401 "$s"

echo "  → LANE (công khai: 3 vai trò thấy hết; nhạy cảm: chỉ ADMIN/AUDITOR + assignee)"

# 10) STAFF GET lane → thấy MỌI emergency, gồm EM_OPEN_2 (IN_PROGRESS, giao admin) + EM_CLOSED
#     (ngoài scope thường của STAFF) → chứng minh lane bỏ scope. Sort createdAt desc.
r=$(api "$JAR_STAFF1" GET "/api/cases/emergency"); s=$(_split_status "$r"); b_staff=$(_split_body "$r"); trk "$b_staff"
expect_status "10. STAFF GET lane" 200 "$s"
has "$b_staff" "$EM_OPEN_2" && ok "10. STAFF thấy EM_OPEN_2 (IN_PROGRESS, giao admin — ngoài scope, công khai)" || no "10. STAFF KHÔNG thấy EM_OPEN_2"
has "$b_staff" "$EM_CLOSED" && ok "10. STAFF thấy EM_CLOSED (ngoài scope, công khai) → lane bỏ scope" || no "10. STAFF KHÔNG thấy EM_CLOSED"
# Sensitivity gate: STAFF thấy sensitive emergency ĐƯỢC GIAO mình, KHÔNG thấy sensitive emergency của người khác
has "$b_staff" "$EM_SENS_STAFF1" && ok "10. STAFF thấy sensitive emergency ĐƯỢC GIAO mình (assignee)" || no "10. STAFF KHÔNG thấy sensitive của mình"
has "$b_staff" "$EM_SENS_UNASSIGNED" && no "10. STAFF LỌT sensitive emergency KHÔNG-được-giao (RÒ RỈ!)" || ok "10. STAFF KHÔNG thấy sensitive emergency không-được-giao (gate đúng)"
printf '%s' "$b_staff" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const t=d.cases.map(c=>new Date(c.createdAt).getTime());for(let i=1;i<t.length;i++){if(t[i]>t[i-1]){console.error("không desc tại "+i);process.exit(1)}}' \
  && ok "10. sort createdAt desc" || no "10. KHÔNG sort createdAt desc"

# 11) ADMIN GET lane → ĐÚNG cùng tập emergency như STAFF (so total)
r=$(api "$JAR_ADMIN" GET "/api/cases/emergency"); s=$(_split_status "$r"); b_admin=$(_split_body "$r"); trk "$b_admin"
expect_status "11. ADMIN GET lane" 200 "$s"
ts="$(jnum "$b_staff" total)"; ta="$(jnum "$b_admin" total)"
# Sau chính sách sensitivity: ADMIN thấy NHIỀU hơn STAFF đúng bằng số sensitive emergency STAFF không được giao.
{ [ -n "$ts" ] && [ -n "$ta" ] && [ "$ta" -gt "$ts" ]; } && ok "11. ADMIN thấy NHIỀU hơn STAFF (admin=$ta > staff=$ts: sensitive-unassigned ẩn khỏi STAFF)" || no "11. ADMIN($ta) không > STAFF($ts)"
has "$b_admin" "$EM_SENS_UNASSIGNED" && ok "11. ADMIN thấy sensitive-unassigned emergency (STAFF thì không)" || no "11. ADMIN KHÔNG thấy sensitive-unassigned"
has "$b_admin" "$EM_OPEN_2" && ok "11. ADMIN thấy EM_OPEN_2" || no "11. ADMIN KHÔNG thấy EM_OPEN_2"

# 12) AUDITOR GET lane → 200, thấy MỌI emergency; payload KHÔNG PII (sbd/email/dob)
r=$(api "$JAR_AUD" GET "/api/cases/emergency"); s=$(_split_status "$r"); b_aud=$(_split_body "$r"); trk "$b_aud"
expect_status "12. AUDITOR GET lane" 200 "$s"
has "$b_aud" "$EM_OPEN_1" && ok "12. AUDITOR thấy emergency" || no "12. AUDITOR KHÔNG thấy emergency"
has "$b_aud" "$EM_SENS_UNASSIGNED" && ok "12. AUDITOR thấy sensitive emergency (read-only-all, giám sát)" || no "12. AUDITOR KHÔNG thấy sensitive"
if echo "$b_aud" | grep -Eq '"(sbd|dob|email|admissionYear)":'; then no "12. lane lộ PII"; else ok "12. lane KHÔNG lộ PII"; fi

# 13) STUDENT GET lane → 403
r=$(api "$JAR_STU1" GET "/api/cases/emergency"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "13. STUDENT GET lane" 403 "$s"

# 14) ?activeOnly=true → loại EM_CLOSED; vẫn còn EM_OPEN_1/EM_OPEN_2
r=$(api "$JAR_STAFF1" GET "/api/cases/emergency?activeOnly=true"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "14. GET lane?activeOnly=true" 200 "$s"
has "$b" "$EM_CLOSED" && no "14. activeOnly VẪN còn EM_CLOSED (sai)" || ok "14. activeOnly loại EM_CLOSED"
{ has "$b" "$EM_OPEN_1" && has "$b" "$EM_OPEN_2"; } && ok "14. activeOnly giữ emergency đang mở" || no "14. activeOnly mất emergency đang mở"
# 14c) EM_SOFT_DELETED (isEmergency=true NHƯNG deletedAt set) PHẢI bị loại khỏi lane đầy đủ (filter deletedAt:null)
has "$b_admin" "$EM_SOFT_DELETED" && no "14c. lane LỌT case soft-deleted (deletedAt filter thủng)" || ok "14c. lane loại case soft-deleted"

echo "  → DASHBOARD"

# 15) ADMIN GET dashboard → 200; đủ 10 key
r=$(api "$JAR_ADMIN" GET "/api/dashboard"); s=$(_split_status "$r"); b_dash=$(_split_body "$r"); trk "$b_dash"
expect_status "15. ADMIN GET dashboard" 200 "$s"
miss=""
for k in totalCases newToday emergencyOpen unassigned stale byStatus byPriority byCategory byLocation unlocated; do
  has "$b_dash" "\"$k\":" || miss="$miss $k"
done
[ -z "$miss" ] && ok "15. đủ 10 key dashboard" || no "15. thiếu key:$miss"

# 16) AUDITOR → 200; STAFF → 403; STUDENT → 403
r=$(api "$JAR_AUD" GET "/api/dashboard"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "16. AUDITOR GET dashboard" 200 "$s"
r=$(api "$JAR_STAFF1" GET "/api/dashboard"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "16. STAFF GET dashboard" 403 "$s"
r=$(api "$JAR_STU1" GET "/api/dashboard"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "16. STUDENT GET dashboard" 403 "$s"

# 17) Sanity: Σ byStatus._count==totalCases; Σ byLocation.count + unlocated==totalCases;
#     emergencyOpen >= fixture-open; stale >= fixture-stale
printf '%s' "$b_dash" | node -e '
  const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
  const ss=d.byStatus.reduce((a,x)=>a+x._count,0);
  const sl=d.byLocation.reduce((a,x)=>a+x.count,0);
  const e=[];
  if(ss!==d.totalCases) e.push("byStatus Σ "+ss+" != total "+d.totalCases);
  if(sl+d.unlocated!==d.totalCases) e.push("byLocation Σ "+sl+"+unlocated "+d.unlocated+" != total "+d.totalCases);
  if(e.length){console.error(e.join("; "));process.exit(1)}
' && ok "17. Σ byStatus==total ; Σ byLocation+unlocated==total" || no "17. sanity Σ sai"
eo="$(jnum "$b_dash" emergencyOpen)"; st="$(jnum "$b_dash" stale)"; eo="${eo:-0}"; st="${st:-0}"
[ "$eo" -ge "${N_EMERGENCY_OPEN:-2}" ] && ok "17. emergencyOpen=$eo >= fixture $N_EMERGENCY_OPEN" || no "17. emergencyOpen=$eo < $N_EMERGENCY_OPEN"
[ "$st" -ge "${N_STALE:-2}" ] && ok "17. stale=$st >= fixture $N_STALE" || no "17. stale=$st < $N_STALE"

echo "  → RACE & LOCK (optimistic-lock theo updatedAt — PASS/FAIL theo BẤT BIẾN audit, không phụ thuộc timing)"

# 19) Hai PATCH false→true ĐỒNG THỜI trên CASE_RACE: winner commit, loser 409. BẤT BIẾN: case có ĐÚNG 1
#     EMERGENCY_FLAG audit (winner ghi 1; loser 409 ghi 0). Interleaving ép tất định bằng hook delay
#     (server khởi động với P5_TEST_HOOKS=1). Reuse server không hook → vẫn đúng bất biến (soft note).
cp "$JAR_STAFF1" "$JAR_RACE_A"; cp "$JAR_ADMIN" "$JAR_RACE_B"
counts_of "$CASE_RACE"; race_au_b="$AUDIT_EMERG"
RF_A="$(mktemp)"
curl -s -w $'\n%{http_code}' --max-time 30 -X PATCH -H "Content-Type: application/json" \
  -H "x-p5-test-delay-ms: 800" -c "$JAR_RACE_A" -b "$JAR_RACE_A" \
  -d '{"isEmergency":true}' "$BASE_URL/api/cases/$CASE_RACE/emergency" > "$RF_A" 2>/dev/null & apid=$!
sleep 0.3   # A kịp đọc cur & vào vùng delay TRƯỚC khi B commit
r=$(api "$JAR_RACE_B" PATCH "/api/cases/$CASE_RACE/emergency" '{"isEmergency":true}'); rb_s=$(_split_status "$r"); trk "$(_split_body "$r")"
wait "$apid" 2>/dev/null
ra_s="$(_split_status "$(cat "$RF_A")")"; trk "$(_split_body "$(cat "$RF_A")")"; rm -f "$RF_A"
counts_of "$CASE_RACE"; race_au_a="$AUDIT_EMERG"
[ "$((race_au_a - race_au_b))" -eq 1 ] && ok "19. đua false→true: ĐÚNG 1 EMERGENCY_FLAG audit (không lost-update)" || no "19. đua: $((race_au_a - race_au_b)) audit ⇒ optimistic-lock THỦNG"
if [ "$rb_s" = "200" ] && [ "$ra_s" = "409" ]; then
  ok "19. interleaving: B=200 (commit trước), A=409 (hook thực thi lock)"
else
  echo "    ~ 19. interleaving khác kỳ vọng (A=$ra_s B=$rb_s) — server tái dùng không bật hook? Bất biến audit ở trên vẫn quyết định."
fi

# 20) Leak-check CUỐI: passwordHash trên MỌI response; PII chỉ trên response endpoint P7
if grep -qi "passwordHash\|password_hash" "$ALLBODIES"; then no "20. rò passwordHash"; else ok "20. không rò passwordHash"; fi
if grep -Eq '"(sbd|dob|email|admissionYear)":' "$P7BODIES"; then no "20. rò PII trong response P7"; else ok "20. response P7 không rò PII"; fi

# ─────────────────────────── Tổng kết ───────────────────────────
echo ""
echo "  P7: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
