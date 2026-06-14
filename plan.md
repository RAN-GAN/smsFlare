# smsFlare Implementation Plan

**Last Updated**: May 13, 2026  
**Status**: Ready for implementation  
**Stack**: Cloudflare Workers + D1 + Next.js Pages + Capacitor + Android

---

## Overview

Build a distributed SMS gateway platform where:
- Users authenticate on a Next.js dashboard
- Devices (Android phones with SIM cards) register and poll for SMS jobs
- Backend assigns pending jobs to online devices
- Devices send SMS locally via SmsManager, report status back
- Dashboard displays real-time delivery status

**Tech Stack**:
- **Backend**: Cloudflare Workers + Hono (lightweight REST router)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Next.js 14+ deployed on Cloudflare Pages
- **Mobile**: Capacitor wrapping Next.js (single responsive codebase)
- **Android App**: Native polling + SMS client
- **Deployment**: wrangler CLI

**MVP Scope**: Core SMS send only (no bulk CSV, no scheduling, no retries)

---

## Implementation Phases

### **Phase 1: Database & Infrastructure** (3 steps)

**1.1 Design D1 Schema**
- Create tables: `users`, `devices`, `api_keys`, `sms_jobs`, `sms_logs`, `device_heartbeats`
- Define primary keys, foreign keys, indices for polling queries
- Path: `src/database/schema.sql`

**1.2 Create wrangler Project**
- `wrangler init smsflare`
- Configure `wrangler.toml` with D1 binding, environment variables
- Path: `wrangler.toml`, `package.json`

**1.3 Write D1 Migrations**
- Use `wrangler migrations create` for each table
- Path: `migrations/XXXX_create_*.sql`

---

### **Phase 2: Backend API (Hono + Workers)** (6 steps)

**2.1 Scaffold Hono App**
- Initialize Hono project in Workers
- Add middleware: CORS, JSON parsing, error handling, logging
- Path: `src/backend/index.ts`

**2.2 Implement Auth Middleware**
- JWT validation, device token validation, API key validation
- Path: `src/backend/middleware/auth.ts`

**2.3 Implement Auth Routes**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/device-pair`
- `POST /api/device/register`
- Path: `src/backend/routes/auth.ts`

**2.4 Implement SMS Send Routes**
- `POST /api/sms/send` (authenticated user sends SMS)
- Create job with status `pending`, assign to online device
- Path: `src/backend/routes/sms.ts`

**2.5 Implement Device Polling Routes**
- `GET /api/device/jobs` (device requests work)
- `POST /api/device/jobs/:id/status` (device reports delivery)
- Path: `src/backend/routes/device-polling.ts`

**2.6 Implement Device Management Routes**
- `POST /api/device/register`, `POST /api/device/heartbeat`, `GET /api/devices`
- Path: `src/backend/routes/devices.ts`

**2.7 Implement Dashboard API Routes**
- `GET /api/jobs`, `GET /api/jobs/:id`, `GET /api/devices`
- Path: `src/backend/routes/dashboard.ts`

---

### **Phase 3: Frontend Dashboard (Next.js + Tailwind)** (6 steps)

**3.1 Create Next.js Project**
- `npx create-next-app@14 dashboard`
- Install: `tailwindcss`, `shadcn/ui`, `axios`, `zustand`, `js-cookie`
- Path: `dashboard/`

**3.2 Implement Auth UI**
- Login, signup, API key generation pages
- Path: `dashboard/app/auth/`, `dashboard/components/AuthContext.tsx`

**3.3 Implement SMS Compose Form**
- `dashboard/app/send/page.tsx` — SMS compose UI
- Recipient input, message preview, send button
- Path: `dashboard/components/SendSMS.tsx`

**3.4 Implement Job List & Status Dashboard**
- `dashboard/app/dashboard/page.tsx` — main dashboard
- Job table with status badges, device list
- Path: `dashboard/components/JobList.tsx`, `dashboard/components/DeviceList.tsx`

**3.5 Implement Job Detail View**
- `dashboard/app/jobs/[id]/page.tsx` — full job details
- Real-time status polling (refresh every 3s)

**3.6 Configure for Mobile + Capacitor**
- Ensure responsive layout (mobile-first)
- Add viewport meta tags, safe-area support

---

### **Phase 4: Mobile Wrapper (Capacitor)** (2 steps)

**4.1 Create Capacitor Project**
- `npx cap init smsflare`
- Point source to Next.js build output
- Configure `capacitor.config.ts`
- Path: `capacitor.config.ts`

**4.2 Add Mobile Permissions & Build**
- Request: CAMERA, INTERNET, READ_PHONE_STATE
- Setup iOS + Android
- Build: `npm run build && npx cap build android/ios`

---

### **Phase 5: Android Polling Client** (4 steps)

**5.1 Create Android Project**
- New Android Studio project (Kotlin)
- Setup Retrofit + OkHttp
- Configure AndroidManifest.xml
- Path: `android-app/`

**5.2 Implement Device Registration & Polling**
- `DeviceRepository` — register, poll
- `JobPoller` — background polling (30s interval) via WorkManager
- Path: `android-app/app/src/main/java/com/smsflare/polling/`

**5.3 Implement SMS Sending**
- `SmsSender` — Android SmsManager
- `JobWorker` — process jobs from local DB
- Path: `android-app/app/src/main/java/com/smsflare/sms/`

**5.4 Implement Status Reporting & Heartbeats**
- `StatusReporter` — POST delivery status with retry
- `HeartbeatSender` — periodic heartbeat (every 5–10 min)
- Path: `android-app/app/src/main/java/com/smsflare/reporting/`

---

### **Phase 6: Integration & Deployment** (3 steps)

**6.1 Local Development Setup**
- Start Workers: `wrangler dev --local`
- Start Dashboard: `npm run dev` in `dashboard/`
- Start Android emulator
- E2E test

**6.2 Configure Production Deployment**
- Workers: `wrangler deploy`
- Dashboard: auto-deploy via Pages on commit
- D1 migrations: run before deployment
- Path: `wrangler.toml`, env files

**6.3 E2E Testing & Verification**
- Manual E2E test checklist
- Failure scenarios
- Load testing (optional)

---

## File Structure
