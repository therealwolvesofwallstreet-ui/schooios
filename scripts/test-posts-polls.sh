#!/usr/bin/env bash
# scripts/test-posts-polls.sh — Update B (Feed Broadcast: Posts/Polls) end-to-end qua HTTP.
# Tự quản vòng đời server (dev mode: secure cookie off → round-trip cookie qua http localhost).
# Fixture ephemeral (web/prisma/posts-polls-fixture.ts): 4 user (admin/staff/auditor/student), in KEY=VALUE.
# Phủ §5/§6.2: create ADMIN-only (non-admin 403) · read mọi role · upvote toggle + count + idempotent ·
#   AUDITOR upvote/vote 403 · poll vote + đổi option (1 phiếu/user) + percent + chia-0 + optionId lạ 400 +
#   poll đóng 400 · delete ADMIN→ẩn / non-admin 403 · audit ghi · 0-PII (author) · pagination tiebreaker ·
#   KHÔNG endpoint comment cho post/poll.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
ALLBODIES="$(mktemp)"   # MỌI response (gồm login) → quét passwordHash
PBBODIES="$(mktemp)"    # CHỈ response endpoint Update B → quét PII (login echo email/sbd chính chủ là hợp lệ)
SERVER_PID=""
SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STAFF="$(mktemp)"; JAR_AUD="$(mktemp)"; JAR_STU="$(mktemp)"; JAR_EMPTY="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }
expect_eq() { if [ "$2" = "$3" ]; then ok "$1 (=$3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/posts-polls-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$ALLBODIES" "$PBBODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF" "$JAR_AUD" "$JAR_STU" "$JAR_EMPTY"
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
trk()   { printf '%s\n' "$1" >> "$ALLBODIES"; printf '%s\n' "$1" >> "$PBBODIES"; }
has()   { echo "$1" | grep -q "$2"; }
# JSON extractor: `echo "$body" | jx 'o.post.id'` — o = parsed body. Robust cho nested (options[i].id).
jx() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let o;try{o=JSON.parse(s)}catch{};let r;try{r=eval(process.argv[1])}catch(e){};console.log(r==null?"":(typeof r==="object"?JSON.stringify(r):r))})' "$1"; }

# ─────────────────────────── 1. Fixture ───────────────────────────
echo "  → setup fixture"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/posts-polls-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
ADMIN="$(getv PBFX_ADMIN)"; STAFF="$(getv PBFX_STAFF)"; AUDITOR="$(getv PBFX_AUDITOR)"; STUDENT="$(getv PBFX_STUDENT)"
if [ -z "$ADMIN" ] || [ -z "$STAFF" ] || [ -z "$AUDITOR" ] || [ -z "$STUDENT" ]; then
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
login "$JAR_ADMIN" "pb-admin@test.local"   || { echo "    ✗ login admin fail";   exit 1; }
login "$JAR_STAFF" "pb-staff@test.local"   || { echo "    ✗ login staff fail";   exit 1; }
login "$JAR_AUD"   "pb-auditor@test.local" || { echo "    ✗ login auditor fail"; exit 1; }
login "$JAR_STU"   "PB-0001"               || { echo "    ✗ login student fail"; exit 1; }

# ═════════════════════════════ POSTS ═════════════════════════════
echo "  → POSTS"

# 1) ADMIN tạo post → 201 + shape (author{id,name,role}, upvoteCount:0, myUpvoted:false)
r=$(api "$JAR_ADMIN" POST /api/posts '{"body":"THONG BAO TEST tu BGH"}'); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "1. ADMIN tạo post" 201 "$s"
POST_ID="$(echo "$b" | jx 'o.post.id')"
[ -n "$POST_ID" ] && ok "1b. có post.id ($POST_ID)" || no "1b. thiếu post.id"
expect_eq "1c. upvoteCount khởi tạo" "0" "$(echo "$b" | jx 'o.post.upvoteCount')"
expect_eq "1d. myUpvoted khởi tạo" "false" "$(echo "$b" | jx 'o.post.myUpvoted')"
{ has "$b" '"author"' && has "$b" '"role":"ADMIN"'; } && ok "1e. post kèm author{role}" || no "1e. post thiếu author"

# 2-4) non-ADMIN tạo post → 403
for J in "STAFF:$JAR_STAFF" "STUDENT:$JAR_STU" "AUDITOR:$JAR_AUD"; do
  role="${J%%:*}"; jar="${J#*:}"
  r=$(api "$jar" POST /api/posts '{"body":"khong duoc tao"}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
  expect_status "2. $role tạo post" 403 "$s"
done

# 5) ADMIN body rỗng → 400
r=$(api "$JAR_ADMIN" POST /api/posts '{"body":""}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "5. ADMIN post body rỗng" 400 "$s"

# 6) Đọc post: mọi role 200 + thấy POST_ID
for J in "ADMIN:$JAR_ADMIN" "STAFF:$JAR_STAFF" "STUDENT:$JAR_STU" "AUDITOR:$JAR_AUD"; do
  role="${J%%:*}"; jar="${J#*:}"
  r=$(api "$jar" GET /api/posts); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
  expect_status "6. $role GET /api/posts" 200 "$s"
  has "$b" "$POST_ID" && ok "6. $role thấy POST_ID" || no "6. $role KHÔNG thấy POST_ID"
done

# 7) Anon GET → 401
r=$(api "$JAR_EMPTY" GET /api/posts); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "7. Anon GET /api/posts" 401 "$s"

# 8) STUDENT upvote → 200 count=1 myUpvoted=true
r=$(api "$JAR_STU" POST "/api/posts/$POST_ID/upvote"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "8. STUDENT upvote" 200 "$s"
expect_eq "8b. upvoteCount=1" "1" "$(echo "$b" | jx 'o.upvoteCount')"
expect_eq "8c. myUpvoted=true" "true" "$(echo "$b" | jx 'o.myUpvoted')"

# 9) STUDENT upvote LẦN NỮA (idempotent) → count vẫn 1 (KHÔNG phình)
r=$(api "$JAR_STU" POST "/api/posts/$POST_ID/upvote"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "9. STUDENT upvote lại (idempotent)" 200 "$s"
expect_eq "9b. upvoteCount vẫn 1 (unique chặn spam)" "1" "$(echo "$b" | jx 'o.upvoteCount')"

# 10) STAFF upvote → count=2
r=$(api "$JAR_STAFF" POST "/api/posts/$POST_ID/upvote"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "10. STAFF upvote" 200 "$s"
expect_eq "10b. upvoteCount=2" "2" "$(echo "$b" | jx 'o.upvoteCount')"

# 11) AUDITOR upvote → 403
r=$(api "$JAR_AUD" POST "/api/posts/$POST_ID/upvote"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "11. AUDITOR upvote" 403 "$s"

# 12) GET posts STUDENT → myUpvoted=true cho POST_ID, count=2
r=$(api "$JAR_STU" GET /api/posts); b=$(_split_body "$r"); trk "$b"
expect_eq "12. GET myUpvoted=true" "true" "$(echo "$b" | jx 'o.posts.find(p=>p.id==="'"$POST_ID"'").myUpvoted')"
expect_eq "12b. GET upvoteCount=2" "2" "$(echo "$b" | jx 'o.posts.find(p=>p.id==="'"$POST_ID"'").upvoteCount')"

# 13) STUDENT bỏ thích → 200 count=1 myUpvoted=false
r=$(api "$JAR_STU" DELETE "/api/posts/$POST_ID/upvote"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "13. STUDENT bỏ thích" 200 "$s"
expect_eq "13b. upvoteCount=1" "1" "$(echo "$b" | jx 'o.upvoteCount')"
expect_eq "13c. myUpvoted=false" "false" "$(echo "$b" | jx 'o.myUpvoted')"

# 14) STUDENT bỏ thích LẦN NỮA (chưa thích → no-op) → 200 count=1
r=$(api "$JAR_STU" DELETE "/api/posts/$POST_ID/upvote"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "14. STUDENT bỏ thích lại (no-op)" 200 "$s"
expect_eq "14b. upvoteCount vẫn 1" "1" "$(echo "$b" | jx 'o.upvoteCount')"

# 15) upvote post không tồn tại → 404
r=$(api "$JAR_STU" POST "/api/posts/khong-ton-tai-xyz/upvote"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "15. upvote post không tồn tại" 404 "$s"

# 16) AUDIT cho POST_ID > 0 (Post CREATE + PostVote CREATE/DELETE đều entityId=postId)
AUDIT="$( cd "$WEB" && npx --no-install tsx prisma/posts-polls-fixture.ts --counts "$POST_ID" 2>/dev/null | grep '^AUDIT=' | cut -d= -f2 )"
[ "${AUDIT:-0}" -ge 1 ] && ok "16. audit post ghi (AUDIT=$AUDIT)" || no "16. audit post KHÔNG ghi (AUDIT=${AUDIT:-0})"

# 17) non-ADMIN xoá post → 403 (test trên post còn sống)
r=$(api "$JAR_STAFF" DELETE "/api/posts/$POST_ID"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "17. STAFF xoá post" 403 "$s"

# 18) ADMIN xoá post → 200 + biến mất khỏi GET
r=$(api "$JAR_ADMIN" DELETE "/api/posts/$POST_ID"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "18. ADMIN xoá post" 200 "$s"
expect_eq "18b. deleted=true" "true" "$(echo "$b" | jx 'o.deleted')"
r=$(api "$JAR_ADMIN" GET /api/posts); b=$(_split_body "$r"); trk "$b"
has "$b" "$POST_ID" && no "18c. post đã xoá VẪN hiện (rò soft-delete)" || ok "18c. post đã xoá biến mất khỏi GET"

# 19) upvote post đã xoá → 404
r=$(api "$JAR_STU" POST "/api/posts/$POST_ID/upvote"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "19. upvote post đã xoá" 404 "$s"

# 20) KHÔNG có endpoint comment cho post → 404
r=$(api "$JAR_ADMIN" POST "/api/posts/$POST_ID/comments" '{"body":"comment lau"}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
{ [ "$s" = "404" ] || [ "$s" = "405" ]; } && ok "20. KHÔNG có comment endpoint cho post (status $s)" || no "20. comment endpoint post LỌT (status $s)"

# ═════════════════════════════ POLLS ═════════════════════════════
echo "  → POLLS"

# 21) ADMIN tạo poll 3 option → 201 + shape (options count/percent=0, totalVotes=0, myOptionId=null, isClosed=false)
r=$(api "$JAR_ADMIN" POST /api/polls '{"question":"Cau hoi test?","options":["Phuong an A","Phuong an B","Phuong an C"]}'); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "21. ADMIN tạo poll" 201 "$s"
POLL_ID="$(echo "$b" | jx 'o.poll.id')"
OPT_A="$(echo "$b" | jx 'o.poll.options[0].id')"
OPT_B="$(echo "$b" | jx 'o.poll.options[1].id')"
[ -n "$POLL_ID" ] && [ -n "$OPT_A" ] && [ -n "$OPT_B" ] && ok "21b. có poll.id + option ids" || no "21b. thiếu poll/option ids"
expect_eq "21c. totalVotes khởi tạo" "0" "$(echo "$b" | jx 'o.poll.totalVotes')"
expect_eq "21d. percent chia-0 an toàn = 0" "0" "$(echo "$b" | jx 'o.poll.options[0].percent')"
expect_eq "21e. myOptionId=null khởi tạo" "" "$(echo "$b" | jx 'o.poll.myOptionId')"
expect_eq "21f. isClosed=false" "false" "$(echo "$b" | jx 'o.poll.isClosed')"

# 22) non-ADMIN tạo poll → 403
for J in "STAFF:$JAR_STAFF" "STUDENT:$JAR_STU" "AUDITOR:$JAR_AUD"; do
  role="${J%%:*}"; jar="${J#*:}"
  r=$(api "$jar" POST /api/polls '{"question":"q","options":["a","b"]}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
  expect_status "22. $role tạo poll" 403 "$s"
done

# 23) options ngoài 2–8 → 400
r=$(api "$JAR_ADMIN" POST /api/polls '{"question":"q","options":["chi mot"]}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "23a. poll 1 option" 400 "$s"
r=$(api "$JAR_ADMIN" POST /api/polls '{"question":"q","options":["1","2","3","4","5","6","7","8","9"]}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "23b. poll 9 options" 400 "$s"

# 24) Đọc poll: mọi role 200 + thấy POLL_ID
for J in "ADMIN:$JAR_ADMIN" "STAFF:$JAR_STAFF" "STUDENT:$JAR_STU" "AUDITOR:$JAR_AUD"; do
  role="${J%%:*}"; jar="${J#*:}"
  r=$(api "$jar" GET /api/polls); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
  expect_status "24. $role GET /api/polls" 200 "$s"
  has "$b" "$POLL_ID" && ok "24. $role thấy POLL_ID" || no "24. $role KHÔNG thấy POLL_ID"
done
# Anon poll → 401
r=$(api "$JAR_EMPTY" GET /api/polls); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "24z. Anon GET /api/polls" 401 "$s"

# 25) STUDENT vote OPT_A → 200, A count=1 percent=100, total=1, myOptionId=A
r=$(api "$JAR_STU" POST "/api/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT_A\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "25. STUDENT vote A" 200 "$s"
expect_eq "25b. totalVotes=1" "1" "$(echo "$b" | jx 'o.poll.totalVotes')"
expect_eq "25c. A count=1" "1" "$(echo "$b" | jx 'o.poll.options.find(x=>x.id==="'"$OPT_A"'").count')"
expect_eq "25d. A percent=100" "100" "$(echo "$b" | jx 'o.poll.options.find(x=>x.id==="'"$OPT_A"'").percent')"
expect_eq "25e. myOptionId=A" "$OPT_A" "$(echo "$b" | jx 'o.poll.myOptionId')"

# 26) STAFF vote OPT_B → total=2, A=50%, B=50%
r=$(api "$JAR_STAFF" POST "/api/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT_B\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "26. STAFF vote B" 200 "$s"
expect_eq "26b. totalVotes=2" "2" "$(echo "$b" | jx 'o.poll.totalVotes')"
expect_eq "26c. A percent=50" "50" "$(echo "$b" | jx 'o.poll.options.find(x=>x.id==="'"$OPT_A"'").percent')"
expect_eq "26d. B percent=50" "50" "$(echo "$b" | jx 'o.poll.options.find(x=>x.id==="'"$OPT_B"'").percent')"

# 27) STUDENT ĐỔI vote A→B → total VẪN 2 (1 phiếu/user, đổi KHÔNG cộng), A=0%, B=100%, myOptionId=B
r=$(api "$JAR_STU" POST "/api/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT_B\"}"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "27. STUDENT đổi vote A→B" 200 "$s"
expect_eq "27b. totalVotes VẪN 2 (đổi không cộng dồn)" "2" "$(echo "$b" | jx 'o.poll.totalVotes')"
expect_eq "27c. A count=0 sau đổi" "0" "$(echo "$b" | jx 'o.poll.options.find(x=>x.id==="'"$OPT_A"'").count')"
expect_eq "27d. B count=2 sau đổi" "2" "$(echo "$b" | jx 'o.poll.options.find(x=>x.id==="'"$OPT_B"'").count')"
expect_eq "27e. myOptionId=B" "$OPT_B" "$(echo "$b" | jx 'o.poll.myOptionId')"

# 28) AUDITOR vote → 403
r=$(api "$JAR_AUD" POST "/api/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT_A\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "28. AUDITOR vote" 403 "$s"

# 29) optionId rác (không thuộc poll) → 400
r=$(api "$JAR_STU" POST "/api/polls/$POLL_ID/vote" '{"optionId":"opt-khong-ton-tai"}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "29. optionId rác" 400 "$s"

# 30) optionId của POLL KHÁC → 400 (tạo poll2, dùng option của poll2 trên POLL_ID)
r=$(api "$JAR_ADMIN" POST /api/polls '{"question":"poll 2?","options":["x","y"]}'); b2=$(_split_body "$r"); trk "$b2"
POLL2_ID="$(echo "$b2" | jx 'o.poll.id')"; OPT2_X="$(echo "$b2" | jx 'o.poll.options[0].id')"
r=$(api "$JAR_STU" POST "/api/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT2_X\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "30. optionId của poll KHÁC" 400 "$s"

# 31) poll đã ĐÓNG → vote 400 (tạo poll closesAt quá khứ)
r=$(api "$JAR_ADMIN" POST /api/polls '{"question":"poll dong?","options":["a","b"],"closesAt":"2020-01-01T00:00:00.000Z"}'); bc=$(_split_body "$r"); s=$(_split_status "$r"); trk "$bc"
expect_status "31a. tạo poll closesAt quá khứ" 201 "$s"
CLOSED_ID="$(echo "$bc" | jx 'o.poll.id')"; CLOSED_OPT="$(echo "$bc" | jx 'o.poll.options[0].id')"
expect_eq "31b. isClosed=true ngay" "true" "$(echo "$bc" | jx 'o.poll.isClosed')"
r=$(api "$JAR_STU" POST "/api/polls/$CLOSED_ID/vote" "{\"optionId\":\"$CLOSED_OPT\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "31c. vote poll đã đóng" 400 "$s"

# 32) vote poll không tồn tại → 404
r=$(api "$JAR_STU" POST "/api/polls/khong-ton-tai/vote" '{"optionId":"x"}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "32. vote poll không tồn tại" 404 "$s"

# 33) AUDIT cho POLL_ID > 0
AUDIT="$( cd "$WEB" && npx --no-install tsx prisma/posts-polls-fixture.ts --counts "$POLL_ID" 2>/dev/null | grep '^AUDIT=' | cut -d= -f2 )"
[ "${AUDIT:-0}" -ge 1 ] && ok "33. audit poll ghi (AUDIT=$AUDIT)" || no "33. audit poll KHÔNG ghi (AUDIT=${AUDIT:-0})"

# 34) non-ADMIN xoá poll → 403
r=$(api "$JAR_STAFF" DELETE "/api/polls/$POLL_ID"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "34. STAFF xoá poll" 403 "$s"

# 35) ADMIN xoá poll → 200 + biến mất + vote sau đó 404
r=$(api "$JAR_ADMIN" DELETE "/api/polls/$POLL_ID"); s=$(_split_status "$r"); b=$(_split_body "$r"); trk "$b"
expect_status "35. ADMIN xoá poll" 200 "$s"
r=$(api "$JAR_ADMIN" GET /api/polls); b=$(_split_body "$r"); trk "$b"
has "$b" "$POLL_ID" && no "35b. poll đã xoá VẪN hiện" || ok "35b. poll đã xoá biến mất khỏi GET"
r=$(api "$JAR_STU" POST "/api/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT_B\"}"); s=$(_split_status "$r"); trk "$(_split_body "$r")"
expect_status "35c. vote poll đã xoá" 404 "$s"

# 36) KHÔNG có endpoint comment cho poll → 404
r=$(api "$JAR_ADMIN" POST "/api/polls/$POLL2_ID/comments" '{"body":"x"}'); s=$(_split_status "$r"); trk "$(_split_body "$r")"
{ [ "$s" = "404" ] || [ "$s" = "405" ]; } && ok "36. KHÔNG có comment endpoint cho poll (status $s)" || no "36. comment endpoint poll LỌT (status $s)"

# ═════════════════════════════ PAGINATION + LEAK ═════════════════════════════
echo "  → PAGINATION + LEAK"

# 37) Pagination tiebreaker: tạo 2 post → page1/page2 limit=1 ids khác nhau
api "$JAR_ADMIN" POST /api/posts '{"body":"pag post 1"}' >/dev/null
api "$JAR_ADMIN" POST /api/posts '{"body":"pag post 2"}' >/dev/null
b1=$(_split_body "$(api "$JAR_ADMIN" GET '/api/posts?page=1&limit=1')")
b2=$(_split_body "$(api "$JAR_ADMIN" GET '/api/posts?page=2&limit=1')")
id1="$(echo "$b1" | jx 'o.posts[0].id')"; id2="$(echo "$b2" | jx 'o.posts[0].id')"
{ [ -n "$id1" ] && [ "$id1" != "$id2" ]; } && ok "37. pagination tiebreaker (page1≠page2)" || no "37. pagination tiebreaker fail ($id1 vs $id2)"

# 38) ?limit=0 / ?limit=101 → 400
expect_status "38a. posts ?limit=0" 400 "$(_split_status "$(api "$JAR_ADMIN" GET '/api/posts?limit=0')")"
expect_status "38b. polls ?limit=101" 400 "$(_split_status "$(api "$JAR_ADMIN" GET '/api/polls?limit=101')")"

# 39) LEAK: passwordHash trên MỌI response; PII (sbd/dob/email/admissionYear) trên response endpoint B
if grep -qi "passwordHash\|password_hash" "$ALLBODIES"; then no "39a. rò passwordHash"; else ok "39a. không rò passwordHash"; fi
if grep -Eq '"(sbd|dob|email|admissionYear)":' "$PBBODIES"; then no "39b. rò PII (author phải chỉ {id,name,role})"; else ok "39b. response B không rò PII"; fi

# ─────────────────────────── Tổng kết ───────────────────────────
echo ""
echo "  Update B (posts-polls): PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
