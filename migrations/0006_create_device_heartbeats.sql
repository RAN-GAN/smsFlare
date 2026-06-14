-- Migration: Create device_heartbeats table
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

CREATE INDEX IF NOT EXISTS idx_device_heartbeats_device_id ON device_heartbeats(device_id);
