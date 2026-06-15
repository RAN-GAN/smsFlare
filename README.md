# 🚀 SMSFlare: Your Self-Hosted SMS Gateway

**SMSFlare** is a professional, edge-powered SMS gateway that turns any Android device into a private SMS distribution node. No third-party carrier APIs, no per-message fees — just your hardware, your SIM cards, and complete infrastructure ownership.

---

## 🏗️ How it Works

1.  **Backend (Edge)**: A Cloudflare Worker manages the message queue, device heartbeats, and API authentication.
2.  **Database (Global)**: Cloudflare D1 (SQLite) stores jobs, logs, and device metadata at the edge.
3.  **Dashboard (Web)**: A Next.js interface for managing devices, monitoring status, and sending messages.
4.  **Android Client**: A native app that polls the backend for assigned jobs and sends them via the device's SIM card.

---

## 📋 Prerequisites

Before you begin, ensure you have:

-   **Cloudflare Account**: [Sign up for free](https://dash.cloudflare.com/sign-up).
-   **Node.js 18+**: For running the setup and local development.
-   **Android Device**: Running Android 8.0+ with an active SIM card.
-   **Domain (Optional)**: If you want a custom domain for your dashboard.

---

## 🚀 One-Click Setup

The included `setup.sh` script automates the entire process — from creating databases to deploying the edge infrastructure.

```bash
git clone https://github.com/yourusername/smsflare.git
cd smsflare
chmod +x setup.sh
./setup.sh
```

### Choose your path:

#### **Option 1: Cloudflare Deployment (Production)**
This is the recommended setup and the **default choice**. It deploys the system to Cloudflare's global network.
1.  Select **Mode 1** (or just press **Enter**) in the setup script.
2.  The script will:
    *   Authenticate with Cloudflare.
    *   Create your **D1 Database**.
    *   Deploy the **Worker Backend**.
    *   Generate a secure **JWT Secret**.
    *   Deploy the **Management Dashboard** to Cloudflare Pages.
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

## 📱 Setting up the Android Client

1.  **Download the App**: You can find the `smsflare.apk` in the root of this project or download it directly from your dashboard's "Start" page once deployed.
2.  **Install**: Sideload the APK onto your Android device.
3.  **Pairing**:
    *   On your Dashboard, go to **Settings** → **Generate Pairing Token**.
    *   Open the SMSFlare app on Android and tap **Scan QR Code**.
    *   Grant the required permissions (**Send SMS**, **Read Phone State**).
4.  **Stay Online**: The app will now start sending heartbeats and checking for jobs.

---

## 🔌 Sending your first SMS

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

## 🛠️ Maintenance & Scaling

### Database Migrations
If you update the schema, apply migrations to production:
```bash
wrangler d1 migrations apply smsflare --env production --remote
```

### Scaling to Multiple Devices
SMSFlare automatically distributes jobs based on device availability and heartbeat recency. Simply repeat the **Pairing** steps for additional Android devices to increase your throughput.

### Monitoring
Check the **Logs** tab in the dashboard for real-time delivery status and device signal/battery history.

---

## 🔒 Security Best Practices

-   **Rotate API Keys**: If a key is compromised, revoke it immediately in the dashboard.
-   **JWT Secret**: The setup script generates a 48-byte random secret. Do not share this or commit it to version control.
-   **Permissions**: The Android app only requires SMS and Phone State permissions. It does not access your contacts or personal data.

---

Built for privacy and performance. **SMSFlare** — Your SIM, your rules.
