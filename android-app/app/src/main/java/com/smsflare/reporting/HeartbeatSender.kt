package com.smsflare.reporting

import android.content.Context
import android.os.BatteryManager
import android.util.Log
import androidx.work.*
import com.smsflare.BuildConfig
import com.smsflare.data.DevicePrefs
import com.smsflare.data.local.AppLogger
import com.smsflare.data.remote.ApiClient
import com.smsflare.data.remote.HeartbeatPayload
import java.util.concurrent.TimeUnit

class HeartbeatSender(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val baseUrl = DevicePrefs.getBaseUrl(applicationContext) ?: return Result.failure()
        val token = DevicePrefs.getToken(applicationContext) ?: return Result.failure()

        val bm = applicationContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val battery = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

        try {
            ApiClient.create(baseUrl).heartbeat(
                "Bearer $token",
                HeartbeatPayload(
                    battery_level = battery,
                    signal_strength = null,
                    sim_status = null,
                    app_version = BuildConfig.VERSION_NAME
                )
            )
            AppLogger.info("HeartbeatSender", "Heartbeat sent (battery: $battery%)")
        } catch (e: Exception) {
            AppLogger.error("HeartbeatSender", "Heartbeat failed", e)
        }

        return Result.success()
    }

    companion object {
        fun schedule(context: Context) {
            val work = PeriodicWorkRequestBuilder<HeartbeatSender>(15, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "heartbeat",
                ExistingPeriodicWorkPolicy.KEEP,
                work
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork("heartbeat")
        }
    }
}
