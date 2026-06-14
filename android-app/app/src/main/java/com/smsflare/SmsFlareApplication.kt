package com.smsflare

import android.app.Application
import androidx.work.Configuration

class SmsFlareApplication : Application(), Configuration.Provider {
    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
}
