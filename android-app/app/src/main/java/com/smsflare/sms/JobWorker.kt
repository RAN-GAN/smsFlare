package com.smsflare.sms

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.smsflare.data.DevicePrefs
import com.smsflare.reporting.StatusReporter

class JobWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val jobId = inputData.getString("job_id") ?: return Result.failure()
        val recipient = inputData.getString("recipient") ?: return Result.failure()
        val message = inputData.getString("message") ?: return Result.failure()
        val token = DevicePrefs.getToken(applicationContext) ?: return Result.failure()
        val baseUrl = DevicePrefs.getBaseUrl(applicationContext) ?: return Result.failure()

        val reporter = StatusReporter(applicationContext, baseUrl)

        return when (val result = SmsSender(applicationContext).send(jobId, recipient, message)) {
            is SmsResult.Sent -> {
                reporter.report(token, jobId, "sent")
                Result.success()
            }
            is SmsResult.Failed -> {
                reporter.report(token, jobId, "failed", result.reason)
                Result.failure()
            }
        }
    }
}
