#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step() { echo -e "\n${BLUE}==> $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo ""
echo "  SMS Flare — Setup & Deploy"
echo "  ==========================="
echo ""
echo "  Choose setup mode:"
echo "    1) Local dev only   — install deps, apply local migrations, run on your machine"
echo "    2) Cloudflare deploy — deploy backend to Workers + dashboard to Pages (Works fully free)"
echo ""
read -rp "  Enter 1 or 2: " MODE
echo ""
case "$MODE" in
  1) ok "Mode: Local dev" ;;
  2) ok "Mode: Cloudflare deploy" ;;
  *) err "Invalid choice. Enter 1 or 2." ;;
esac

# ── 0. Cloudflare credentials (deploy only) ───────────────────────────────────
if [ "$MODE" = "2" ]; then
  # Wrangler picks up CLOUDFLARE_API_TOKEN automatically — no browser login needed.
  # Create a token at: https://dash.cloudflare.com/profile/api-tokens
  # Required permissions: Workers Scripts (Edit), D1 (Edit), Pages (Edit), Account (Read)
  step "Cloudflare credentials"
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    if ! wrangler whoami &>/dev/null 2>&1; then
      echo ""
      echo "  No Cloudflare credentials found. Set CLOUDFLARE_API_TOKEN:"
      echo ""
      echo "    1. Go to https://dash.cloudflare.com/profile/api-tokens"
      echo "    2. Create a token with these permissions:"
      echo "         Workers Scripts — Edit"
      echo "         D1              — Edit"
      echo "         Pages           — Edit"
      echo "         Account         — Read"
      echo "    3. export CLOUDFLARE_API_TOKEN=<your-token>"
      echo "    4. Re-run this script"
      echo ""
      exit 1
    fi
    ok "Using existing wrangler session"
  else
    ok "Using CLOUDFLARE_API_TOKEN"
  fi

  # Auto-detect account ID for commands that need it explicitly
  if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    CLOUDFLARE_ACCOUNT_ID=$(wrangler whoami 2>/dev/null \
      | grep -oP '(?<=Account ID:\s{0,10})\S+' | head -1 || true)
    [ -n "$CLOUDFLARE_ACCOUNT_ID" ] && export CLOUDFLARE_ACCOUNT_ID
  fi
fi

# ── 1. Dependencies ───────────────────────────────────────────────────────────
step "Checking dependencies"
command -v node &>/dev/null || err "Node.js not found. Install Node 18+ from https://nodejs.org"
ok "Node $(node --version)"
command -v npm &>/dev/null  || err "npm not found."
ok "npm $(npm --version)"
if ! command -v wrangler &>/dev/null; then
  warn "Wrangler not found — installing..."
  npm install -g wrangler
fi
ok "Wrangler $(wrangler --version 2>&1 | head -1)"

# ── 2. D1 database (deploy only) ──────────────────────────────────────────────
if [ "$MODE" = "2" ]; then
  step "Setting up D1 database"
  if DB_OUTPUT=$(wrangler d1 create smsflare 2>&1); then
    DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' | head -1)
    if [ -n "$DB_ID" ]; then
      ok "Database created: $DB_ID"
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/database_id = \"[^\"]*\"/database_id = \"$DB_ID\"/g" wrangler.toml
      else
        sed -i "s/database_id = \"[^\"]*\"/database_id = \"$DB_ID\"/g" wrangler.toml
      fi
      ok "wrangler.toml updated"
    fi
  else
    ok "Database already exists — using ID from wrangler.toml"
  fi
fi

# ── 3. Migrations ─────────────────────────────────────────────────────────────
if [ "$MODE" = "1" ]; then
  step "Applying migrations (local)"
  CI=true wrangler d1 migrations apply smsflare && ok "Local migrations applied" \
    || warn "Local migrations skipped"
fi

# ── 4. Migrations (remote) + Worker deploy (deploy only) ──────────────────────
if [ "$MODE" = "2" ]; then
  step "Applying migrations (remote)"
  CI=true wrangler d1 migrations apply smsflare --env production --remote
  ok "Remote migrations applied"

  step "Deploying backend to Cloudflare Workers"
  WORKER_OUTPUT=$(wrangler deploy --env production 2>&1)
  echo "$WORKER_OUTPUT"
  WORKER_URL=$(echo "$WORKER_OUTPUT" | grep -oP 'https://[^\s]+\.workers\.dev' | head -1)
  [ -n "$WORKER_URL" ] || err "Deploy succeeded but could not parse Worker URL. Check output above."
  ok "Worker live: $WORKER_URL"

  step "Setting JWT_SECRET"
  if wrangler secret list --env production 2>/dev/null | grep -q "JWT_SECRET"; then
    ok "JWT_SECRET already set"
  else
    if command -v openssl &>/dev/null; then
      JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n/')
    else
      JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64').replace(/\//g,''))")
    fi
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env production
    ok "JWT_SECRET set"
  fi
fi

# ── 5. Local dev secret ───────────────────────────────────────────────────────
if [ ! -f ".dev.vars" ]; then
  if command -v openssl &>/dev/null; then
    LOCAL_SECRET=$(openssl rand -base64 48 | tr -d '\n/')
  else
    LOCAL_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64').replace(/\//g,''))")
  fi
  printf "JWT_SECRET=%s\n" "$LOCAL_SECRET" > .dev.vars
  ok ".dev.vars created for local dev"
fi

# ── 6. Dashboard setup ────────────────────────────────────────────────────────
step "Setting up dashboard"
cd dashboard
npm install --silent

if [ "$MODE" = "2" ]; then
  echo "NEXT_PUBLIC_API_URL=$WORKER_URL" > .env.production
  ok "Production API URL: $WORKER_URL"
fi

[ ! -f ".env.local" ] && cp .env.example .env.local && ok ".env.local created (http://localhost:8787)"

if [ "$MODE" = "2" ]; then
  NEXT_PUBLIC_API_URL="$WORKER_URL" npm run build
  ok "Dashboard built"
fi

# ── 7. Deploy dashboard to Cloudflare Pages (deploy only) ─────────────────────
if [ "$MODE" = "2" ]; then
  step "Deploying dashboard to Cloudflare Pages"
  PAGES_OUTPUT_FILE=$(mktemp)
  wrangler pages project create smsflare-dashboard --production-branch main 2>/dev/null || true
  wrangler pages deploy --commit-dirty=true 2>&1 | tee "$PAGES_OUTPUT_FILE"
  PAGES_URL=$(grep -oP 'https://smsflare-dashboard\.pages\.dev' "$PAGES_OUTPUT_FILE" | head -1)
  [ -z "$PAGES_URL" ] && PAGES_URL=$(grep -oP 'https://[^\s]+\.pages\.dev' "$PAGES_OUTPUT_FILE" | tail -1)
  rm -f "$PAGES_OUTPUT_FILE"
  [ -n "$PAGES_URL" ] && ok "Dashboard live: $PAGES_URL" \
    || warn "Could not detect Pages URL — check https://dash.cloudflare.com/pages"
fi

cd ..

# ── 8. Set final URLs in wrangler.toml and redeploy (deploy only) ─────────────
if [ "$MODE" = "2" ]; then
  step "Setting API_BASE_URL and DASHBOARD_URL"

  # Update only the [env.production.vars] section, leave staging untouched
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
  ok "API_BASE_URL  → $WORKER_URL"
  [ -n "${PAGES_URL:-}" ] && ok "DASHBOARD_URL → $PAGES_URL"

  # Deploy with --var flags as well — guarantees values are live even if toml parse differs
  DEPLOY_ARGS=(--env production --var "API_BASE_URL:$WORKER_URL")
  [ -n "${PAGES_URL:-}" ] && DEPLOY_ARGS+=(--var "DASHBOARD_URL:$PAGES_URL")
  wrangler deploy "${DEPLOY_ARGS[@]}" 2>&1 | tail -3
  ok "Worker live with API_BASE_URL and DASHBOARD_URL set"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  All done!${NC}"
echo ""

if [ "$MODE" = "2" ]; then
  echo "  Production:"
  echo "    Backend:   $WORKER_URL"
  [ -n "${PAGES_URL:-}" ] && echo "    Dashboard: $PAGES_URL"
  echo ""
fi

echo "  Local dev (two terminals):"
echo "    npm run dev"
echo "    cd dashboard && npm run dev"
echo ""
[ "$MODE" = "2" ] && echo "  Health check: curl $WORKER_URL/health" && echo ""
