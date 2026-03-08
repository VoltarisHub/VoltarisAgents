package expo.modules.localserver

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class LocalServerForegroundService : Service() {
  companion object {
    private const val NOTIFICATION_ID = 8124
    private const val CHANNEL_ID = "local_server_foreground"
    private const val ACTION_START = "local_server_start"
    private const val ACTION_STOP = "local_server_stop"
    private const val ACTION_UPDATE = "local_server_update"
    private const val EXTRA_PORT = "local_server_port"
    private const val EXTRA_URL = "local_server_url"
    private const val EXTRA_PEER_COUNT = "local_server_peers"

    fun startService(context: Context, port: Int, url: String?) {
      val intent = Intent(context, LocalServerForegroundService::class.java)
      intent.action = ACTION_START
      intent.putExtra(EXTRA_PORT, port)
      intent.putExtra(EXTRA_URL, url)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stopService(context: Context) {
      val intent = Intent(context, LocalServerForegroundService::class.java)
      intent.action = ACTION_STOP
      context.startService(intent)
    }

    fun updateStatus(context: Context, peerCount: Int, url: String?) {
      val intent = Intent(context, LocalServerForegroundService::class.java)
      intent.action = ACTION_UPDATE
      intent.putExtra(EXTRA_PEER_COUNT, peerCount)
      intent.putExtra(EXTRA_URL, url)
      context.startService(intent)
    }
  }

  private var wakeLock: PowerManager.WakeLock? = null
  private var currentPort: Int = 0
  private var currentUrl: String? = null
  private var currentPeerCount: Int = 0
  private var started = false

  override fun onCreate() {
    super.onCreate()
    createChannel()
    acquireWakeLock()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> handleStart(intent)
      ACTION_STOP -> handleStop()
      ACTION_UPDATE -> handleUpdate(intent)
    }
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    releaseWakeLock()
    started = false
    super.onDestroy()
  }

  private fun handleStart(intent: Intent) {
    currentPort = intent.getIntExtra(EXTRA_PORT, 0)
    currentUrl = intent.getStringExtra(EXTRA_URL)
    currentPeerCount = 0
    started = true
    startForeground(NOTIFICATION_ID, buildNotification())
  }

  private fun handleStop() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun handleUpdate(intent: Intent) {
    if (!started) return
    currentPeerCount = intent.getIntExtra(EXTRA_PEER_COUNT, currentPeerCount)
    currentUrl = intent.getStringExtra(EXTRA_URL) ?: currentUrl
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, buildNotification())
  }

  private fun buildNotification(): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = if (launchIntent != null) {
      PendingIntent.getActivity(
        this, 0, launchIntent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    } else null

    val contentParts = mutableListOf<String>()
    if (currentPeerCount > 0) {
      val peers = if (currentPeerCount == 1) "1 peer" else "$currentPeerCount peers"
      contentParts.add(peers)
    } else {
      contentParts.add("Waiting")
    }
    currentUrl?.let { contentParts.add(it) }
    val content = contentParts.joinToString(" • ")

    val iconResId = applicationInfo.icon.takeIf { it != 0 }
      ?: android.R.drawable.ic_dialog_info

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Inferra server active")
      .setContentText(content)
      .setStyle(NotificationCompat.BigTextStyle().bigText(content))
      .setSmallIcon(iconResId)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .apply { pendingIntent?.let { setContentIntent(it) } }
      .build()
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      CHANNEL_ID, "Inferra Local Server", NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Local server status"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun acquireWakeLock() {
    val manager = getSystemService(Context.POWER_SERVICE) as PowerManager
    val lock = manager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "InferraLocalServer")
    lock.setReferenceCounted(false)
    lock.acquire(10 * 60 * 60 * 1000L)
    wakeLock = lock
  }

  private fun releaseWakeLock() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
  }
}
