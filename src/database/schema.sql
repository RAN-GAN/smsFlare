-- Users table: Web dashboard users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Devices table: Android phones that send SMS
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  device_token TEXT UNIQUE NOT NULL,
  device_model TEXT,
  android_version TEXT,
  phone_number TEXT,
  battery_level INTEGER,
  sim_info TEXT,
  online INTEGER DEFAULT 0,
  last_heartbeat INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API keys table: External API access
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_preview TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SMS jobs table: Queue of messages to send
CREATE TABLE IF NOT EXISTS sms_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  device_id TEXT,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, assigned, sent, delivered, failed
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  assigned_at INTEGER,
  sent_at INTEGER,
  delivered_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

-- SMS logs table: Delivery history and status changes
CREATE TABLE IF NOT EXISTS sms_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id TEXT NOT NULL,
  status TEXT NOT NULL, -- sent, delivered, failed
  timestamp INTEGER NOT NULL,
  error_message TEXT,
  metadata TEXT, -- JSON with device info, carrier response, etc.
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (job_id) REFERENCES sms_jobs(id) ON DELETE CASCADE
);

-- Device heartbeats table: Historical device status
CREATE TABLE IF NOT EXISTS device_heartbeats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  device_id TEXT NOT NULL,
  battery_level INTEGER,
  signal_strength INTEGER,
  sim_status TEXT,
  app_version TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Indices for common queries
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_online ON devices(online, last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_jobs_user_id ON sms_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_jobs_device_id ON sms_jobs(device_id);
CREATE INDEX IF NOT EXISTS idx_sms_jobs_status ON sms_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sms_jobs_pending_assigned ON sms_jobs(status, device_id) WHERE status IN ('pending', 'assigned');
CREATE INDEX IF NOT EXISTS idx_sms_logs_job_id ON sms_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_device_heartbeats_device_id ON device_heartbeats(device_id);
