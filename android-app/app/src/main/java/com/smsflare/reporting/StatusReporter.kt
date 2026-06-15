package com.smsflare.reporting

import android.content.Context
import com.smsflare.data.local.AppLogger
import com.smsflare.data.remote.ApiClient
import com.smsflare.data.remote.StatusUpdate
import kotlinx.coroutines.delay

class StatusReporter(context: Context, baseUrl: String) {

    private val api = ApiClient.create(baseUrl)

    suspend fun report(
        deviceToken: String,
        jobId: String,
        status: String,
        errorMessage: String? = null
    ): Boolean {
        val body = StatusUpdate(
            status = status,
            timestamp = System.currentTimeMillis() / 1000L,
            error_message = errorMessage
        )

        for (attempt in 0..2) {
            val attemptLabel = "${attempt + 1}/3"
            AppLogger.info("StatusReporter", "→ POST /api/device/jobs/$jobId/status — status=$status (attempt $attemptLabel)")
            try {
                val response = api.reportStatus("Bearer $deviceToken", jobId, body)
                val code = response.code()
                if (response.isSuccessful) {
                    AppLogger.info("StatusReporter", "← HTTP $code — server acknowledged status=$status for job $jobId")
                    return true
                }
                AppLogger.warn("StatusReporter", "← HTTP $code — server rejected status update for job $jobId (attempt $attemptLabel)")
            } catch (e: Exception) {
                AppLogger.warn("StatusReporter", "← Request failed for job $jobId (attempt $attemptLabel): ${e.message}")
            }
            if (attempt < 2) {
                val delaySec = attempt + 1
                AppLogger.info("StatusReporter", "Retrying in ${delaySec}s...")
                delay(1000L * delaySec)
            }
        }
        AppLogger.error("StatusReporter", "All 3 attempts failed — server not notified for job $jobId status=$status")
        return false
    }
}
