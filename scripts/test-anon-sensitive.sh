#!/usr/bin/env bash
# scripts/test-anon-sensitive.sh — Update C: báo cáo ẩn danh + siết nhạy cảm (lõi phân quyền).
# Fixture: web/prisma/anon-sensitive-fixture.ts (6 user as-* + 2 category). Case tạo QUA API.
# Phủ §5 matrix:
#   NHẠY CẢM (policy MỚI): case nhạy cảm CHỈ ADMIN/AUDITOR/creator thấy — student-khác + STAFF
#     (kể cả được giao) KHÔNG thấy (list/detail/lane/dashboard). Emergency lane sensitive chỉ ADMIN/AUDITOR.
#   ẨN DANH: viewer ∉ {admin,auditor,creator} → createdById="anonymous" + createdBy.name="Ẩn danh"
#     + isAnonymous=true; admin/auditor/creator thấy THẬT. mask cả comment + statusHistory do creator tạo.
#   ESCALATE-ONLY: category buộc nhạy cảm → sensitive=true dù user gửi sensitive:false.
#   AUDITOR read-only (403 mutate). LEAK-SCAN: 0 id/tên thật của creator cho viewer không được phép.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

PASS=0; FAIL=0
ALLBODIES="$(mktemp)"; LEAKBODIES="$(mktemp)"
SERVER_PID=""; SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"; JAR_STAFF1="$(mktemp)"; JAR_STAFF2="$(mktemp)"
JAR_AUD="$(mktemp)"; JAR_STU1="$(mktemp)"; JAR_STU2="$(mktemp)"

ok()  { echo "    ✓ $1"; PASS=$((PASS+1)); }
no()  { echo "    ✗ $1"; FAIL=$((FAIL+1)); }
st()  { if [ "$STATUS" = "$2" ]; then ok "$1 (status $2)"; else no "$1 (mong $2, nhận $STATUS) — $BODY"; fi; }
eq()  { if [ "$2" = "$3" ]; then ok "$1 (=$3)"; else no "$1 (mong '$3', nhận '$2')"; fi; }
ne()  { if [ "$2" != "$3" ]; then ok "$1 (≠'$3': '$2')"; else no "$1 (KHÔNG được = '$3')"; fi; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/anon-sensitive-fixture.ts --teardown ) >/dev/null 2>&1
  rm -f "$ALLBODIES" "$LEAKBODIES" "$SERVER_LOG" "$JAR_ADMIN" "$JAR_STAFF1" "$JAR_STAFF2" \
        "$JAR_AUD" "$JAR_STU1" "$JAR_STU2"
}
trap cleanup EXIT

# ── curl wrapper: set STATUS + BODY globals; log body ──
req() { # jar method path [body] [leak?]  — -c+-b: lưu+gửi cookie (auth bền giữa request)
  local jar="$1" method="$2" path="$3" body="${4:-}" leak="${5:-}" out
  if [ -n "$body" ]; then
    out=$(curl -s -w $'\n%{http_code}' -c "$jar" -b "$jar" -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" -d "$body")
  else
    out=$(curl -s -w $'\n%{http_code}' -c "$jar" -b "$jar" -X "$method" "$BASE_URL$path")
  fi
  STATUS="${out##*$'\n'}"; BODY="${out%$'\n'*}"
  printf '%s\n' "$BODY" >> "$ALLBODIES"
  [ -n "$leak" ] && printf '%s\n' "$BODY" >> "$LEAKBODIES"
}
# ── node JSON helpers ──
g()  { printf '%s' "$1" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));let v=d;for(const k of process.argv[1].split(".").filter(Boolean))v=(v==null?undefined:v[k]);process.stdout.write(v==null?"":String(v))' "$2"; }
lhas(){ printf '%s' "$1" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write((d.cases||[]).some(c=>c.id===process.argv[1])?"YES":"NO")' "$2"; }
lf()  { printf '%s' "$1" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const c=(d.cases||[]).find(x=>x.id===process.argv[1]);if(!c){process.stdout.write("ABSENT");process.exit(0)}let v=c;for(const k of process.argv[2].split(".").filter(Boolean))v=(v==null?undefined:v[k]);process.stdout.write(v==null?"":String(v))' "$2" "$3"; }
cf()  { printf '%s' "$1" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const c=(d.comments||[]).find(x=>x.body===process.argv[1]);if(!c){process.stdout.write("ABSENT");process.exit(0)}let v=c;for(const k of process.argv[2].split(".").filter(Boolean))v=(v==null?undefined:v[k]);process.stdout.write(v==null?"":String(v))' "$2" "$3"; }
dh0() { printf '%s' "$1" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const h=((d.case||{}).statusHistory||[])[0];if(!h){process.stdout.write("ABSENT");process.exit(0)}let v=h;for(const k of process.argv[1].split(".").filter(Boolean))v=(v==null?undefined:v[k]);process.stdout.write(v==null?"":String(v))' "$2"; }

# ── Fixture ──
echo "▶ Setup fixture…"
FX="$(cd "$WEB" && npx --no-install tsx prisma/anon-sensitive-fixture.ts 2>/dev/null)" || { echo "Fixture thất bại"; exit 1; }
getv(){ echo "$FX" | grep "^$1=" | head -1 | cut -d= -f2-; }  # cut -f2- giữ giá trị có khoảng trắng (tên)
STAFF1_ID="$(getv ASFX_STAFF1)"
STU1_ID="$(getv ASFX_STU1)"; STU1_NAME="$(getv ASFX_STU1_NAME)"
CAT_NORMAL="$(getv ASFX_CAT_NORMAL)"; CAT_SENS="$(getv ASFX_CAT_SENS)"
if [ -z "$STU1_ID" ] || [ -z "$STAFF1_ID" ] || [ -z "$CAT_NORMAL" ] || [ -z "$CAT_SENS" ]; then
  echo "Fixture thiếu KEY: $FX"; exit 1
fi
echo "  fixture ready (stu1=$STU1_ID)"

# ── Server (reuse nếu đang chạy) ──
start_server() {
  echo "▶ Khởi dev server…"
  ( cd "$WEB" && npm run dev ) >"$SERVER_LOG" 2>&1 & SERVER_PID=$!
  local deadline=$(($(date +%s) + 90))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me" 2>/dev/null | grep -q "^[245]" && { echo "  server ready"; return 0; }
    sleep 1
  done
  echo "  TIMEOUT server"; return 1
}
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me" 2>/dev/null | grep -q "^[245]" || start_server

# ── Login (curl riêng: GHI cookie vào jar, KHÔNG log body → tránh self-sbd nhiễu leak-scan) ──
li() { # identifier jar
  local s
  s=$(curl -s -o /dev/null -w "%{http_code}" -c "$2" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" -d "{\"identifier\":\"$1\",\"password\":\"$PW\"}")
  [ "$s" = "200" ] || { echo "login $1 fail ($s)"; exit 1; }
}
li "as-admin@test.local"   "$JAR_ADMIN"
li "as-staff1@test.local"  "$JAR_STAFF1"
li "as-staff2@test.local"  "$JAR_STAFF2"
li "as-auditor@test.local" "$JAR_AUD"
li "AS-0001"               "$JAR_STU1"
li "AS-0002"               "$JAR_STU2"

D() { echo "{\"title\":\"$1\",\"description\":\"Mo ta du dai hon muoi ky tu cho update C.\",$2}"; }

echo ""; echo "═══ CREATE (luồng tạo + escalate) ═══════════════════"

# C_PUBLIC: stu1, công khai, non-anon
req "$JAR_STU1" POST /api/cases "$(D 'C_PUBLIC' "\"categoryId\":\"$CAT_NORMAL\"")"; st "1. tạo C_PUBLIC" 201; C_PUBLIC="$(g "$BODY" case.id)"
eq "1b. C_PUBLIC.createdById = stu1 (creator thấy thật)" "$(g "$BODY" case.createdById)" "$STU1_ID"
eq "1c. C_PUBLIC.isAnonymous=false" "$(g "$BODY" case.isAnonymous)" "false"
# C_ANON: stu1, công khai, anonymous
req "$JAR_STU1" POST /api/cases "$(D 'C_ANON' "\"categoryId\":\"$CAT_NORMAL\",\"anonymous\":true")"; st "2. tạo C_ANON" 201; C_ANON="$(g "$BODY" case.id)"
eq "2b. C_ANON.isAnonymous=true" "$(g "$BODY" case.isAnonymous)" "true"
eq "2c. C_ANON.createdById = stu1 (creator vẫn thấy thật)" "$(g "$BODY" case.createdById)" "$STU1_ID"
# C_SENS: stu1, nhạy cảm (user bật), non-anon
req "$JAR_STU1" POST /api/cases "$(D 'C_SENS' "\"categoryId\":\"$CAT_NORMAL\",\"sensitive\":true")"; st "3. tạo C_SENS" 201; C_SENS="$(g "$BODY" case.id)"
eq "3b. C_SENS.isSensitive=true (user bật)" "$(g "$BODY" case.isSensitive)" "true"
# C_ANONSENS: stu1, nhạy cảm + ẩn danh
req "$JAR_STU1" POST /api/cases "$(D 'C_ANONSENS' "\"categoryId\":\"$CAT_NORMAL\",\"sensitive\":true,\"anonymous\":true")"; st "4. tạo C_ANONSENS" 201; C_ANONSENS="$(g "$BODY" case.id)"
# C_ESCALATE: stu1 gửi sensitive:false NHƯNG category buộc nhạy cảm → escalate-only
req "$JAR_STU1" POST /api/cases "$(D 'C_ESCALATE' "\"categoryId\":\"$CAT_SENS\",\"sensitive\":false")"; st "5. tạo C_ESCALATE (cat buộc nhạy cảm, gửi sensitive:false)" 201; C_ESCALATE="$(g "$BODY" case.id)"
eq "5b. ESCALATE-ONLY: isSensitive=true dù user gửi false" "$(g "$BODY" case.isSensitive)" "true"
# C_NORMAL_S2: stu2, công khai, NEW (control work-scope STAFF)
req "$JAR_STU2" POST /api/cases "$(D 'C_NORMAL_S2' "\"categoryId\":\"$CAT_NORMAL\"")"; st "6. tạo C_NORMAL_S2 (stu2)" 201; C_NORMAL_S2="$(g "$BODY" case.id)"
# C_SENS_S2: stu2, nhạy cảm → admin sẽ giao staff1
req "$JAR_STU2" POST /api/cases "$(D 'C_SENS_S2' "\"categoryId\":\"$CAT_NORMAL\",\"sensitive\":true")"; st "7. tạo C_SENS_S2 (stu2, nhạy cảm)" 201; C_SENS_S2="$(g "$BODY" case.id)"
# admin giao C_SENS_S2 cho staff1
req "$JAR_ADMIN" PATCH "/api/cases/$C_SENS_S2/assign" "{\"assignedToId\":\"$STAFF1_ID\"}"; st "8. admin giao C_SENS_S2 → staff1" 200
eq "8b. assign response createdBy=stu2 thật (admin thấy)" "$(g "$BODY" case.createdBy.name)" "AS Student Two"

echo ""; echo "═══ NHẠY CẢM — visibility (policy MỚI) ══════════════"

# C_SENS (creator stu1)
req "$JAR_STU2" GET "/api/cases/$C_SENS"; st "9. C_SENS: student2-khác GET detail → 404" 404
req "$JAR_STAFF1" GET "/api/cases/$C_SENS"; st "10. C_SENS: STAFF GET detail → 404 (siết)" 404
req "$JAR_ADMIN" GET "/api/cases/$C_SENS"; st "11. C_SENS: ADMIN GET detail → 200" 200
req "$JAR_AUD" GET "/api/cases/$C_SENS"; st "12. C_SENS: AUDITOR GET detail → 200" 200
req "$JAR_STU1" GET "/api/cases/$C_SENS"; st "13. C_SENS: creator(stu1) GET detail → 200" 200

# C_SENS_S2 (nhạy cảm, GIAO staff1) — STAFF assignee KHÔNG còn thấy
req "$JAR_STAFF1" GET "/api/cases/$C_SENS_S2"; st "14. C_SENS_S2: STAFF được-giao GET detail → 404 (bỏ ngoại lệ assignee)" 404
req "$JAR_STAFF1" GET "/api/cases?limit=100"; eq "15. C_SENS_S2 VẮNG khỏi list của STAFF được-giao" "$(lhas "$BODY" "$C_SENS_S2")" "NO"
req "$JAR_ADMIN" GET "/api/cases/$C_SENS_S2"; st "16. C_SENS_S2: ADMIN GET detail → 200" 200

# List visibility
req "$JAR_STAFF1" GET "/api/cases?limit=100"; eq "17. C_SENS VẮNG khỏi list STAFF" "$(lhas "$BODY" "$C_SENS")" "NO"
eq "17b. C_NORMAL_S2 (NEW, công khai) CÓ trong list STAFF (work-scope còn nguyên)" "$(lhas "$BODY" "$C_NORMAL_S2")" "YES"
req "$JAR_STU2" GET "/api/cases?limit=100"; eq "18. C_SENS VẮNG khỏi list student2-khác" "$(lhas "$BODY" "$C_SENS")" "NO"
req "$JAR_ADMIN" GET "/api/cases?limit=100"; eq "19. C_SENS CÓ trong list ADMIN" "$(lhas "$BODY" "$C_SENS")" "YES"
req "$JAR_STU1" GET "/api/cases?limit=100"; eq "20. C_SENS CÓ trong list creator(stu1)" "$(lhas "$BODY" "$C_SENS")" "YES"

echo ""; echo "═══ NHẠY CẢM — emergency lane + dashboard ═══════════"
# Bật emergency: C_NORMAL_S2 (công khai) + C_SENS_S2 (nhạy cảm)
req "$JAR_ADMIN" PATCH "/api/cases/$C_NORMAL_S2/emergency" "{\"isEmergency\":true}"; st "21. admin bật emergency C_NORMAL_S2 (công khai)" 200
req "$JAR_ADMIN" PATCH "/api/cases/$C_SENS_S2/emergency" "{\"isEmergency\":true}"; st "22. admin bật emergency C_SENS_S2 (nhạy cảm)" 200
req "$JAR_STAFF1" GET "/api/cases/emergency"; st "23. STAFF GET lane" 200
eq "23b. STAFF lane THẤY emergency công khai" "$(lhas "$BODY" "$C_NORMAL_S2")" "YES"
eq "23c. STAFF lane KHÔNG thấy emergency NHẠY CẢM (dù được giao) — siết" "$(lhas "$BODY" "$C_SENS_S2")" "NO"
req "$JAR_ADMIN" GET "/api/cases/emergency"; eq "24. ADMIN lane THẤY emergency nhạy cảm" "$(lhas "$BODY" "$C_SENS_S2")" "YES"
req "$JAR_AUD" GET "/api/cases/emergency"; eq "25. AUDITOR lane THẤY emergency nhạy cảm" "$(lhas "$BODY" "$C_SENS_S2")" "YES"
# Dashboard role-gate (không đổi)
req "$JAR_ADMIN" GET "/api/dashboard"; st "26. ADMIN dashboard → 200" 200
req "$JAR_STAFF1" GET "/api/dashboard"; st "26b. STAFF dashboard → 403" 403
req "$JAR_STU1" GET "/api/dashboard"; st "26c. STUDENT dashboard → 403" 403

echo ""; echo "═══ ẨN DANH — mask danh tính ═══════════════════════"
# C_ANON detail — student2 (không được phép) → mask
req "$JAR_STU2" GET "/api/cases/$C_ANON" "" leak; st "27. C_ANON: student2 GET detail → 200 (công khai)" 200
eq "27b. createdBy.name = 'Ẩn danh'" "$(g "$BODY" case.createdBy.name)" "Ẩn danh"
eq "27c. createdById = 'anonymous' (KHÔNG lộ id thật)" "$(g "$BODY" case.createdById)" "anonymous"
eq "27d. createdBy.role = STUDENT (sentinel, không lộ vai trò)" "$(g "$BODY" case.createdBy.role)" "STUDENT"
eq "27e. isAnonymous=true (FE gắn badge)" "$(g "$BODY" case.isAnonymous)" "true"
eq "27f. statusHistory[0].changedById masked (chống de-anon qua timeline)" "$(dh0 "$BODY" changedById)" "anonymous"
# C_ANON detail — staff1 (work-scope thấy, không phải creator) → mask
req "$JAR_STAFF1" GET "/api/cases/$C_ANON" "" leak; st "28. C_ANON: staff1 GET detail → 200 (NEW work-scope)" 200
eq "28b. staff1 createdById = anonymous" "$(g "$BODY" case.createdById)" "anonymous"
# C_ANON detail — admin/auditor/creator → THẬT
req "$JAR_ADMIN" GET "/api/cases/$C_ANON"; st "29. C_ANON: admin GET detail → 200" 200
eq "29b. admin createdBy.name = THẬT ($STU1_NAME)" "$(g "$BODY" case.createdBy.name)" "$STU1_NAME"
eq "29c. admin createdById = THẬT (stu1 id)" "$(g "$BODY" case.createdById)" "$STU1_ID"
eq "29d. admin vẫn thấy isAnonymous=true" "$(g "$BODY" case.isAnonymous)" "true"
req "$JAR_AUD" GET "/api/cases/$C_ANON"; eq "30. C_ANON: auditor createdById = THẬT" "$(g "$BODY" case.createdById)" "$STU1_ID"
req "$JAR_STU1" GET "/api/cases/$C_ANON"; eq "31. C_ANON: creator(stu1) createdById = THẬT" "$(g "$BODY" case.createdById)" "$STU1_ID"
# C_PUBLIC (non-anon) control — KHÔNG mask
req "$JAR_STU2" GET "/api/cases/$C_PUBLIC"; eq "32. C_PUBLIC (non-anon): student2 thấy createdById THẬT (control)" "$(g "$BODY" case.createdById)" "$STU1_ID"
# C_ANON list mask
# LƯU Ý: KHÔNG đẩy list vào LEAKBODIES — list chứa C_PUBLIC (non-anon của stu1) có id/tên THẬT hợp lệ
# (false-positive cho grep-scan). Mask của C_ANON trong list được kiểm field-level (33/33b) thay vì grep.
req "$JAR_STU2" GET "/api/cases?limit=100"; eq "33. C_ANON trong list student2 → createdById masked" "$(lf "$BODY" "$C_ANON" createdById)" "anonymous"
eq "33b. C_ANON trong list student2 → createdBy.name='Ẩn danh'" "$(lf "$BODY" "$C_ANON" createdBy.name)" "Ẩn danh"
req "$JAR_ADMIN" GET "/api/cases?limit=100"; eq "34. C_ANON trong list admin → createdById THẬT" "$(lf "$BODY" "$C_ANON" createdById)" "$STU1_ID"
# mine của creator vẫn ra đúng (kèm case ẩn danh + nhạy cảm của mình, createdById thật)
req "$JAR_STU1" GET "/api/cases?mine=true&limit=100"; st "35. creator GET ?mine=true" 200
eq "35b. ?mine chứa C_ANON" "$(lhas "$BODY" "$C_ANON")" "YES"
eq "35c. ?mine chứa C_SENS (nhạy cảm của mình)" "$(lhas "$BODY" "$C_SENS")" "YES"
eq "35d. ?mine C_ANON createdById = stu1 THẬT" "$(lf "$BODY" "$C_ANON" createdById)" "$STU1_ID"

echo ""; echo "═══ ẨN DANH — mask author comment (de-anon) ═════════"
# creator (stu1) bình luận trên case ẩn danh của mình; admin cũng bình luận
req "$JAR_STU1" POST "/api/cases/$C_ANON/comments" '{"body":"Binh luan cua nguoi tao an danh"}'; st "36. creator comment trên C_ANON" 201
req "$JAR_ADMIN" POST "/api/cases/$C_ANON/comments" '{"body":"Binh luan cua admin"}'; st "37. admin comment trên C_ANON" 201
# student2 GET comments → comment của creator bị mask, comment admin hiện thật
req "$JAR_STU2" GET "/api/cases/$C_ANON/comments" "" leak; st "38. student2 GET comments C_ANON" 200
eq "38b. comment creator → author.name='Ẩn danh'" "$(cf "$BODY" "Binh luan cua nguoi tao an danh" author.name)" "Ẩn danh"
eq "38c. comment creator → authorId='anonymous'" "$(cf "$BODY" "Binh luan cua nguoi tao an danh" authorId)" "anonymous"
eq "38d. comment admin → author.name THẬT (AS Admin)" "$(cf "$BODY" "Binh luan cua admin" author.name)" "AS Admin"
# admin GET comments → comment creator hiện THẬT
req "$JAR_ADMIN" GET "/api/cases/$C_ANON/comments"; eq "39. admin GET comments → comment creator authorId THẬT" "$(cf "$BODY" "Binh luan cua nguoi tao an danh" authorId)" "$STU1_ID"
# detail route comments cũng mask cho student2
req "$JAR_STU2" GET "/api/cases/$C_ANON" "" leak
eq "40. detail route: comment creator author.name='Ẩn danh' (mask đồng nhất GET comments)" "$(printf '%s' "$BODY" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const c=(d.case.comments||[]).find(x=>x.body==="Binh luan cua nguoi tao an danh");process.stdout.write(c?String(c.author.name):"ABSENT")')" "Ẩn danh"

echo ""; echo "═══ AUDITOR read-only ══════════════════════════════"
req "$JAR_AUD" POST /api/cases "$(D 'AUD' "\"categoryId\":\"$CAT_NORMAL\"")"; st "41. AUDITOR POST case → 403" 403
req "$JAR_AUD" PATCH "/api/cases/$C_PUBLIC/emergency" '{"isEmergency":true}'; st "42. AUDITOR PATCH emergency → 403" 403
req "$JAR_AUD" PUT "/api/cases/$C_PUBLIC/vote" '{"value":1}'; st "43. AUDITOR vote → 403" 403

echo ""; echo "═══ LEAK SCAN ══════════════════════════════════════"
# LEAKBODIES = response cho viewer KHÔNG được phép thấy danh tính creator của C_ANON.
# KHÔNG được chứa id thật / tên thật của stu1 ở ĐÂU.
if grep -qF "$STU1_ID" "$LEAKBODIES"; then no "44. id THẬT của creator (stu1) LỌT cho viewer không-được-phép (RÒ!)"; else ok "44. id thật creator KHÔNG lọt cho viewer không-được-phép"; fi
if grep -qF "$STU1_NAME" "$LEAKBODIES"; then no "45. TÊN thật creator LỌT cho viewer không-được-phép (RÒ!)"; else ok "45. tên thật creator KHÔNG lọt cho viewer không-được-phép"; fi
if grep -q "passwordHash" "$ALLBODIES"; then no "46. passwordHash lộ"; else ok "46. KHÔNG có passwordHash"; fi
if grep -qE '"(sbd|dob|admissionYear)":' "$ALLBODIES"; then no "47. PII (sbd/dob/admissionYear) lộ"; else ok "47. KHÔNG lộ PII sbd/dob/admissionYear"; fi

echo ""
echo "══════════════════════════════════════════════════════"
echo "  KẾT QUẢ: PASS=$PASS  FAIL=$FAIL  TOTAL=$((PASS+FAIL))"
echo "══════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ]
