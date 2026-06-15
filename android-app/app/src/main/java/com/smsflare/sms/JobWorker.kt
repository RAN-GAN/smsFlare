package com.smsflare.sms

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.smsflare.data.DevicePrefs
import com.smsflare.data.local.AppDatabase
import com.smsflare.data.local.AppLogger
import com.smsflare.data.local.SentJob
import com.smsflare.reporting.StatusReporter

class JobWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val jobId = inputData.getString("job_id") ?: run {
            AppLogger.error("JobWorker", "Missing job_id in input data")
            return Result.failure()
        }
        val recipient = inputData.getString("recipient") ?: run {
            AppLogger.error("JobWorker", "Missing recipient for job $jobId")
            return Result.failure()
        }
        val message = inputData.getString("message") ?: run {
            AppLogger.error("JobWorker", "Missing message for job $jobId")
            return Result.failure()
        }
        val token = DevicePrefs.getToken(applicationContext) ?: run {
            AppLogger.error("JobWorker", "No device token configured for job $jobId")
            return Result.failure()
        }
        val baseUrl = DevicePrefs.getBaseUrl(applicationContext) ?: run {
            AppLogger.error("JobWorker", "No base URL configured for job $jobId")
            return Result.failure()
        }

        val db = AppDatabase.getInstance(applicationContext)
        val sentJobDao = db.sentJobDao()
        val reporter = StatusReporter(applicationContext, baseUrl)

        sentJobDao.deleteOlderThan(System.currentTimeMillis() - 7 * 24 * 60 * 60 * 1000L)

        val alreadySent = sentJobDao.findById(jobId) != null

        if (!alreadySent) {
            AppLogger.info("JobWorker", "Starting job $jobId — sending SMS to $recipient")
            when (val result = SmsSender(applicationContext).send(jobId, recipient, message)) {
                is SmsResult.Sent, is SmsResult.Submitted -> {
                    val label = if (result is SmsResult.Sent) "confirmed" else "submitted (no modem ACK)"
                    AppLogger.info("JobWorker", "SMS $label for job $jobId — saving to local DB")
                    sentJobDao.insert(SentJob(jobId = jobId))
                }
                is SmsResult.Failed -> {
                    AppLogger.error("JobWorker", "SMS failed for job $jobId: ${result.reason}")
                    reporter.report(token, jobId, "failed", result.reason)
                    return Result.failure()
                }
            }
        } else {
            AppLogger.info("JobWorker", "Job $jobId already in local DB — skipping SMS, retrying server report")
        }

        val reported = reporter.report(token, jobId, "sent")
        return if (reported) {
            AppLogger.info("JobWorker", "Job $jobId complete")
            Result.success()
        } else {
            AppLogger.warn("JobWorker", "Job $jobId — server not notified, WorkManager will retry")
            Result.retry()
        }
    }
}
