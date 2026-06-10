#!/usr/bin/env bash
# scripts/test-p8.sh — CI-MIRROR tĩnh + secret guard + drift guard cho P8 (KHÔNG cần DB/server).
#
# MIRROR: .github/workflows/ci.yml — mọi lệnh CI then-chốt phải khớp (DRIFT GUARD dưới khẳng định).
#   Sửa ci.yml ⇒ sửa script này (và ngược lại), nếu không drift-guard sẽ FAIL.
# Đây là SUPERSET các check STATIC của CI → KHÔNG chạy qua `test-all.sh p8` (tránh double build).
# Phase p3–p7 cần DB sống + next dev nên KHÔNG nằm ở đây (CI chỉ gate static).
#
# ENV ở đây là GIẢ (khớp ci.yml): đủ để generate/validate/build OFFLINE — đã kiểm chứng không có
#   side-effect connect/throw lúc import (prisma pool lazy; jwt validate trong hàm). KHÔNG kết nối DB.
#
# HERMETIC: bước build TẠM ẨN web/.env + web/.env.local (chỉ tồn tại ở máy dev, KHÔNG có trên CI)
#   để mirror ĐÚNG môi trường CI — build chỉ thấy ENV giả như runner. Trap + self-heal khôi phục kể
#   cả khi bị kill. ⚠ DƯ ĐỊA chưa phủ: script chạy bằng Node của MÁY (local 24), CI chạy Node 22 —
#   chênh major có thể lộ lỗi chỉ-trên-CI mà mirror này KHÔNG bắt (engines>=20 pin để giảm rủi ro).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB="$ROOT/web"
CI_YML="$ROOT/.github/workflows/ci.yml"
VERCEL_JSON="$WEB/vercel.json"

# ENV GIẢ — phải khớp .github/workflows/ci.yml.
export DATABASE_URL='postgresql://u:p@localhost:5432/db'
export DIRECT_URL='postgresql://u:p@localhost:5432/db'
export JWT_SECRET='ci-fake-secret-at-least-32-characters-0000'

PASS=0; FAIL=0
ok() { echo "    ✓ $1"; PASS=$((PASS+1)); }
no() { echo "    ✗ $1"; FAIL=$((FAIL+1)); }

cd "$WEB" || { echo "    ✗ không vào được $WEB"; exit 1; }

# HERMETIC env-hiding: ẩn web/.env + web/.env.local quanh bước build (CI không có 2 file này).
HIDE_ENVS=("$WEB/.env.local" "$WEB/.env")
BAK=".p8hermetic.bak"
restore_envs() { local f; for f in "${HIDE_ENVS[@]}"; do [ -f "$f$BAK" ] && mv -f "$f$BAK" "$f"; done; }
hide_envs()    { local f; for f in "${HIDE_ENVS[@]}"; do [ -f "$f" ] && mv -f "$f" "$f$BAK"; done; }
# Self-heal: lần chạy trước bị kill giữa chừng (bak còn, bản gốc mất) → khôi phục trước khi bắt đầu.
for f in "${HIDE_ENVS[@]}"; do [ -f "$f$BAK" ] && [ ! -f "$f" ] && mv -f "$f$BAK" "$f"; done
trap 'restore_envs' EXIT INT TERM   # lưới an toàn — luồng thường vẫn restore tường minh sau build.

# ───────────────────────── 1. SECRET GUARD ─────────────────────────
echo "  → SECRET GUARD (BỔ TRỢ, KHÔNG phải bằng chứng tuyệt đối — grep-based:"
echo "     có thể bỏ sót secret encode/split/nhúng gián tiếp qua file khác)"

# Pattern file env: .env hoặc .env.* (KHÔNG match foo.env, .environment…); loại *.example.
ENV_RE='(^|/)\.env($|\..*$)'
tracked_env="$(git -C "$ROOT" ls-files | grep -E "$ENV_RE" | grep -vE '\.example$' || true)"
if [ -z "$tracked_env" ]; then
  ok "không track file .env/.env.* (chỉ *.example được phép)"
else
  no "TRACK file env nhạy cảm: $(printf '%s ' $tracked_env)"
fi

# .env.local & students.json (PII) PHẢI bị gitignore.
if git -C "$ROOT" check-ignore -q web/.env.local; then ok "web/.env.local bị gitignore"; else no "web/.env.local KHÔNG bị gitignore"; fi
if git -C "$ROOT" check-ignore -q docs/data/students.json; then ok "docs/data/students.json bị gitignore"; else no "docs/data/students.json KHÔNG bị gitignore"; fi

# Quét connection-string THẬT trong config shippable: env(không-example) + .github/workflows/*.yml + web/vercel.json.
# THẬT = host ∉ {localhost,127.0.0.1} VÀ pass ≠ 'p' VÀ không phải placeholder ([..]/<..>). KHÔNG quét *.md.
scan_files=()
while IFS= read -r f; do [ -n "$f" ] && scan_files+=("$ROOT/$f"); done < <(git -C "$ROOT" ls-files | grep -E "$ENV_RE" | grep -vE '\.example$' || true)
for f in "$CI_YML" "$VERCEL_JSON"; do [ -f "$f" ] && scan_files+=("$f"); done
while IFS= read -r f; do
  [ -z "$f" ] && continue
  fp="$ROOT/$f"; [ "$fp" = "$CI_YML" ] && continue
  [ -f "$fp" ] && scan_files+=("$fp")
done < <(git -C "$ROOT" ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml' 2>/dev/null || true)

if [ "${#scan_files[@]}" -eq 0 ]; then
  ok "không có file config để quét conn-string"
elif node -e '
const fs=require("fs");
const allow=new Set(["localhost","127.0.0.1"]);
const re=/postgres(?:ql)?:\/\/[^:\/@\s\x22\x27]+:([^@\/\s\x22\x27]+)@([^:\/\s\x22\x27]+)/g;
let leak=[];
for(const f of process.argv.slice(1)){
  let t; try{t=fs.readFileSync(f,"utf8")}catch(e){continue}
  let m;
  while((m=re.exec(t))!==null){
    const pass=m[1], host=m[2];
    const ph=/[\[\]<>]/.test(pass)||/[\[\]<>]/.test(host);
    if(!ph && !allow.has(host) && pass!=="p") leak.push(host);
  }
}
if(leak.length){console.error("conn-string thật → host(s): "+leak.join(", "));process.exit(1)}
' "${scan_files[@]}"; then
  ok "không thấy connection-string thật trong config track"
else
  no "PHÁT HIỆN connection-string nghi thật (xem dòng trên)"
fi

# DEPLOY-MODEL guard: ci.yml & vercel.json KHÔNG được chứa 'migrate deploy'.
dm_files=()
for f in "$CI_YML" "$VERCEL_JSON"; do [ -f "$f" ] && dm_files+=("$f"); done
if [ "${#dm_files[@]}" -gt 0 ] && grep -q 'migrate deploy' "${dm_files[@]}" 2>/dev/null; then
  no "ci.yml/vercel.json CHỨA 'migrate deploy' (vi phạm deploy model)"
else
  ok "ci.yml/vercel.json KHÔNG chứa 'migrate deploy'"
fi

# ───────────────────────── 2. DRIFT GUARD ─────────────────────────
echo "  → DRIFT GUARD (ci.yml phải chứa mọi lệnh CI — đồng bộ với script này)"
if [ ! -f "$CI_YML" ]; then
  no "thiếu .github/workflows/ci.yml"
else
  drift_missing=""
  for tok in "npm ci" "prisma generate" "eslint --max-warnings 0" "tsc --noEmit" "prisma validate" "npm run build" "node-version: 22"; do
    grep -qF "$tok" "$CI_YML" || drift_missing="$drift_missing | $tok"
  done
  [ -z "$drift_missing" ] && ok "ci.yml chứa đủ lệnh CI (no drift)" || no "ci.yml THIẾU:$drift_missing"
fi

# ───────────────────────── 3. CI-MIRROR (static) ─────────────────────────
echo "  → CI-MIRROR (ENV giả; npm ci-sync → generate → lint → tsc → validate → build hermetic)"
LOG="$(mktemp)"
run_step() { # NAME CMD...
  local name="$1"; shift
  if "$@" >"$LOG" 2>&1; then
    ok "$name"
  else
    no "$name"; echo "      --- 20 dòng cuối ---"; tail -20 "$LOG" | sed 's/^/      /'
  fi
}
# Lockfile sync: bắt drift package.json↔package-lock (CI dùng `npm ci`); --dry-run KHÔNG ghi node_modules.
run_step "npm ci sync (package.json↔lock)" npm ci --dry-run
# Build chạy HERMETIC: ẩn .env/.env.local để chỉ còn ENV giả (đúng như runner CI).
hide_envs
run_step "prisma generate"             npx --no-install prisma generate
run_step "eslint --max-warnings 0"     npx --no-install eslint --max-warnings 0
run_step "tsc --noEmit"                npx --no-install tsc --noEmit
run_step "prisma validate"             npx --no-install prisma validate
run_step "npm run build (next build, hermetic)"  npm run build
restore_envs   # khôi phục tường minh (trap là lưới dự phòng nếu bị kill trước dòng này)
rm -f "$LOG"

# ───────────────────────── Tổng kết ─────────────────────────
echo ""
echo "  P8: PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
