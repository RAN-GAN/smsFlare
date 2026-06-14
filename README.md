# SMS Flare - Distributed SMS Gateway Platform

A cloud-based SMS gateway platform built with Cloudflare Workers, D1 Database, and Next.js.

## Overview

SMS Flare allows you to send SMS messages through Android devices with SIM cards, managed via a web dashboard. The system consists of:

- **Backend**: Cloudflare Workers + Hono (REST API)
- **Database**: Cloudflare D1 (SQLite)
- **Dashboard**: Next.js with Tailwind CSS
- **Mobile**: Capacitor wrapper for responsive web-to-mobile
- **Android Client**: Native polling + SMS sending app (separate project)

## Quick Start

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare account

### Installation

#### 1. Backend Setup

```bash
# Install dependencies
npm install

# Set up wrangler
wrangler login

# Create D1 database
wrangler d1 create smsflare

# Run migrations
wrangler d1 migrations apply smsflare --env production

# Update wrangler.toml with your database ID
```

#### 2. Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8787" > .env.local
```

### Development

#### Terminal 1: Start Backend

```bash
npm run dev
```

Backend runs at `http://localhost:8787`

#### Terminal 2: Start Dashboard

```bash
cd dashboard
npm run dev
```

Dashboard runs at `http://localhost:3000`

## Project Structure

```
smsflare/
├── src/backend/          # Hono API server
│   ├── index.js          # Main app entry
│   ├── middleware/       # Auth middleware
│   └── utils/            # JWT, DB helpers
├── migrations/           # D1 database migrations
├── dashboard/            # Next.js web dashboard
│   ├── app/
│   │   ├── auth/         # Login, signup pages
│   │   ├── dashboard/    # Main dashboard
│   │   ├── send/         # SMS composer
│   │   ├── jobs/         # Job details
│   │   ├── settings/     # API keys, pairing tokens
│   │   └── store/        # Zustand auth store
│   └── lib/              # API client
├── wrangler.toml         # Cloudflare config
└── package.json          # Dependencies
```

## API Endpoints

### Authentication

- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /auth/device-pair` - Generate device pairing token
- `POST /auth/api-keys` - Create API key
- `GET /auth/api-keys` - List API keys

### SMS

- `POST /api/sms/send` - Send SMS (requires user JWT or API key)
- `GET /api/jobs` - List user's SMS jobs
- `GET /api/jobs/:id` - Get job details

### Devices

- `POST /api/device/register` - Register device
- `GET /api/device/jobs` - Get pending jobs (device polling)
- `POST /api/device/jobs/:id/status` - Report delivery status
- `POST /api/device/heartbeat` - Send heartbeat
- `GET /api/devices` - List user's devices

## Usage

### 1. Create Account

Visit `http://localhost:3000` and sign up

### 2. Generate Pairing Token

- Go to Settings
- Click "Generate Pairing Token"
- Copy the token

### 3. Register Android Device

Install the Android app on a device with a SIM card and enter the pairing token to register.

### 4. Send SMS

- Go to Dashboard
- Click "Send SMS"
- Enter recipient phone number and message
- Device will receive job and send SMS

### 5. Use API

Generate an API key in Settings and send SMS programmatically:

```bash
curl -X POST http://localhost:8787/api/sms/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Hello from SMS Flare!"
  }'
```

## Database Schema

### Users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);
```

### Devices

```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_token TEXT UNIQUE NOT NULL,
  device_model TEXT,
  android_version TEXT,
  phone_number TEXT,
  battery_level INTEGER,
  sim_info TEXT,
  online INTEGER,
  last_heartbeat INTEGER,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### SMS Jobs

```sql
CREATE TABLE sms_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT, -- pending, assigned, sent, delivered, failed
  created_at INTEGER,
  assigned_at INTEGER,
  sent_at INTEGER,
  delivered_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

## Deployment

### Backend (Cloudflare Workers)

```bash
npm run deploy
```

### Dashboard (Cloudflare Pages)

```bash
cd dashboard
npm run build
wrangler pages deploy out/
```

## Environment Variables

### Backend (wrangler.toml)

```toml
[env.production.vars]
API_BASE_URL = "https://api.smsflare.com"
DASHBOARD_URL = "https://smsflare.com"
POLLING_INTERVAL = "30"
DEVICE_HEARTBEAT_INTERVAL = "600"
```

Set secret:

```bash
wrangler secret put JWT_SECRET --env production
```

### Dashboard (.env.local)

```
NEXT_PUBLIC_API_URL=https://api.smsflare.com
```

## Development Notes

### Authentication Flow

1. **User Login**: Email + password → JWT token (24h expiry)
2. **Device Registration**: Pairing token → Device token (long-lived)
3. **API Keys**: Generated in dashboard → Bearer token for external systems

### SMS Delivery Flow

1. User sends SMS via dashboard/API
2. Backend creates job with `pending` status
3. Backend finds online device and assigns job
4. Device polls `/api/device/jobs` every 30 seconds
5. Device receives job and sends SMS locally via SmsManager
6. Device reports status back: `sent`, `delivered`, or `failed`
7. Dashboard updates in real-time (polls every 3s)

### Scaling

- **MVP Limit**: ~100 active devices
- **Polling**: Every 30 seconds = ~200 requests/min
- **For 1k+ devices**: Consider FCM push or WebSocket + Durable Objects

## Limitations

- No message retries (failed jobs remain pending)
- No scheduled sends (MVP only)
- No bulk SMS upload (single message only)
- Rate-limited by carrier (typically 1 SMS/sec per SIM)

## Security

- Passwords hashed with SHA-256 (use bcrypt in production)
- JWT tokens with 24h expiry
- API keys are one-time display only
- Device tokens are unique per device
- All communication over HTTPS (required for production)

## Future Enhancements

- [ ] Message retries with exponential backoff
- [ ] Scheduled sends
- [ ] Bulk CSV upload
- [ ] Load balancing across multiple devices
- [ ] FCM push notifications for better efficiency
- [ ] WebSocket for real-time updates
- [ ] Multi-language support
- [ ] Webhook callbacks for delivery events
- [ ] Message templates
- [ ] Analytics and reporting

## Support

For issues and questions, open an issue on GitHub.

## License

MIT
