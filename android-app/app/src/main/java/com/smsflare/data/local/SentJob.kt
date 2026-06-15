package com.smsflare.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sent_jobs")
data class SentJob(
    @PrimaryKey val jobId: String,
    val sentAt: Long = System.currentTimeMillis()
)
