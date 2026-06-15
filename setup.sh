#!/usr/bin/env bash
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[1;31m'
GRN='\033[1;32m'
YLW='\033[1;33m'
BLU='\033[1;36m'
GRY='\033[0;37m'
BLD='\033[1m'
NC='\033[0m'

# ── Spinner ───────────────────────────────────────────────────────────────────
_SP_PID=""
_SP_MSG=""

_spin_bg() {
  local chars i=0
  chars=('-' '\' '|' '/')
  while true; do
    printf "\r  [%s] %s " "${chars[$((i++ % 4))]}" "$1"
    sleep 0.09
  done
}

sp_start() {
  _SP_MSG="$1"
  _spin_bg "$_SP_MSG" &
  _SP_PID=$!
  disown "$_SP_PID" 2>/dev/null || true
}

sp_stop() {
  if [ -n "$_SP_PID" ]; then
    kill "$_SP_PID" 2>/dev/null || true
    wait "$_SP_PID" 2>/dev/null || true
    _SP_PID=""
  fi
  printf "\r\033[K"
}

_LOG=$(mktemp /tmp/smsflare.XXXXXX)
trap 'sp_stop; rm -f "$_LOG"' EXIT

# ── Print helpers ─────────────────────────────────────────────────────────────
ok()   { sp_stop; printf "  ${GRN}ok${NC}    ${BLD}%s${NC}\n"   "$1"; }
skip() { sp_stop; printf "  ${YLW}skip${NC}  %s\n"            "$1"; }
info() {          printf "        ${GRY}%s${NC}\n"             "$1"; }
fail() { sp_stop; printf "  ${RED}fail${NC}  ${BLD}%s${NC}\n\n" "$1"; exit 1; }

divider() { printf "  "; printf '─%.0s' {1..50}; printf "\n"; }

section() {
  printf "\n  ${BLD}${BLU}%s${NC}\n" "$1"
  printf "  "; printf '─%.0s' {1..50}; printf "\n\n"
}

# ── Command wrappers ──────────────────────────────────────────────────────────
# Captures stdout+stderr of last run/try_run into $_OUT
_OUT=""

# run LABEL CMD... — spinner, silent, ok on success, print log + exit on failure
run() {
  local label="$1"; shift
  sp_start "$label"
  local rc=0
  "$@" >"$_LOG" 2>&1 || rc=$?
  _OUT=$(cat "$_LOG")
  if [ "$rc" -eq 0 ]; then
    ok "$label"
  else
    sp_stop
    printf "  ${RED}fail${NC}  %s (exit %d)\n\n" "$label" "$rc"
    sed 's/^/    /' "$_LOG" | head -60
    printf "\n"
    exit "$rc"
  fi
}

# try_run LABEL CMD... — like run but returns rc, no exit on failure
try_run() {
  local label="$1"; shift
  sp_start "$label"
  local rc=0
  "$@" >"$_LOG" 2>&1 || rc=$?
  sp_stop
  _OUT=$(cat "$_LOG")
  return "$rc"
}

# ── Header ────────────────────────────────────────────────────────────────────
printf "\n"
printf "  ${BLD}SMS Flare${NC}  —  setup & deploy\n"
divider
printf "\n"
printf "  Choose a mode:\n\n"
printf "    ${BLD}1${NC}  Local development  — run backend and dashboard on this machine\n"
printf "    ${BLD}2${NC}  Cloudflare deploy  — Workers (backend) + D1 (database) + Pages (dashboard)\n"
printf "\n"
read -rp "  Mode (1 or 2): " MODE
printf "\n"

case "$MODE" in
  1) printf "  ${GRY}Local development mode${NC}\n" ;;
  2) printf "  ${GRY}Cloudflare deployment mode${NC}\n" ;;
  *) fail "Invalid choice — enter 1 or 2" ;;
esac

# ── Credentials (deploy only) ─────────────────────────────────────────────────
if [ "$MODE" = "2" ]; then
  section "Cloudflare credentials"

  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    if ! wrangler whoami &>/dev/null 2>&1; then
      printf "\n  No Cloudflare credentials found.\n\n"
      printf "  Create an API token at:\n"
      printf "    dash.cloudflare.com/profile/api-tokens\n\n"
      printf "  Required permissions:\n"
      printf "    Workers Scripts  Edit\n"
      printf "    D1               Edit\n"
      printf "    Pages            Edit\n"
      printf "    Account          Read\n\n"
      printf "  Then re-run:\n"
      printf "    export CLOUDFLARE_API_TOKEN=<token> && bash setup.sh\n\n"
      exit 1
    fi
    ok "Authenticated via wrangler session"
  else
    ok "Authenticated via CLOUDFLARE_API_TOKEN"
  fi

  # Resolve account ID if not already set
  if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    CLOUDFLARE_ACCOUNT_ID=$(wrangler whoami 2>/dev/null \
      | grep -oP '(?<=Account ID:\s{0,10})\S+' | head -1 || true)
    [ -n "$CLOUDFLARE_ACCOUNT_ID" ] && export CLOUDFLARE_ACCOUNT_ID
  fi
fi

# ── Dependencies ──────────────────────────────────────────────────────────────
section "Dependencies"

command -v node &>/dev/null || fail "Node.js not found — install from nodejs.org"
ok "Node $(node --version)"

command -v npm &>/dev/null || fail "npm not found"
ok "npm $(npm --version)"

if ! command -v wrangler &>/dev/null; then
  run "Installing Wrangler CLI" npm install -g wrangler
else
  ok "Wrangler $(wrangler --version 2>&1 | head -1)"
fi

run "Installing backend dependencies" npm install --silent --progress=false

# ── Database (deploy only) ────────────────────────────────────────────────────
WORKER_URL=""
PAGES_URL=""

if [ "$MODE" = "2" ]; then
  section "Database"

  if try_run "Creating D1 database" wrangler d1 create smsflare; then
    DB_ID=$(printf '%s' "$_OUT" | grep -oP 'database_id = "\K[^"]+' | head -1)
    if [ -n "$DB_ID" ]; then
      ok "Database created"
      info "$DB_ID"
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/database_id = \"[^\"]*\"/database_id = \"$DB_ID\"/g" wrangler.toml
      else
        sed -i "s/database_id = \"[^\"]*\"/database_id = \"$DB_ID\"/g" wrangler.toml
      fi
      ok "wrangler.toml updated"
    fi
  else
    # Database already exists — verify we have its ID in wrangler.toml
    EXISTING_DB_ID=$(grep 'database_id' wrangler.toml | head -1 \
      | grep -oP '"[a-f0-9-]{36}"' | tr -d '"' || true)
    if [ -n "$EXISTING_DB_ID" ]; then
      skip "Database already exists"
      info "$EXISTING_DB_ID"
    else
      printf "  ${RED}fail${NC}  Database exists but no ID in wrangler.toml\n"
      printf "        Run: wrangler d1 list\n"
      printf "        Then add the database_id to wrangler.toml manually.\n\n"
      exit 1
    fi
  fi
fi

# ── Migrations ────────────────────────────────────────────────────────────────
section "Migrations"

if [ "$MODE" = "1" ]; then
  run "Applying local migrations" \
    env CI=true wrangler d1 migrations apply smsflare
fi

if [ "$MODE" = "2" ]; then
  run "Applying migrations" \
    env CI=true wrangler d1 migrations apply smsflare --env production --remote
fi

# ── Backend deploy (deploy only) ──────────────────────────────────────────────
if [ "$MODE" = "2" ]; then
  section "Backend"

  run "Deploying to Cloudflare Workers" wrangler deploy --env production
  WORKER_URL=$(printf '%s' "$_OUT" | grep -oP 'https://[^\s]+\.workers\.dev' | head -1)
  if [ -z "$WORKER_URL" ]; then
    fail "Worker deployed but could not parse URL — check your Workers dashboard"
  fi
  info "$WORKER_URL"

  # ── JWT secret ────────────────────────────────────────────────────────────
  section "Secrets"

  sp_start "Checking existing secrets"
  SECRET_LIST=$(wrangler secret list --env production 2>/dev/null || true)
  sp_stop

  if printf '%s' "$SECRET_LIST" | grep -q "JWT_SECRET"; then
    skip "JWT_SECRET already configured"
  else
    if command -v openssl &>/dev/null; then
      JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n/')
    else
      JWT_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64').replace(/\//g,''))")
    fi
    sp_start "Setting JWT_SECRET"
    printf '%s\n' "$JWT_SECRET" | \
      wrangler secret put JWT_SECRET --env production >"$_LOG" 2>&1 || {
        sp_stop
        printf "  ${RED}fail${NC}  Setting JWT_SECRET\n\n"
        sed 's/^/    /' "$_LOG" | head -30
        exit 1
      }
    ok "JWT_SECRET set"
  fi
fi

# ── Local dev secret ──────────────────────────────────────────────────────────
if [ ! -f ".dev.vars" ]; then
  if command -v openssl &>/dev/null; then
    LOCAL_SECRET=$(openssl rand -base64 48 | tr -d '\n/')
  else
    LOCAL_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64').replace(/\//g,''))")
  fi
  printf "JWT_SECRET=%s\n" "$LOCAL_SECRET" > .dev.vars
  ok ".dev.vars created"
else
  skip ".dev.vars already exists"
fi

# ── Dashboard setup ───────────────────────────────────────────────────────────
section "Dashboard"

cd dashboard

run "Installing dashboard dependencies" npm install --silent --progress=false

if [ "$MODE" = "2" ]; then
  printf "NEXT_PUBLIC_API_URL=%s\n" "$WORKER_URL" > .env.production
  ok ".env.production written"
fi

if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  ok ".env.local created"
else
  skip ".env.local already exists"
fi

if [ "$MODE" = "2" ]; then
  run "Building dashboard" env "NEXT_PUBLIC_API_URL=$WORKER_URL" npm run build
fi

# ── Pages deploy (deploy only) ────────────────────────────────────────────────
if [ "$MODE" = "2" ]; then
  section "Dashboard deployment"

  # Create Pages project — ignore failure if it already exists
  sp_start "Creating Pages project"
  CREATE_OUT=$(wrangler pages project create smsflare-dashboard \
    --production-branch main 2>&1 || true)
  sp_stop
  if printf '%s' "$CREATE_OUT" | grep -qi "already exists\|already been created"; then
    skip "Pages project already exists"
  else
    ok "Pages project created"
  fi

  run "Deploying dashboard to Pages" \
    wrangler pages deploy out --commit-dirty=true

  PAGES_URL=$(printf '%s' "$_OUT" | grep -oP 'https://[^\s]+\.pages\.dev' | tail -1)
  if [ -n "$PAGES_URL" ]; then
    info "$PAGES_URL"
  else
    printf "  ${YLW}skip${NC}  Could not detect Pages URL\n"
    printf "        Check: dash.cloudflare.com → Pages\n"
  fi
fi

cd ..

# ── Update wrangler.toml with live URLs and redeploy (deploy only) ────────────
if [ "$MODE" = "2" ] && [ -n "$WORKER_URL" ]; then
  section "Finalizing"

  API_URL="$WORKER_URL" DASH_URL="${PAGES_URL:-}" node -e '
    const fs = require("fs");
    const apiUrl  = process.env.API_URL;
    const dashUrl = process.env.DASH_URL;
    let t = fs.readFileSync("wrangler.toml", "utf8");
    const stagingIdx = t.indexOf("[env.staging");
    const head = stagingIdx > -1 ? t.slice(0, stagingIdx) : t;
    const tail = stagingIdx > -1 ? t.slice(stagingIdx) : "";
    const updated = head
      .replace(/^API_BASE_URL = .*/m,  "API_BASE_URL = \"" + apiUrl  + "\"")
      .replace(/^DASHBOARD_URL = .*/m, "DASHBOARD_URL = \""+ dashUrl + "\"");
    fs.writeFileSync("wrangler.toml", updated + tail);
  '
  ok "wrangler.toml updated with live URLs"

  DEPLOY_ARGS=(--env production --var "API_BASE_URL:$WORKER_URL")
  [ -n "${PAGES_URL:-}" ] && DEPLOY_ARGS+=(--var "DASHBOARD_URL:$PAGES_URL")
  run "Redeploying backend with live URLs" wrangler deploy "${DEPLOY_ARGS[@]}"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
printf "\n"
divider

if [ "$MODE" = "2" ]; then
  printf "\n  ${GRN}${BLD}Deployment complete${NC}\n\n"
  divider
  printf "\n"
  if [ -n "${PAGES_URL:-}" ]; then
    printf "  ${BLD}Dashboard${NC}   ${GRN}%s${NC}\n" "$PAGES_URL"
  fi
  printf "  ${BLD}API${NC}         ${GRY}%s${NC}\n" "$WORKER_URL"
  printf "  ${BLD}Health${NC}      ${GRY}%s/health${NC}\n" "$WORKER_URL"
  printf "\n"
  divider
  printf "\n"
  if [ -n "${PAGES_URL:-}" ]; then
    printf "  Open your dashboard and complete the one-time setup:\n"
    printf "  %s\n" "$PAGES_URL"
  else
    printf "  Open your Cloudflare Pages dashboard to find your URL.\n"
  fi
  printf "\n"
  divider
else
  printf "\n  ${GRN}${BLD}Ready for local development${NC}\n\n"
  divider
  printf "\n"
  printf "  Start in two terminals:\n\n"
  printf "    ${BLD}npm run dev${NC}                    ${GRY}backend   — http://localhost:8787${NC}\n"
  printf "    ${BLD}cd dashboard && npm run dev${NC}    ${GRY}dashboard — http://localhost:3000${NC}\n"
  printf "\n"
  divider
  printf "\n"
  printf "  Open: ${GRN}http://localhost:3000${NC}\n"
  printf "\n"
  divider
fi
printf "\n"
