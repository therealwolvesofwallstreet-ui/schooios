#!/usr/bin/env bash
# scripts/test-p6.sh — kiểm thử Comments + Notifications (P6) end-to-end qua HTTP.
# Tự quản vòng đời server (dev mode: secure cookie off → round-trip cookie qua http localhost).
# Fixture ephemeral (web/prisma/p6-fixture.ts) tạo user + 3 case + seed notification, in KEY=VALUE.
# Phủ: quyền xem=bình luận (404 chống dò), comment nội bộ (403 STUDENT / ẩn với STUDENT / vẫn notify
#   STAFF), notify createdBy+assignedTo trừ commenter, loại STUDENT khỏi notify nội bộ (DELTA), GET
#   notifications của tôi + unreadOnly, read-all (readAt set), 401, PII/passwordHash leak.
#
# LỆCH PROMPT (có chủ ý, ghi rõ): test 10 dùng ADMIN (không phải STAFF2) làm người bình luận nội bộ.
#   Lý do: C_OWN là IN_PROGRESS assigned cho staff1; theo Public/Transparent, STAFF2 (không phải
#   assignee) KHÔNG thấy case này → POST sẽ 404, không thể 201. ADMIN thấy mọi case nên là người
#   bình luận-không-phải-assignee HỢP LỆ duy nhất; vẫn chứng minh đúng ý test: nội bộ → creator
#   (STUDENT) bị loại khỏi notify, assignee (staff1, ≠commenter) vẫn nhận.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
ALLBODIES="$(mktemp)"   # MỌI response (gồm login) → quét passwordHash
P6BODIES="$(mktemp)"    # CHỈ response endpoint P6 (comments/notifications) → quét PII (login echo
                        #   email/sbd của CHÍNH chủ là hợp lệ, không tính rò rỉ — giống test-p5 CASEBODIES)
SERVER_PID=""
SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STAFF1="$(mktemp)"; JAR_STAFF2="$(mktemp)"; JAR_AUD="$(mktemp)"
JAR_STU1="$(mktemp)"; JAR_STU2="$(mktemp)"; JAR_EMPTY="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p6-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$ALLBODIES" "$P6BODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF1" "$JAR_STAFF2" "$JAR_AUD" \
        "$JAR_STU1" "$JAR_STU2" "$JAR_EMPTY"
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
track() { printf '%s\n' "$1" >> "$ALLBODIES"; }                                      # login → chỉ ALLBODIES
trk()   { printf '%s\n' "$1" >> "$ALLBODIES"; printf '%s\n' "$1" >> "$P6BODIES"; }   # endpoint P6 → cả hai
has()   { echo "$1" | grep -q "$2"; }
jnum()  { echo "$1" | grep -o "\"$2\":[0-9]*" | head -1 | cut -d: -f2; }
# Đếm side-effect (qua fixture --counts) → set NOTIF/AUDIT. NOTIF: recipient userId HOẶC caseId.
counts_of() {
  local out; out="$( cd "$WEB" && npx --no-install tsx prisma/p6-fixture.ts --counts "$1" 2>/dev/null )"
  NOTIF="$(echo "$out" | grep '^NOTIF=' | cut -d= -f2)"; AUDIT="$(echo "$out" | grep '^AUDIT=' | cut -d= -f2)"
  NOTIF="${NOTIF:-0}"; AUDIT="${AUDIT:-0}"
}

# ─────────────────────────── 1. Fixture ───────────────────────────
echo "  → setup fixture"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p6-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
ADMIN="$(getv P6FX_ADMIN)"; STAFF1="$(getv P6FX_STAFF1)"; STAFF2="$(getv P6FX_STAFF2)"
AUDITOR="$(getv P6FX_AUDITOR)"; STUDENT1="$(getv P6FX_STUDENT1)"; STUDENT2="$(getv P6FX_STUDENT2)"
C_OWN="$(getv P6FX_C_OWN)"; C_PUBLIC="$(getv P6FX_C_PUBLIC)"; C_SENS="$(getv P6FX_C_SENS)"
if [ -z "$STAFF1" ] || [ -z "$STUDENT1" ] || [ -z "$C_OWN" ] || [ -z "$C_PUBLIC" ] || [ -z "$C_SENS" ]; then
  echo "    ✗ fixture thiếu dữ liệu. Output:"; echo "$FIXTURE_OUT"; exit 1
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
login() { local jar="$1" id="$2"; local r; r=$(api "$jar" POST /api/auth/login "{\"identifier\":\"$id\",\"password\":\"$PW\"}"); track "$(_split_body "$r")"; [ "$(_split_status "$r")" = "200" ]; }
login "$JAR_ADMIN"  "p6-admin@test.local"   || { echo "    ✗ login admin fail";   exit 1; }
login "$JAR_STAFF1" "p6-staff1@test.local"  || { echo "    ✗ login staff1 fail";  exit 1; }
login "$JAR_STAFF2" "p6-staff2@test.local"  || { echo "    ✗ login staff2 fail";  exit 1; }
login "$JAR_AUD"    "p6-auditor@test.local" || { echo "    ✗ login auditor fail"; exit 1; }
login "$JAR_STU1"   "P6-0001"               || { echo "    ✗ login student1 fail";exit 1; }
login "$JAR_STU2"   "P6-0002"               || { echo "    ✗ login student2 fail";exit 1; }

echo "  → COMMENTS"

# 1) STUDENT1 POST isInternal=true lên C_OWN → 403 (STUDENT không được tạo comment nội bộ)
r=$(api "$JAR_STU1" POST "/api/cases/$C_OWN/comments" "{\"body\":\"hs thu noi bo\",\"isInternal\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "1. STUDENT1 POST nội bộ" 403 "$s"

# 2) STAFF1 POST nội bộ lên C_OWN → 201; response KÈM author {id,name,role} (parity với GET)
r=$(api "$JAR_STAFF1" POST "/api/cases/$C_OWN/comments" "{\"body\":\"INTERNAL_FROM_STAFF1\",\"isInternal\":true}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "2. STAFF1 POST nội bộ" 201 "$s"
{ has "$b" '"author":' && has "$b" '"role":"STAFF"'; } && ok "2b. POST trả kèm author (parity GET)" || no "2b. POST thiếu author"

# 3) STUDENT1: post 1 comment công khai (own case) rồi GET → THẤY công khai, KHÔNG thấy nội bộ (case 2)
r=$(api "$JAR_STU1" POST "/api/cases/$C_OWN/comments" "{\"body\":\"PUBLIC_FROM_STUDENT1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "3a. STUDENT1 POST công khai (own case)" 201 "$s"
r=$(api "$JAR_STU1" GET "/api/cases/$C_OWN/comments"); b=$(_split_body "$r"); trk "$b"
has "$b" "PUBLIC_FROM_STUDENT1" && ok "3b. STUDENT1 thấy comment công khai" || no "3b. STUDENT1 KHÔNG thấy comment công khai"
has "$b" "INTERNAL_FROM_STAFF1" && no "3c. STUDENT1 LỌT comment nội bộ (rò rỉ!)" || ok "3c. STUDENT1 KHÔNG thấy comment nội bộ"

# 4) ADMIN GET comments C_OWN → THẤY nội bộ
r=$(api "$JAR_ADMIN" GET "/api/cases/$C_OWN/comments"); b=$(_split_body "$r"); trk "$b"
has "$b" "INTERNAL_FROM_STAFF1" && ok "4. ADMIN thấy comment nội bộ" || no "4. ADMIN KHÔNG thấy comment nội bộ"
# 4b) STAFF1 (assignee, non-student) GET C_OWN → 200 và CŨNG thấy nội bộ
r=$(api "$JAR_STAFF1" GET "/api/cases/$C_OWN/comments"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "4b. STAFF1 GET comments" 200 "$s"
has "$b" "INTERNAL_FROM_STAFF1" && ok "4b. STAFF1 (assignee) thấy nội bộ" || no "4b. STAFF1 KHÔNG thấy nội bộ"

# 5) AUDITOR POST comment → 403 (read-only)
r=$(api "$JAR_AUD" POST "/api/cases/$C_OWN/comments" "{\"body\":\"auditor thu\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "5. AUDITOR POST comment" 403 "$s"
# 5b) AUDITOR GET comments → 200 (read-only ĐƯỢC đọc; non-student nên thấy cả nội bộ)
r=$(api "$JAR_AUD" GET "/api/cases/$C_OWN/comments"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "5b. AUDITOR GET comments" 200 "$s"
has "$b" "INTERNAL_FROM_STAFF1" && ok "5b. AUDITOR thấy nội bộ (read-only)" || no "5b. AUDITOR KHÔNG thấy nội bộ"

# 6) STUDENT1 POST công khai lên C_PUBLIC (không phải của mình nhưng thấy được) → 201
r=$(api "$JAR_STU1" POST "/api/cases/$C_PUBLIC/comments" "{\"body\":\"hs binh luan public\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "6. STUDENT1 POST lên C_PUBLIC (thấy được)" 201 "$s"

# 7) STUDENT1 POST lên C_SENS (KHÔNG thấy) → 404 (đồng nhất chống dò)
r=$(api "$JAR_STU1" POST "/api/cases/$C_SENS/comments" "{\"body\":\"hs thu case nhay cam\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "7. STUDENT1 POST lên C_SENS (không thấy)" 404 "$s"
# 7b) ADMIN POST lên case KHÔNG TỒN TẠI → 404 (anti-enumeration: 404 đồng nhất, không lộ tồn tại hay không)
r=$(api "$JAR_ADMIN" POST "/api/cases/khong-ton-tai-xyz/comments" "{\"body\":\"case ma\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "7b. ADMIN POST case không tồn tại" 404 "$s"

# 8) POST body rỗng → 400 (zod min(1) sau trim)
r=$(api "$JAR_ADMIN" POST "/api/cases/$C_OWN/comments" "{\"body\":\"\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "8. POST body rỗng" 400 "$s"

echo "  → NOTIFICATIONS từ comment (DELTA trước/sau)"

# 9) STAFF1 POST công khai lên C_OWN → student1(createdBy) +1; staff1(commenter) KHÔNG đổi
counts_of "$STUDENT1"; s1b="$NOTIF"; counts_of "$STAFF1"; t1b="$NOTIF"
r=$(api "$JAR_STAFF1" POST "/api/cases/$C_OWN/comments" "{\"body\":\"public 9 tu staff1\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "9. STAFF1 POST công khai lên C_OWN" 201 "$s"
counts_of "$STUDENT1"; s1a="$NOTIF"; counts_of "$STAFF1"; t1a="$NOTIF"
[ "$((s1a - s1b))" -eq 1 ] && ok "9. student1(createdBy) notif +1 ($s1b→$s1a)" || no "9. student1 notif delta != 1 ($s1b→$s1a)"
[ "$((t1a - t1b))" -eq 0 ] && ok "9. staff1(commenter) notif KHÔNG đổi ($t1b→$t1a)" || no "9. staff1(commenter) notif bị đổi ($t1b→$t1a)"

# 10) ADMIN POST NỘI BỘ lên C_OWN → student1(STUDENT createdBy) +0 (loại nội bộ); staff1(assignee,≠commenter) +1
#     (LỆCH PROMPT có chủ ý: ADMIN thay STAFF2 — xem ghi chú đầu file.)
counts_of "$STUDENT1"; s1b="$NOTIF"; counts_of "$STAFF1"; t1b="$NOTIF"
r=$(api "$JAR_ADMIN" POST "/api/cases/$C_OWN/comments" "{\"body\":\"INT10 noi bo tu admin\",\"isInternal\":true}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "10. ADMIN POST nội bộ lên C_OWN" 201 "$s"
counts_of "$STUDENT1"; s1a="$NOTIF"; counts_of "$STAFF1"; t1a="$NOTIF"
[ "$((s1a - s1b))" -eq 0 ] && ok "10. student1(STUDENT createdBy) KHÔNG nhận notif nội bộ ($s1b→$s1a)" || no "10. student1 nhận notif nội bộ (RÒ RỈ! $s1b→$s1a)"
[ "$((t1a - t1b))" -eq 1 ] && ok "10. staff1(assignee,≠commenter) notif +1 ($t1b→$t1a)" || no "10. staff1 notif delta != 1 ($t1b→$t1a)"

echo "  → NOTIFICATIONS API"

# 11) GET /api/notifications (student1) → 200, có notifications/unreadCount/total; KHÔNG lọt của user khác
r=$(api "$JAR_STU1" GET "/api/notifications"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "11. GET /api/notifications (student1)" 200 "$s"
{ has "$b" '"notifications":' && has "$b" '"unreadCount":' && has "$b" '"total":'; } && ok "11. có notifications/unreadCount/total" || no "11. thiếu trường bao bọc"
{ has "$b" "$STAFF1" || has "$b" "$STAFF2" || has "$b" "$ADMIN" || has "$b" "$STUDENT2"; } && no "11. LỌT id user khác trong feed student1" || ok "11. feed chỉ của student1 (không lọt user khác)"

# 12) GET ?unreadOnly=true → chỉ chưa đọc (không có "isRead":true)
r=$(api "$JAR_STU1" GET "/api/notifications?unreadOnly=true"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "12. GET ?unreadOnly=true" 200 "$s"
has "$b" '"isRead":true' && no "12. unreadOnly lọt notification đã đọc" || ok "12. unreadOnly chỉ trả chưa đọc"

# 13) PATCH read-all (student1) → 200 updated>0; GET lại → unreadCount=0 VÀ không còn "readAt":null
r=$(api "$JAR_STU1" PATCH "/api/notifications/read-all"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "13. PATCH read-all" 200 "$s"
upd="$(jnum "$b" updated)"; upd="${upd:-0}"
[ "$upd" -ge 1 ] && ok "13. read-all updated=$upd (>0)" || no "13. read-all updated=$upd (mong >0)"
r=$(api "$JAR_STU1" GET "/api/notifications"); b=$(_split_body "$r"); trk "$b"
uc="$(jnum "$b" unreadCount)"; uc="${uc:-x}"
[ "$uc" = "0" ] && ok "13. sau read-all unreadCount=0" || no "13. unreadCount=$uc (mong 0)"
has "$b" '"readAt":null' && no "13. còn readAt=null sau read-all (chỉ đổi count, chưa đổi state)" || ok "13. mọi notification đã có readAt (state đổi thật)"

# 14) GET /api/notifications không cookie → 401
r=$(api "$JAR_EMPTY" GET "/api/notifications"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "14. GET /api/notifications không cookie" 401 "$s"

# 15) Leak-check CUỐI: passwordHash trên MỌI response (gồm login); PII chỉ trên response endpoint P6
#     (login echo email/sbd của chính chủ là hợp lệ — giống test-p5 tách CASEBODIES).
if grep -qi "passwordHash\|password_hash" "$ALLBODIES"; then no "15. rò passwordHash trong response"; else ok "15. không rò passwordHash"; fi
if grep -Eq '"(sbd|dob|email|admissionYear)":' "$P6BODIES"; then no "15. rò PII (sbd/dob/email/admissionYear) trong response P6"; else ok "15. response P6 không rò PII"; fi

# ─────────────────────────── Tổng kết ───────────────────────────
echo ""
echo "  P6: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
