package com.smsflare.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_jobs")
data class PendingJob(
    @PrimaryKey val jobId: String,
    val recipient: String,
    val message: String,
    val createdAt: Long = System.currentTimeMillis()
)
