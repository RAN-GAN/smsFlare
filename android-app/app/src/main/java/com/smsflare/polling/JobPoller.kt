package com.smsflare.polling

import android.content.Context
import android.util.Log
import androidx.work.*
import com.smsflare.data.DevicePrefs
import com.smsflare.data.local.AppDatabase
import com.smsflare.data.local.AppLogger
import com.smsflare.sms.JobWorker
import java.util.concurrent.TimeUnit

class JobPoller(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val baseUrl = DevicePrefs.getBaseUrl(applicationContext) ?: run {
            AppLogger.error("JobPoller", "No base URL configured")
            return Result.failure()
        }
        val token = DevicePrefs.getToken(applicationContext) ?: run {
            AppLogger.error("JobPoller", "No device token configured")
            return Result.failure()
        }

        try {
            val sentJobDao = AppDatabase.getInstance(applicationContext).sentJobDao()
            sentJobDao.deleteOlderThan(System.currentTimeMillis() - 7 * 24 * 60 * 60 * 1000L)

            AppLogger.info("JobPoller", "Polling server for jobs...")
            val job = DeviceRepository(applicationContext).pollJob(baseUrl, token)
            if (job != null) {
                if (sentJobDao.findById(job.job_id) != null) {
                    AppLogger.warn("JobPoller", "Job ${job.job_id} already sent locally — skipping to avoid double-send")
                } else {
                    AppLogger.info("JobPoller", "Queuing job ${job.job_id} → ${job.recipient} (${job.message.length} chars)")
                    val work = OneTimeWorkRequestBuilder<JobWorker>()
                        .setInputData(workDataOf(
                            "job_id" to job.job_id,
                            "recipient" to job.recipient,
                            "message" to job.message
                        ))
                        .build()
                    WorkManager.getInstance(applicationContext)
                        .enqueueUniqueWork("job_${job.job_id}", ExistingWorkPolicy.KEEP, work)
                }
            }
        } catch (e: Exception) {
            AppLogger.error("JobPoller", "Poll failed: ${e.message}")
        }

        // Self-reschedule after 30s (WorkManager minimum periodic is 15min)
        val next = OneTimeWorkRequestBuilder<JobPoller>()
            .setInitialDelay(30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(applicationContext)
            .enqueueUniqueWork("poller", ExistingWorkPolicy.REPLACE, next)

        return Result.success()
    }

    companion object {
        fun schedule(context: Context) {
            val work = OneTimeWorkRequestBuilder<JobPoller>()
                .setInitialDelay(5, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork("poller", ExistingWorkPolicy.KEEP, work)
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork("poller")
        }
    }
}
