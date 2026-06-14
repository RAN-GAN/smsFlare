package com.smsflare.data.remote

import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @POST("api/device/register")
    suspend fun register(@Body req: RegisterRequest): RegisterResponse

    @GET("api/device/jobs")
    suspend fun pollJob(@Header("Authorization") token: String): Response<JobResponse>

    @POST("api/device/jobs/{id}/status")
    suspend fun reportStatus(
        @Header("Authorization") token: String,
        @Path("id") jobId: String,
        @Body body: StatusUpdate
    ): Response<Unit>

    @POST("api/device/heartbeat")
    suspend fun heartbeat(
        @Header("Authorization") token: String,
        @Body body: HeartbeatPayload
    ): Response<Unit>
}

data class RegisterRequest(
    val pairing_token: String,
    val device_model: String,
    val android_version: String,
    val phone_number: String?,
    val battery_level: Int?,
    val sim_info: String?
)

data class RegisterResponse(
    val device_id: String,
    val device_token: String,
    val polling_interval: Int
)

data class JobResponse(
    val job_id: String,
    val recipient: String,
    val message: String
)

data class StatusUpdate(
    val status: String,
    val timestamp: Long,
    val error_message: String? = null
)

data class HeartbeatPayload(
    val battery_level: Int,
    val signal_strength: Int?,
    val sim_status: String?,
    val app_version: String
)
