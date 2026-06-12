#!/usr/bin/env bash
# test-users.sh — GET /api/users ADMIN-only, 0-PII, pagination, role-guard
# Runs against localhost:3000 (must be started before calling this script).
# Uses p4-* fixture users seeded by prisma/cases-fixture.ts.
set -euo pipefail

BASE="http://localhost:3000"
PASS=0; FAIL=0
JAR_ADMIN=$(mktemp); JAR_STAFF=$(mktemp); JAR_AUDITOR=$(mktemp); JAR_STUDENT=$(mktemp)

cleanup() { rm -f "$JAR_ADMIN" "$JAR_STAFF" "$JAR_AUDITOR" "$JAR_STUDENT"; }
trap cleanup EXIT

ok() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }
assert_status() {
  local label="$1" expected="$2" actual="$3"
  [[ "$actual" == "$expected" ]] && ok "$label (HTTP $actual)" || fail "$label — expected $expected got $actual"
}

# ── Login fixtures ──────────────────────────────────────────────────────────
ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-p4-admin@test.local}"
STAFF_EMAIL="${E2E_STAFF_EMAIL:-p4-staff@test.local}"
AUDITOR_EMAIL="${E2E_AUDITOR_EMAIL:-p4-auditor@test.local}"
STUDENT_SBD="${E2E_STUDENT_SBD:-P4-0001}"
PW="${E2E_PASSWORD:-Test@123456}"

echo "[test-users] Logging in..."
login() {
  local jar="$1" identifier="$2"
  curl -sf -c "$jar" -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"$identifier\",\"password\":\"$PW\"}" -o /dev/null
}
login "$JAR_ADMIN" "$ADMIN_EMAIL"
login "$JAR_STAFF" "$STAFF_EMAIL"
login "$JAR_AUDITOR" "$AUDITOR_EMAIL"
login "$JAR_STUDENT" "$STUDENT_SBD"

echo "[test-users] Running checks..."

# ── 1. ADMIN 200 + shape (ONLY {id,name,role}; 0 PII) ─────────────────────
body=$(curl -sf -b "$JAR_ADMIN" "$BASE/api/users?role=STAFF" 2>/dev/null) || { fail "ADMIN /api/users curl failed"; body="{}"; }
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_ADMIN" "$BASE/api/users?role=STAFF")
assert_status "ADMIN GET /api/users 200" "200" "$status"

# Shape check: must have users[], total, page, totalPages
echo "$body" | grep -q '"users"' && ok "ADMIN response has 'users' key" || fail "ADMIN response missing 'users' key"
echo "$body" | grep -q '"total"' && ok "ADMIN response has 'total' key" || fail "ADMIN response missing 'total'"
echo "$body" | grep -q '"page"' && ok "ADMIN response has 'page' key" || fail "ADMIN response missing 'page'"
echo "$body" | grep -q '"totalPages"' && ok "ADMIN response has 'totalPages' key" || fail "ADMIN response missing 'totalPages'"

# PII leak-scan: MUST NOT have email, passwordHash, sbd, dob
echo "$body" | grep -q '"email"' && fail "LEAK: 'email' in users response" || ok "0-PII: no email field"
echo "$body" | grep -q '"passwordHash"' && fail "LEAK: 'passwordHash' in users response" || ok "0-PII: no passwordHash"
echo "$body" | grep -q '"sbd"' && fail "LEAK: 'sbd' in users response" || ok "0-PII: no sbd"
echo "$body" | grep -q '"dob"' && fail "LEAK: 'dob' in users response" || ok "0-PII: no dob"

# ── 2. STAFF 403 ────────────────────────────────────────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_STAFF" "$BASE/api/users?role=STAFF")
assert_status "STAFF GET /api/users 403" "403" "$s"

# ── 3. AUDITOR 403 ──────────────────────────────────────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_AUDITOR" "$BASE/api/users?role=STAFF")
assert_status "AUDITOR GET /api/users 403" "403" "$s"

# ── 4. STUDENT 403 ──────────────────────────────────────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_STUDENT" "$BASE/api/users?role=STAFF")
assert_status "STUDENT GET /api/users 403" "403" "$s"

# ── 5. Anon 401 ─────────────────────────────────────────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/users?role=STAFF")
assert_status "Anon GET /api/users 401" "401" "$s"

# ── 6. ?role=STUDENT → 400 ──────────────────────────────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_ADMIN" "$BASE/api/users?role=STUDENT")
assert_status "?role=STUDENT → 400" "400" "$s"

# ── 7. ?role=AUDITOR → 400 ──────────────────────────────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_ADMIN" "$BASE/api/users?role=AUDITOR")
assert_status "?role=AUDITOR → 400" "400" "$s"

# ── 8. ?limit=0 → 400 ───────────────────────────────────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_ADMIN" "$BASE/api/users?limit=0")
assert_status "?limit=0 → 400" "400" "$s"

# ── 9. ?limit=101 → 400 ─────────────────────────────────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_ADMIN" "$BASE/api/users?limit=101")
assert_status "?limit=101 → 400" "400" "$s"

# ── 10. ?role=ADMIN 200 (ADMIN querying ADMIN list) ─────────────────────────
s=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR_ADMIN" "$BASE/api/users?role=ADMIN")
assert_status "ADMIN GET /api/users?role=ADMIN 200" "200" "$s"

# ── 11. Pagination tiebreaker — page=1 limit=1 vs page=2 limit=1 unique ids ─
b1=$(curl -sf -b "$JAR_ADMIN" "$BASE/api/users?role=STAFF&page=1&limit=1" 2>/dev/null) || b1="{}"
b2=$(curl -sf -b "$JAR_ADMIN" "$BASE/api/users?role=STAFF&page=2&limit=1" 2>/dev/null) || b2="{}"
# If there are ≥2 STAFF, ids should differ (tiebreaker works)
total_staff=$(echo "$body" | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")
if [[ "$total_staff" -ge 2 ]]; then
  id1=$(echo "$b1" | grep -o '"id":"[^"]*"' | head -1)
  id2=$(echo "$b2" | grep -o '"id":"[^"]*"' | head -1)
  [[ "$id1" != "$id2" ]] && ok "Pagination tiebreaker: page1≠page2 ids" || fail "Pagination tiebreaker: page1=page2 id (sort not deterministic)"
else
  ok "Pagination tiebreaker: skipped (fewer than 2 STAFF)"
fi

echo ""
echo "────────────────────────────────"
echo "test-users RESULT: PASS=$PASS FAIL=$FAIL"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
