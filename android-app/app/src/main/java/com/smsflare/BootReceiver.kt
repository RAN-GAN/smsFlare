package com.smsflare

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.smsflare.data.DevicePrefs
import com.smsflare.polling.JobPoller
import com.smsflare.reporting.HeartbeatSender

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            if (DevicePrefs.isRegisteredBlocking(context)) {
                JobPoller.schedule(context)
                HeartbeatSender.schedule(context)
            }
        }
    }
}
