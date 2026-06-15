package com.smsflare.sms

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import com.smsflare.data.DevicePrefs
import com.smsflare.data.local.AppLogger
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

sealed class SmsResult {
    object Sent : SmsResult()
    // sendTextMessage() was called but the modem confirmation broadcast never arrived.
    // The SMS was submitted to the carrier — treat as sent to prevent re-sends.
    object Submitted : SmsResult()
    data class Failed(val reason: String) : SmsResult()
}

class SmsSender(private val context: Context) {

    private fun getSmsManager(): SmsManager {
        val subId = DevicePrefs.getSubscriptionIdBlocking(context)
        return if (subId != null && subId != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getSmsManagerForSubscriptionId(subId)
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }
        }
    }

    suspend fun send(jobId: String, recipient: String, message: String): SmsResult {
        AppLogger.info("SmsSender", "Sending SMS to $recipient (job $jobId, ${message.length} chars)")
        val sentAction = "com.smsflare.SMS_SENT.$jobId"

        // Track whether sendTextMessage() was actually called. If a timeout fires after
        // the call was made, the SMS reached the carrier even though the modem confirmation
        // broadcast never arrived — treat that as Submitted, not Failed.
        var submitted = false

        val result = withTimeoutOrNull(30_000L) {
            suspendCancellableCoroutine { cont ->
                val receiver = object : BroadcastReceiver() {
                    override fun onReceive(ctx: Context, intent: Intent) {
                        context.unregisterReceiver(this)
                        when (resultCode) {
                            Activity.RESULT_OK -> {
                                AppLogger.info("SmsSender", "SMS delivered to carrier for $recipient (job $jobId)")
                                cont.resume(SmsResult.Sent)
                            }
                            else -> {
                                AppLogger.warn("SmsSender", "Carrier rejected SMS for $recipient (job $jobId) — resultCode=$resultCode")
                                cont.resume(SmsResult.Failed("Carrier rejected: resultCode=$resultCode"))
                            }
                        }
                    }
                }

                val filter = IntentFilter(sentAction)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
                } else {
                    @Suppress("UnspecifiedRegisterReceiverFlag")
                    context.registerReceiver(receiver, filter)
                }

                cont.invokeOnCancellation {
                    try { context.unregisterReceiver(receiver) } catch (_: Exception) {}
                }

                val sentIntent = PendingIntent.getBroadcast(
                    context, jobId.hashCode(),
                    Intent(sentAction),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                try {
                    AppLogger.info("SmsSender", "Handing off to SMS subsystem (job $jobId)")
                    getSmsManager().sendTextMessage(recipient, null, message, sentIntent, null)
                    submitted = true
                    AppLogger.info("SmsSender", "SMS handed off — waiting for modem confirmation (job $jobId)")
                } catch (e: Exception) {
                    AppLogger.error("SmsSender", "sendTextMessage() threw for $recipient (job $jobId): ${e.message}")
                    try { context.unregisterReceiver(receiver) } catch (_: Exception) {}
                    cont.resume(SmsResult.Failed(e.message ?: "Unknown error"))
                }
            }
        }

        return when {
            result != null -> result
            submitted -> {
                AppLogger.warn("SmsSender", "Modem confirmation timed out after 30s (job $jobId) — SMS was submitted, treating as sent")
                SmsResult.Submitted
            }
            else -> {
                AppLogger.error("SmsSender", "Timed out before sendTextMessage() could be called (job $jobId)")
                SmsResult.Failed("Timeout before send could be attempted")
            }
        }
    }
}
