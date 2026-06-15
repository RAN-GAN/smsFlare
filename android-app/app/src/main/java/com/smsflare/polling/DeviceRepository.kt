package com.smsflare.polling

import android.content.Context
import android.os.BatteryManager
import android.os.Build
import android.telephony.TelephonyManager
import com.smsflare.data.local.AppLogger
import com.smsflare.data.remote.ApiClient
import com.smsflare.data.remote.JobResponse
import com.smsflare.data.remote.RegisterRequest
import com.smsflare.data.remote.RegisterResponse

class DeviceRepository(private val context: Context) {

    suspend fun register(baseUrl: String, pairingToken: String): RegisterResponse {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val battery = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

        val request = RegisterRequest(
            pairing_token = pairingToken,
            device_model = "${Build.MANUFACTURER} ${Build.MODEL}",
            android_version = Build.VERSION.RELEASE,
            phone_number = null,
            battery_level = battery,
            sim_info = tm.networkOperatorName.takeIf { it.isNotEmpty() }
        )
        return ApiClient.create(baseUrl).register(request)
    }

    suspend fun unpair(baseUrl: String, deviceToken: String) {
        ApiClient.create(baseUrl).unpair("Bearer $deviceToken")
    }

    suspend fun pollJob(baseUrl: String, deviceToken: String): JobResponse? {
        AppLogger.info("Poll", "→ GET /api/device/jobs")
        val response = ApiClient.create(baseUrl).pollJob("Bearer $deviceToken")
        val code = response.code()
        return when {
            code == 204 -> {
                AppLogger.info("Poll", "← HTTP $code — no pending jobs")
                null
            }
            response.isSuccessful -> {
                val job = response.body()
                AppLogger.info("Poll", "← HTTP $code — job ${job?.job_id} for ${job?.recipient}")
                job
            }
            else -> {
                AppLogger.warn("Poll", "← HTTP $code — server error")
                null
            }
        }
    }
}
