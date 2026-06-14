End-to-End Architecture: Mobile SMS Gateway Platform

This section describes the complete lifecycle of the system, from installation to message delivery.

1. System Components
Android App

Installed on one or more Android devices with active SIM cards. Responsible for sending SMS and reporting status.

Web Dashboard

Browser-based interface for managing devices, users, and messages.

Backend API

Receives requests, authenticates users, stores jobs, and assigns them to devices.

Database

Stores users, devices, API keys, SMS jobs, and delivery logs.

2. Initial Setup Flow
Administrator deploys web application
            ↓
User creates account
            ↓
User installs Android APK
            ↓
App logs in or scans pairing token
            ↓
Device registers with backend
            ↓
Device marked Online
            ↓
Ready to send SMS
3. Device Registration

After installation, the Android app:

Generates a device identifier.
Collects metadata:
Device model
Android version
Phone number (if available)
Battery level
SIM information
Sends registration data to the backend.
Receives:
Device token
Polling interval
Configuration settings

The device is now associated with the user's account.

4. Sending an SMS

A user can send messages through:

Web dashboard
REST API
Scheduled jobs
CSV bulk upload

Example API request:

POST /api/sms/send
Authorization: Bearer <api_key>
{
  "to": "+919876543210",
  "message": "Your booking is confirmed."
}
5. Backend Processing

The backend:

Validates authentication and quotas.
Creates a row in sms_jobs.
Sets status to pending.
Selects an online device.
Marks the job as assigned.
6. Device Polling

The Android app periodically requests work:

GET /api/device/jobs
Authorization: Bearer <device_token>

If a job is available, the backend returns:

{
  "jobId": "123",
  "to": "+919876543210",
  "message": "Your booking is confirmed."
}
7. Local SMS Transmission

The Android app uses Android's SmsManager to send the SMS through the installed SIM card.

Possible states:

Sending
Sent
Delivered
Failed
8. Status Reporting

The app sends updates to the backend:

POST /api/device/jobs/123/status
{
  "status": "delivered",
  "timestamp": "2026-05-13T12:00:00Z"
}
9. Dashboard Updates

The dashboard displays:

Recipient number
Message content
Assigned device
Delivery status
Timestamps
10. Device Heartbeats

Every few minutes the Android app reports:

Battery percentage
Signal strength
SIM status
App version
Last active time

Devices that stop reporting are marked offline.

11. Bulk Messaging

For CSV uploads:

phone,message
+919876543210,Hello
+919876543211,Reminder

The backend creates one sms_job per row and distributes them sequentially.

12. Security Model
User Authentication

Managed via the web application.

API Keys

Used by external systems.

Device Tokens

Used by Android devices.

HTTPS

Secures all traffic.

13. Deployment Architecture
Cloudflare Workers / Render / VPS
          ↓
    Next.js Application
          ↓
      Database
          ↓
     Android Devices
          ↓
     Mobile Network
          ↓
      Recipients
14. Failure Handling
Device offline → jobs remain pending.
Sending failure → job marked failed.
Optional retries can requeue failed jobs.
15. Typical Use Cases
OTP notifications for internal systems
Booking confirmations
Appointment reminders
Marketing campaigns
Operational alerts
16. Complete Message Lifecycle
Create SMS Request
      ↓
Store as Pending Job
      ↓
Assign to Online Device
      ↓
Device Polls for Work
      ↓
SMS Sent via SIM Card
      ↓
Status Returned
      ↓
Dashboard Updated
17. Architecture Summary

This is effectively a distributed SMS infrastructure where:

Android phones function as telecom gateways.
The web application acts as the control plane.
The database serves as the job queue and audit log.
Users interact through a dashboard or API.

The result is a deployable, low-cost SMS platform suitable for MVP demonstrations, internal tooling, and small-scale commercial use.


Mobile application cum dashboard - capacitor js 
web dashboard - next js
backend - node js express
db, hosting - cloudflare workers


simple to use wrangler CLI for deployment and management.