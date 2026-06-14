package com.smsflare.polling

import android.content.Context
import android.util.Log
import androidx.work.*
import com.smsflare.data.DevicePrefs
import com.smsflare.sms.JobWorker
import java.util.concurrent.TimeUnit

class JobPoller(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val baseUrl = DevicePrefs.getBaseUrl(applicationContext) ?: return Result.failure()
        val token = DevicePrefs.getToken(applicationContext) ?: return Result.failure()

        try {
            val job = DeviceRepository(applicationContext).pollJob(baseUrl, token)
            if (job != null) {
                val work = OneTimeWorkRequestBuilder<JobWorker>()
                    .setInputData(workDataOf(
                        "job_id" to job.job_id,
                        "recipient" to job.recipient,
                        "message" to job.message
                    ))
                    .build()
                WorkManager.getInstance(applicationContext).enqueue(work)
            }
        } catch (e: Exception) {
            Log.e("JobPoller", "Poll failed", e)
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
