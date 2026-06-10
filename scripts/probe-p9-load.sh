#!/usr/bin/env bash
# scripts/probe-p9-load.sh — P9 concurrency PROBE (CHẠY TAY). Tên `probe-` (KHÔNG `test-`) để KHÔNG bị
#   glob `test-*.sh` của test-all.sh nhặt vào lần chạy gộp (probe phụ-thuộc-tải, sẽ làm aggregate flaky).
#
# ⚠ Đây là PHÉP ĐO vận hành, KHÔNG phải PROOF (khác P5 mutation-proof tất định). Kết quả "0×500"
#   phụ thuộc DB latency / pgbouncer / pool của MÔI TRƯỜNG này, có thể dao động giữa các lần chạy.
#   Hơn nữa các GET route hiện KHÔNG map pool-timeout→503 (catch→500), nên 0×500 là MỤC TIÊU vận hành
#   chứ không phải bảo chứng của code. Tách khỏi test-all.sh chính vì lý do này (không làm CI flaky).
#
# (A) 50 GET /api/cases?limit=20 SONG SONG → đếm 5xx (mục tiêu 0×500); in latency min/median/max.
# (B) 10 PATCH /status {"status":"TRIAGED"} SONG SONG trên 1 case NEW → optimistic-lock: ĐÚNG 1×200,
#     0×500 (còn lại 409 thua-lock / 503 cạn-pool). In "contention: a×200 / b×409 / c×503".
# PASS iff: A 500==0 VÀ B 200==1 VÀ B 500==0.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3000}"
PW='Test@123456'

SERVER_PID=""
SERVER_LOG="$(mktemp)"
JAR_ADMIN="$(mktemp)"
RES="$(mktemp -d)"

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  ( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts --teardown ) >/dev/null 2>&1
  rm -rf "$SERVER_LOG" "$JAR_ADMIN" "$RES"
}
trap cleanup EXIT INT TERM

# 1. Fixture fresh (reset C_STATUS_STAFF về NEW cho contention test).
echo "  → setup fixture"
if ! FIXTURE_OUT="$( cd "$WEB" && npx --no-install tsx prisma/p9-fixture.ts )"; then
  echo "    ✗ không tạo được fixture"; echo "$FIXTURE_OUT"; exit 1
fi
getv() { echo "$FIXTURE_OUT" | grep "^$1=" | head -1 | cut -d= -f2-; }
ADMIN_EMAIL="$(getv P9FX_ADMIN_EMAIL)"; C_STATUS_STAFF="$(getv P9FX_C_STATUS_STAFF)"
[ -n "$ADMIN_EMAIL" ] && [ -n "$C_STATUS_STAFF" ] || { echo "    ✗ fixture thiếu dữ liệu"; echo "$FIXTURE_OUT"; exit 1; }

# 2. Server reuse / launch.
probe() { local c; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/auth/me" 2>/dev/null); echo "${c:-000}"; }
if [ "$(probe)" != "000" ]; then
  echo "  → dùng lại server đang chạy tại $BASE_URL"
else
  echo "  → khởi động next dev"
  ( cd "$WEB" && exec ./node_modules/.bin/next dev ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  ready=0
  for _ in $(seq 1 60); do [ "$(probe)" != "000" ] && { ready=1; break; }; sleep 1; done
  [ "$ready" = "1" ] || { echo "    ✗ server không sẵn sàng sau 60s"; tail -20 "$SERVER_LOG" | sed 's/^/    /'; exit 1; }
fi

# 3. Login admin.
r=$(curl -s -w $'\n%{http_code}' --max-time 30 -X POST -H "Content-Type: application/json" \
  -c "$JAR_ADMIN" -b "$JAR_ADMIN" -d "{\"identifier\":\"$ADMIN_EMAIL\",\"password\":\"$PW\"}" "$BASE_URL/api/auth/login")
[ "$(printf '%s' "$r" | tail -n1)" = "200" ] || { echo "    ✗ login admin fail"; exit 1; }

PASS=1

# ─────────────── (A) READ LOAD: 50 GET song song ───────────────
echo "  → (A) 50× GET /api/cases?limit=20 song song"
N=50
apids=()
for i in $(seq 1 $N); do
  curl -s -o /dev/null -w '%{http_code} %{time_total}\n' -b "$JAR_ADMIN" --max-time 60 \
    "$BASE_URL/api/cases?limit=20" > "$RES/a_$i" 2>/dev/null &
  apids+=($!)
done
wait "${apids[@]}"   # CHỈ chờ các curl, KHÔNG chờ job `next dev` (bare `wait` sẽ treo vô hạn)
cat "$RES"/a_* > "$RES/a_all"
a2xx=$(awk '$1 ~ /^2/' "$RES/a_all" | wc -l | tr -d ' ')
a4xx=$(awk '$1 ~ /^4/' "$RES/a_all" | wc -l | tr -d ' ')
a5xx=$(awk '$1 ~ /^5/' "$RES/a_all" | wc -l | tr -d ' ')
a500=$(awk '$1=="500"' "$RES/a_all" | wc -l | tr -d ' ')
awk '{print $2}' "$RES/a_all" | sort -n > "$RES/a_times"
cnt=$(wc -l < "$RES/a_times" | tr -d ' ')
amin=$(head -1 "$RES/a_times"); amax=$(tail -1 "$RES/a_times"); amed=$(sed -n "$(((cnt+1)/2))p" "$RES/a_times")
echo "    A: 2xx=$a2xx 4xx=$a4xx 5xx=$a5xx (500=$a500)"
echo "    A latency(s): min=$amin median=$amed max=$amax"
if [ "$a500" -eq 0 ]; then echo "    ✓ A: 0×500"; else echo "    ✗ A: $a500×500 (GET pool-timeout không map 503?)"; PASS=0; fi

# ─────────────── (B) WRITE CONTENTION: 10 PATCH /status song song ───────────────
echo "  → (B) 10× PATCH /status {TRIAGED} song song trên C_STATUS_STAFF (NEW)"
bpids=()
for i in $(seq 1 10); do
  curl -s -o /dev/null -w '%{http_code}\n' -X PATCH -H "Content-Type: application/json" \
    -b "$JAR_ADMIN" --max-time 60 -d '{"status":"TRIAGED"}' \
    "$BASE_URL/api/cases/$C_STATUS_STAFF/status" > "$RES/b_$i" 2>/dev/null &
  bpids+=($!)
done
wait "${bpids[@]}"   # CHỈ chờ các curl, KHÔNG chờ job `next dev`
cat "$RES"/b_* > "$RES/b_all"
b200=$(grep -c '^200' "$RES/b_all" | tr -d ' ')
b409=$(grep -c '^409' "$RES/b_all" | tr -d ' ')
b503=$(grep -c '^503' "$RES/b_all" | tr -d ' ')
b500=$(grep -c '^500' "$RES/b_all" | tr -d ' ')
echo "    contention: ${b200}×200 / ${b409}×409 / ${b503}×503 (500=$b500)"
if [ "$b200" -eq 1 ]; then echo "    ✓ B: đúng 1 winner (optimistic-lock)"; else echo "    ✗ B: $b200×200 (mong 1 — lost-update?)"; PASS=0; fi
if [ "$b500" -eq 0 ]; then echo "    ✓ B: 0×500"; else echo "    ✗ B: $b500×500"; PASS=0; fi

echo ""
if [ "$PASS" -eq 1 ]; then echo "  P9-LOAD: PASS (A 0×500, B 1×200/0×500)"; else echo "  P9-LOAD: FAIL"; fi
[ "$PASS" -eq 1 ]
