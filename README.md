# SMS Flare

A self-hosted SMS gateway that routes messages through Android phones with SIM cards. You own the infrastructure — no per-message fees, no third-party carrier APIs.

## How it works

1. Deploy the backend to Cloudflare Workers
2. Register your Android phones via the web dashboard
3. Send SMS via the dashboard UI or a simple REST API
4. The Android app picks up jobs every 30 seconds and sends them via the device's SIM card

## Stack

- **Backend**: Cloudflare Workers + Hono
- **Database**: Cloudflare D1 (SQLite)
- **Dashboard**: Next.js 14 + Tailwind CSS
- **Android client**: Native polling app (separate project)

---

## Quick start

### Prerequisites

- Node.js 18+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- Wrangler CLI — installed automatically by the setup script if missing

### 1. Run the setup script

```bash
git clone <your-repo-url>
cd smsflare
./setup.sh
```

This does everything in one pass:
- Logs you into Cloudflare
- Creates the D1 database and updates `wrangler.toml`
- Runs all migrations
- Generates a random `JWT_SECRET` and saves it to `.dev.vars`
- Installs dashboard dependencies and creates `dashboard/.env.local`

### 2. Start development servers

```bash
# Terminal 1 — backend (http://localhost:8787)
npm run dev

# Terminal 2 — dashboard (http://localhost:3000)
cd dashboard && npm run dev
```

### 3. Create an account and pair a device

1. Open `http://localhost:3000` and sign up
2. Go to **Settings → Generate Pairing Token**
3. Scan the QR code with the Android app — it encodes the token and API URL together so you don't need to type anything

---

## API

All requests use `Authorization: Bearer <token>`. Three token types are accepted:

| Type | How to get it | Used for |
|---|---|---|
| User JWT | Login via dashboard or `POST /auth/login` | Dashboard sessions (24h expiry) |
| API key | Settings → Create API Key | Programmatic access |
| Device token | Returned by `POST /api/device/register` | Android app only |

### Send an SMS

```bash
curl -X POST http://localhost:8787/api/sms/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Hello from SMS Flare!"}'
```

Response:
```json
{
  "job_id": "abc123def456",
  "status": "assigned",
  "assigned_device": "device_id_here"
}
```

Job status lifecycle: `pending` → `assigned` → `sent` → `delivered` (or `failed`)

### All endpoints

**Auth**
- `POST /auth/register` — create account
- `POST /auth/login` — login, returns JWT
- `POST /auth/device-pair` — generate device pairing token
- `POST /auth/api-keys` — create API key
- `GET  /auth/api-keys` — list API keys

**SMS**
- `POST /api/sms/send` — send SMS (user JWT or API key)
- `GET  /api/jobs` — list jobs (paginated: `?limit=20&offset=0`)
- `GET  /api/jobs/:id` — job details + delivery timeline

**Devices**
- `GET  /api/devices` — list registered devices
- `POST /api/device/register` — register device with pairing token
- `GET  /api/device/jobs` — poll for pending job (Android app)
- `POST /api/device/jobs/:id/status` — report delivery status (Android app)
- `POST /api/device/heartbeat` — device heartbeat (Android app)

**System**
- `GET  /health` — status check, includes `jwt_configured` flag

---

## Deployment

### Backend (Cloudflare Workers)

```bash
# Set the JWT secret
wrangler secret put JWT_SECRET --env production

# Run migrations against the production database
wrangler d1 migrations apply smsflare --env production

# Deploy
npm run deploy
```

### Dashboard (Cloudflare Pages)

```bash
cd dashboard
echo "NEXT_PUBLIC_API_URL=https://your-worker.workers.dev" > .env.local
npm run build
wrangler pages deploy .next/
```

---

## Environment variables

**Backend** — set in `wrangler.toml` (vars) or via `wrangler secret put` (secrets):

| Name | Where | Description |
|---|---|---|
| `JWT_SECRET` | Secret | Signs user JWTs. Required — backend warns on every request if missing. |
| `API_BASE_URL` | Var | Public URL of the deployed Worker |
| `DASHBOARD_URL` | Var | Public URL of the dashboard |

For local dev, put secrets in `.dev.vars` (created automatically by `setup.sh`, gitignored):
```
JWT_SECRET=your-local-secret
```

**Dashboard** — `dashboard/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

---

## Database schema

Six migrations in `migrations/`. Key tables:

- **`users`** — email + SHA-256 password hash
- **`devices`** — registered Android devices; `online` flag updated by heartbeat
- **`api_keys`** — only the SHA-256 hash is stored, never the plaintext key
- **`sms_jobs`** — one row per send request; status tracks delivery lifecycle
- **`sms_logs`** — status change events per job (delivery timeline)
- **`device_heartbeats`** — battery/signal history per device

```bash
# Create a new migration
npm run migrations:create -- <migration-name>

# Check migration status
npm run migrations:status
```

---

## Limitations (MVP)

- Messages capped at 160 characters
- No retries — failed jobs stay `failed`
- No scheduled sends
- No bulk upload
- Device assignment is first-come: the device with the most recent heartbeat gets the job. If it's unreachable, the job stalls as `assigned`.
- Passwords hashed with SHA-256 (Web Crypto API constraint — bcrypt requires Node.js)

## Scaling

The current design handles ~100 active devices comfortably. Each device polls every 30 seconds, so 100 devices = ~200 requests/min — well within Cloudflare Workers free tier.

For 1,000+ devices, replace polling with FCM push notifications or WebSocket via Durable Objects.
