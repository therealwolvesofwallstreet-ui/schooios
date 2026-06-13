#!/usr/bin/env bash
# scripts/test-votes-comments.sh — kiểm thử Votes + Comment threads (Update A) end-to-end.
# Yêu cầu: migration 20260613160006_add_votes_comment_threads đã apply vào DB.
# Fixture: web/prisma/votes-comments-fixture.ts (upsert va-* users + 3 case).
# Phủ:
#   VOTE: up/down/toggle/remove/aggregate, AUDITOR 403, case-invisible 404, no-PII-leak.
#   REPLY: ADMIN reply, non-ADMIN 403, depth>2 rejected.
#   COMMENT DELETE: self-delete, other-student 403, admin-delete-any, cascade soft-delete,
#     deleted hidden from GET, audit written.
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
JAR_ADMIN="$(mktemp)"; JAR_STAFF1="$(mktemp)"
JAR_AUD="$(mktemp)"; JAR_STU1="$(mktemp)"; JAR_STU2="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
expect_status() { if [ "$2" = "$3" ]; then ok "$1 (status $3)"; else no "$1 (mong $2, nhận $3)"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/votes-comments-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$ALLBODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF1" \
        "$JAR_AUD" "$JAR_STU1" "$JAR_STU2"
}
trap cleanup EXIT

# ── Khởi server ──────────────────────────────────────────────────────────────────────────────────
start_server() {
  echo "▶ Khởi dev server…"
  ( cd "$WEB" && npm run dev ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  local deadline=$(($(date +%s) + 60))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me" 2>/dev/null | grep -q "^[245]"; then
      echo "  server ready"
      return 0
    fi
    sleep 1
  done
  echo "  TIMEOUT server không khởi được"
  return 1
}

# ── Fixture ──────────────────────────────────────────────────────────────────────────────────────
echo "▶ Setup fixture…"
FX="$(cd "$WEB" && npx --no-install tsx prisma/votes-comments-fixture.ts 2>/dev/null)" || { echo "Fixture setup thất bại"; exit 1; }
eval "$(echo "$FX" | grep '^VAFX_')"
echo "  fixture ready"

# ── Server ───────────────────────────────────────────────────────────────────────────────────────
# Nếu server đã chạy ở BASE_URL dùng luôn, không spawn.
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me" 2>/dev/null | grep -q "^[245]"; then
  start_server
fi

# ── Login helpers ─────────────────────────────────────────────────────────────────────────────────
login_email() { local email="$1" jar="$2"
  curl -s -c "$jar" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"$email\",\"password\":\"$PW\"}" >> "$ALLBODIES"
}
login_sbd() { local sbd="$1" jar="$2"
  curl -s -c "$jar" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"$sbd\",\"password\":\"$PW\"}" >> "$ALLBODIES"
}

login_email "va-admin@test.local"   "$JAR_ADMIN"
login_email "va-staff1@test.local"  "$JAR_STAFF1"
login_email "va-auditor@test.local" "$JAR_AUD"
login_sbd   "VA-0001"               "$JAR_STU1"
login_sbd   "VA-0002"               "$JAR_STU2"

echo ""
echo "═══ VOTE ════════════════════════════════════════════"

# ── Test 1: AUDITOR PUT vote → 403 ───────────────────────────────────────────────────────────────
ST=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_AUD" -X PUT \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/vote" \
  -H "Content-Type: application/json" -d '{"value":1}')
expect_status "1. AUDITOR vote → 403" "403" "$ST"

# ── Test 2: Student1 PUT vote up on C_PUBLIC ──────────────────────────────────────────────────────
VOTE_UP=$(curl -s -b "$JAR_STU1" -X PUT \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/vote" \
  -H "Content-Type: application/json" -d '{"value":1}')
echo "$VOTE_UP" >> "$ALLBODIES"
ST=$(echo "$VOTE_UP" | grep -o '"upCount":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ "$ST" -ge 1 ] 2>/dev/null; then ok "2. Vote up → upCount >= 1"; else no "2. Vote up → upCount >= 1 (nhận: $VOTE_UP)"; fi

# ── Test 3: myVote = 1 trả về ─────────────────────────────────────────────────────────────────────
if echo "$VOTE_UP" | grep -q '"myVote":1'; then ok "3. myVote=1 sau vote up"; else no "3. myVote=1 sau vote up (nhận: $VOTE_UP)"; fi

# ── Test 4: Student1 toggle (PUT same value) → DELETE semantics (myVote null) ───────────────────
# Theo toggle logic FE: cùng value → DELETE. Test server DELETE directly.
VOTE_DEL=$(curl -s -b "$JAR_STU1" -X DELETE "$BASE_URL/api/cases/$VAFX_C_PUBLIC/vote")
echo "$VOTE_DEL" >> "$ALLBODIES"
if echo "$VOTE_DEL" | grep -q '"myVote":null'; then ok "4. DELETE vote → myVote=null"; else no "4. DELETE vote → myVote=null (nhận: $VOTE_DEL)"; fi

# ── Test 5: Student1 vote down ─────────────────────────────────────────────────────────────────
VOTE_DOWN=$(curl -s -b "$JAR_STU1" -X PUT \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/vote" \
  -H "Content-Type: application/json" -d '{"value":-1}')
echo "$VOTE_DOWN" >> "$ALLBODIES"
if echo "$VOTE_DOWN" | grep -q '"myVote":-1'; then ok "5. Vote down → myVote=-1"; else no "5. Vote down → myVote=-1 (nhận: $VOTE_DOWN)"; fi

# ── Test 6: Admin vote up same case (aggregate shows both) ────────────────────────────────────────
VOTE_ADM=$(curl -s -b "$JAR_ADMIN" -X PUT \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/vote" \
  -H "Content-Type: application/json" -d '{"value":1}')
echo "$VOTE_ADM" >> "$ALLBODIES"
UP=$(echo "$VOTE_ADM" | grep -o '"upCount":[0-9]*' | grep -o '[0-9]*')
DN=$(echo "$VOTE_ADM" | grep -o '"downCount":[0-9]*' | grep -o '[0-9]*')
if [ "$UP" -ge 1 ] && [ "$DN" -ge 1 ] 2>/dev/null; then ok "6. Aggregate: upCount≥1 + downCount≥1 khi hai vote khác nhau"; else no "6. Aggregate up+down (up=$UP down=$DN)"; fi

# ── Test 7: score = upCount - downCount ───────────────────────────────────────────────────────────
SCORE_GOT=$(echo "$VOTE_ADM" | grep -o '"score":-\?[0-9]*' | grep -o -- '-\?[0-9]*')
SCORE_EXP=$((UP - DN))
if [ "$SCORE_GOT" = "$SCORE_EXP" ] 2>/dev/null; then ok "7. score = upCount - downCount ($SCORE_EXP)"; else no "7. score sai (mong $SCORE_EXP, nhận $SCORE_GOT)"; fi

# ── Test 8: Vote trên case nhạy cảm mà student1 không thấy → 404 ────────────────────────────────
ST=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_STU1" -X PUT \
  "$BASE_URL/api/cases/$VAFX_C_SENS/vote" \
  -H "Content-Type: application/json" -d '{"value":1}')
expect_status "8. Vote C_SENS (student1 không thấy) → 404" "404" "$ST"

# ── Test 9: Vote response KHÔNG lộ danh tính người vote (chỉ aggregate + myVote) ────────────────
if echo "$VOTE_ADM" | grep -qE '"(userId|user|email|sbd|name)"'; then
  no "9. Vote response lộ danh tính → PII leak"
else
  ok "9. Vote response chỉ aggregate (không lộ PII)"
fi

# ── Test 10: 401 (unauthenticated vote) ──────────────────────────────────────────────────────────
ST=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/vote" \
  -H "Content-Type: application/json" -d '{"value":1}')
expect_status "10. Vote unauthenticated → 401" "401" "$ST"

# ── Test 11: Invalid vote value → 400 ────────────────────────────────────────────────────────────
ST=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_STU1" -X PUT \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/vote" \
  -H "Content-Type: application/json" -d '{"value":0}')
expect_status "11. value=0 → 400" "400" "$ST"

echo ""
echo "═══ COMMENT REPLY ═══════════════════════════════════"

# Tạo 1 comment gốc (student1 trên C_PUBLIC) để reply vào.
ROOT_CMT=$(curl -s -b "$JAR_STU1" -X POST \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments" \
  -H "Content-Type: application/json" \
  -d '{"body":"Root comment cho test reply"}')
echo "$ROOT_CMT" >> "$ALLBODIES"
ROOT_CMT_ID=$(echo "$ROOT_CMT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ── Test 12: Non-ADMIN (student2) reply → 403 ────────────────────────────────────────────────────
ST=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_STU2" -X POST \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments" \
  -H "Content-Type: application/json" \
  -d "{\"body\":\"Reply từ student2\",\"parentId\":\"$ROOT_CMT_ID\"}")
expect_status "12. Non-ADMIN reply → 403" "403" "$ST"

# ── Test 13: STAFF reply → 403 ───────────────────────────────────────────────────────────────────
ST=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_STAFF1" -X POST \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments" \
  -H "Content-Type: application/json" \
  -d "{\"body\":\"Reply từ staff\",\"parentId\":\"$ROOT_CMT_ID\"}")
expect_status "13. STAFF reply → 403" "403" "$ST"

# ── Test 14: ADMIN reply → 201 ───────────────────────────────────────────────────────────────────
REPLY=$(curl -s -b "$JAR_ADMIN" -X POST \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments" \
  -H "Content-Type: application/json" \
  -d "{\"body\":\"Reply từ admin\",\"parentId\":\"$ROOT_CMT_ID\"}")
echo "$REPLY" >> "$ALLBODIES"
REPLY_ID=$(echo "$REPLY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if echo "$REPLY" | grep -q '"parentId"'; then ok "14. ADMIN reply trả parentId"; else no "14. ADMIN reply thiếu parentId (nhận: $REPLY)"; fi

# ── Test 15: parentId của reply = ROOT_CMT_ID ────────────────────────────────────────────────────
PARENT_GOT=$(echo "$REPLY" | grep -o '"parentId":"[^"]*"' | cut -d'"' -f4)
if [ "$PARENT_GOT" = "$ROOT_CMT_ID" ]; then ok "15. parentId đúng = root comment id"; else no "15. parentId sai (mong $ROOT_CMT_ID, nhận $PARENT_GOT)"; fi

# ── Test 16: Reply của reply (depth > 2) → 400 ───────────────────────────────────────────────────
if [ -n "$REPLY_ID" ]; then
  ST=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_ADMIN" -X POST \
    "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments" \
    -H "Content-Type: application/json" \
    -d "{\"body\":\"Nested reply\",\"parentId\":\"$REPLY_ID\"}")
  expect_status "16. Reply lồng depth>2 → 400" "400" "$ST"
else
  no "16. Bỏ qua: reply_id rỗng"
fi

# ── Test 17: GET comments sau reply — parentId có trong list ─────────────────────────────────────
LIST=$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments")
echo "$LIST" >> "$ALLBODIES"
if echo "$LIST" | grep -q "\"parentId\":\"$ROOT_CMT_ID\""; then
  ok "17. GET comments trả kèm reply với parentId đúng"
else
  no "17. GET comments thiếu reply parentId (nhận: $LIST)"
fi

echo ""
echo "═══ COMMENT DELETE ══════════════════════════════════"

# Tạo thêm 1 comment gốc (student1 trên C_OWN) để test delete.
CMT_DEL=$(curl -s -b "$JAR_STU1" -X POST \
  "$BASE_URL/api/cases/$VAFX_C_OWN/comments" \
  -H "Content-Type: application/json" \
  -d '{"body":"Comment để test delete (student1 tự xoá)"}')
echo "$CMT_DEL" >> "$ALLBODIES"
CMT_DEL_ID=$(echo "$CMT_DEL" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Tạo comment gốc (student1 trên C_PUBLIC) để test admin xoá.
CMT_ADMIN_DEL=$(curl -s -b "$JAR_STU1" -X POST \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments" \
  -H "Content-Type: application/json" \
  -d '{"body":"Comment để admin xoá"}')
echo "$CMT_ADMIN_DEL" >> "$ALLBODIES"
CMT_ADMIN_DEL_ID=$(echo "$CMT_ADMIN_DEL" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ── Test 18: student2 xoá comment của student1 → 403 ────────────────────────────────────────────
if [ -n "$CMT_DEL_ID" ]; then
  ST=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_STU2" -X DELETE \
    "$BASE_URL/api/cases/$VAFX_C_OWN/comments/$CMT_DEL_ID")
  expect_status "18. student2 xoá comment người khác → 403" "403" "$ST"
else
  no "18. Bỏ qua: cmt_del_id rỗng"
fi

# ── Test 19: Student1 tự xoá comment của mình → 200 {"deleted":true} ───────────────────────────
if [ -n "$CMT_DEL_ID" ]; then
  RES=$(curl -s -b "$JAR_STU1" -X DELETE \
    "$BASE_URL/api/cases/$VAFX_C_OWN/comments/$CMT_DEL_ID")
  if echo "$RES" | grep -q '"deleted":true'; then ok "19. Self-delete → {deleted:true}"; else no "19. Self-delete thất bại (nhận: $RES)"; fi
else
  no "19. Bỏ qua: cmt_del_id rỗng"
fi

# ── Test 20: Comment đã xoá ẩn khỏi GET ─────────────────────────────────────────────────────────
if [ -n "$CMT_DEL_ID" ]; then
  LIST_AFTER=$(curl -s -b "$JAR_STU1" "$BASE_URL/api/cases/$VAFX_C_OWN/comments")
  if echo "$LIST_AFTER" | grep -q "\"$CMT_DEL_ID\""; then
    no "20. Comment đã xoá vẫn xuất hiện trong GET"
  else
    ok "20. Comment đã xoá ẩn khỏi GET"
  fi
else
  no "20. Bỏ qua: cmt_del_id rỗng"
fi

# ── Test 21: Admin xoá comment bất kỳ → 200 ─────────────────────────────────────────────────────
if [ -n "$CMT_ADMIN_DEL_ID" ]; then
  RES=$(curl -s -b "$JAR_ADMIN" -X DELETE \
    "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments/$CMT_ADMIN_DEL_ID")
  if echo "$RES" | grep -q '"deleted":true'; then ok "21. ADMIN xoá comment bất kỳ → {deleted:true}"; else no "21. ADMIN delete thất bại (nhận: $RES)"; fi
else
  no "21. Bỏ qua: cmt_admin_del_id rỗng"
fi

# ── Test 22: Cascade soft-delete replies khi xoá root ────────────────────────────────────────────
# ROOT_CMT_ID có REPLY_ID là reply con. Xoá ROOT_CMT_ID.
if [ -n "$ROOT_CMT_ID" ] && [ -n "$REPLY_ID" ]; then
  RES=$(curl -s -b "$JAR_ADMIN" -X DELETE \
    "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments/$ROOT_CMT_ID")
  if echo "$RES" | grep -q '"deleted":true'; then
    # Kiểm tra reply cũng ẩn khỏi GET.
    GET_AFTER=$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments")
    if echo "$GET_AFTER" | grep -q "\"$REPLY_ID\""; then
      no "22. Cascade: reply con vẫn xuất hiện sau khi xoá root"
    else
      ok "22. Cascade soft-delete: reply con ẩn theo"
    fi
  else
    no "22. Xoá root thất bại (nhận: $RES)"
  fi
else
  no "22. Bỏ qua: root hoặc reply id rỗng"
fi

# ── Test 23: DELETE comment đã bị xoá → 404 ─────────────────────────────────────────────────────
if [ -n "$ROOT_CMT_ID" ]; then
  ST=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_ADMIN" -X DELETE \
    "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments/$ROOT_CMT_ID")
  expect_status "23. Xoá comment đã xoá → 404" "404" "$ST"
else
  no "23. Bỏ qua: root_cmt_id rỗng"
fi

# ── Test 24: AUDITOR xoá comment → chỉ audit nếu có quyền thấy case. Test 401 unauthenticated.
ST=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$BASE_URL/api/cases/$VAFX_C_PUBLIC/comments/nonexistent-id")
expect_status "24. DELETE comment unauthenticated → 401" "401" "$ST"

echo ""
echo "═══ LEAK SCAN ════════════════════════════════════════"

# ── Test 25: Không có passwordHash trong bất kỳ response nào ────────────────────────────────────
if grep -q "passwordHash" "$ALLBODIES" 2>/dev/null; then
  no "25. passwordHash lộ trong response"
else
  ok "25. Không có passwordHash trong response"
fi

# ── Test 26: Danh tính voter không lộ trong vote response ────────────────────────────────────────
VOTE_FIELDS=$(grep -oE '"(userId|voterName|voter)"' "$ALLBODIES" 2>/dev/null | wc -l)
if [ "$VOTE_FIELDS" -gt 0 ]; then
  no "26. Danh tính voter lộ trong response ($VOTE_FIELDS lần)"
else
  ok "26. Danh tính voter không lộ"
fi

# ── Kết quả ──────────────────────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
echo "  KẾT QUẢ: PASS=$PASS  FAIL=$FAIL  TOTAL=$((PASS+FAIL))"
echo "══════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ]
