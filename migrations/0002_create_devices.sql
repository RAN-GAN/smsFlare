-- Migration: Create devices table
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

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_online ON devices(online, last_heartbeat);
