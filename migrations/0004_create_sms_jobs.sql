-- Migration: Create sms_jobs table
CREATE TABLE IF NOT EXISTS sms_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  device_id TEXT,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'sent', 'delivered', 'failed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  assigned_at INTEGER,
  sent_at INTEGER,
  delivered_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_jobs_user_id ON sms_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_jobs_device_id ON sms_jobs(device_id);
CREATE INDEX IF NOT EXISTS idx_sms_jobs_status ON sms_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sms_jobs_pending_assigned ON sms_jobs(status, device_id) WHERE status IN ('pending', 'assigned');
