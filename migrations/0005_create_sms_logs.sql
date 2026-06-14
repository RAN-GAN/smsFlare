-- Migration: Create sms_logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  error_message TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (job_id) REFERENCES sms_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_job_id ON sms_logs(job_id);
