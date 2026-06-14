package com.smsflare.reporting

import android.content.Context
import android.util.Log
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
    ) {
        val body = StatusUpdate(
            status = status,
            timestamp = System.currentTimeMillis() / 1000L,
            error_message = errorMessage
        )

        for (attempt in 0..2) {
            try {
                val response = api.reportStatus("Bearer $deviceToken", jobId, body)
                if (response.isSuccessful) return
                Log.w("StatusReporter", "Attempt ${attempt + 1} failed: HTTP ${response.code()}")
            } catch (e: Exception) {
                Log.w("StatusReporter", "Attempt ${attempt + 1} exception: ${e.message}")
            }
            if (attempt < 2) delay(1000L * (attempt + 1))
        }
        Log.e("StatusReporter", "All retries exhausted for job $jobId status=$status")
    }
}
