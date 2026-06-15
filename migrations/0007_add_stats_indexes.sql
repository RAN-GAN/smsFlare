-- Composite indexes to speed up GET /api/stats aggregation and filtered job queries
CREATE INDEX IF NOT EXISTS idx_sms_jobs_user_status ON sms_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_jobs_user_created ON sms_jobs(user_id, created_at);
