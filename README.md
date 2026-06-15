# SMSFlare: Private, Self-Hosted SMS Gateway

**SMSFlare** is a professional, edge-powered SMS gateway that transforms your Android devices into a private SMS distribution network. Unlike commercial providers, SMSFlare is **entirely self-hosted**—your messages never pass through a third-party server. You own the hardware, the SIM cards, and the entire data pipeline.

---

## Why SMSFlare?

- **Absolute Privacy**: Your messages are stored only in your own private Cloudflare D1 database. No third party (including us) can ever read your communications.
- **Zero Middlemen**: Route messages directly from your API to your phone. No carrier APIs, no intermediate aggregators, and no hidden data harvesting.
- **Full Infrastructure Ownership**: You deploy the backend to your own Cloudflare account. You have 100% control over the logs, the retention, and the access.
- **Zero Per-Message Fees**: Pay only for your phone plan. Stop paying "convenience" fees to gateway providers for every single text you send.

---

## Key Features

- **Multi-Device Support**: Connect an unlimited number of Android phones to your private backend to increase throughput.
- **Smart Job Distribution**: Messages are automatically routed to the most recently active and available device in your fleet.
- **Real-Time Telemetry**: Monitor battery levels, signal strength (RSSI), and carrier information for every connected device.
- **API-First Design**: Seamlessly integrate private SMS sending into your existing applications with a simple REST API.
- **Secure QR Pairing**: Instantly provision new devices by scanning a secure QR code from your dashboard.
- **Detailed Delivery Logs**: Track the full lifecycle of every message with a detailed event timeline that you control.
- **Edge Performance**: Powered by Cloudflare Workers and D1 for ultra-low latency and global availability on your own account.
- **Native Android Client**: Built with Kotlin for reliability, featuring background persistence and automatic recovery.

---

## How it Works

1.  **Your Backend (Edge)**: A Cloudflare Worker (in your account) manages the message queue, device heartbeats, and API authentication.
2.  **Your Database (Global)**: Cloudflare D1 (SQLite) stores jobs, logs, and device metadata securely on your infrastructure.
3.  **Your Dashboard (Web)**: A Next.js interface for managing devices, monitoring status, and sending messages.
4.  **Your Android Client**: A native app that polls your backend for assigned jobs and sends them via the device's SIM card.

---

## Prerequisites

Before you begin, ensure you have:

-   **Cloudflare Account**: [Sign up for free](https://dash.cloudflare.com/sign-up).
-   **Node.js 18+**: For running the setup and local development.
-   **Android Device**: Running Android 8.0+ with an active SIM card.
-   **Domain (Optional)**: If you want a custom domain for your dashboard.

---

## One-Click Setup

The included `setup.sh` script automates the entire process — from creating databases to deploying the edge infrastructure to your own account.

```bash
git clone https://github.com/RAN-GAN/smsFlare.git
cd smsFlare
chmod +x setup.sh
./setup.sh
```

### Choose your path:

#### **Option 1: Cloudflare Deployment (Production)**
This is the recommended setup and the **default choice**. It deploys the system to **your** Cloudflare global network.
1.  Select **Mode 1** (or just press **Enter**) in the setup script.
2.  The script will:
    *   Authenticate with Cloudflare.
    *   Create **your** D1 Database.
    *   Deploy **your** Worker Backend.
    *   Generate a secure **JWT Secret**.
    *   Deploy **your** Management Dashboard to Cloudflare Pages.
3.  Once finished, you will receive your live **Dashboard URL**.

#### **Option 2: Local Development**
Ideal for testing or modification.
1.  Select **Mode 2** in the setup script.
2.  Start the servers:
    ```bash
    # Terminal 1: Backend
    npm run dev
    # Terminal 2: Dashboard
    cd dashboard && npm run dev
    ```
3.  Access the UI at `http://localhost:3000`.

---

## Scaling with Multiple Devices

SMSFlare is designed to scale horizontally. You can add as many Android devices as you need to handle high volumes of SMS.

1.  **Install the App**: Sideload `smsflare.apk` onto each Android device.
2.  **Generate Pairing Token**: In your Dashboard, go to **Settings** → **Generate Pairing Token**.
3.  **Pair Each Device**: Scan the QR code on every phone. Each device will register with a unique ID.
4.  **Automatic Balancing**: When you send an SMS via the API, your backend automatically identifies all online devices and assigns the job to the one that checked in most recently.

This allows you to distribute load across different carriers or physical locations easily, all while keeping data within your control.

---

## Sending your first SMS

Once your device is online (indicated by a green status in the dashboard), you can send messages via the UI or the REST API.

### Using the REST API
Generate an **API Key** in your dashboard settings, then use it as a Bearer token:

```bash
curl -X POST https://your-worker.workers.dev/api/sms/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Hello from my private SMSFlare gateway!"
  }'
```

---

## Maintenance & Monitoring

### Database Migrations
If you update the schema, apply migrations to production:
```bash
wrangler d1 migrations apply smsflare --env production --remote
```

### Monitoring Health
- **Dashboard**: View real-time status, battery, and signal for all devices.
- **Logs**: Check the **Logs** tab in the dashboard for real-time delivery status and device history.
- **API**: Use `GET /api/jobs` and `GET /api/devices` to monitor your infrastructure programmatically.

---

## Security Best Practices

-   **Rotate API Keys**: If a key is compromised, revoke it immediately in the dashboard.
-   **JWT Secret**: The setup script generates a 48-byte random secret. Do not share this or commit it to version control.
-   **Permissions**: The Android app only requires SMS and Phone State permissions. It does not access your contacts or personal data.

---

Built for absolute privacy and performance. **SMSFlare** — Your SIM, your rules.
