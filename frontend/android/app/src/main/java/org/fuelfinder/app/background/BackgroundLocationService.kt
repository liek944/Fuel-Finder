package org.fuelfinder.app.background

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.core.app.NotificationCompat
import org.fuelfinder.app.R

class BackgroundLocationService : Service(), LocationListener {
    private lateinit var locationManager: LocationManager

    private var intervalMs: Long = 2000
    private var minDistanceM: Float = 5f

    private var destLat: Double? = null
    private var destLng: Double? = null
    private var destRadiusM: Float = 100f

    private val channelId = "ff_navigation"
    private val notifId = 1001

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            intervalMs = it.getLongExtra("intervalMs", intervalMs)
            minDistanceM = it.getFloatExtra("minDistanceM", minDistanceM)
            if (it.hasExtra("destLat") && it.hasExtra("destLng")) {
                destLat = it.getDoubleExtra("destLat", 0.0)
                destLng = it.getDoubleExtra("destLng", 0.0)
            }
            if (it.hasExtra("destRadiusM")) {
                destRadiusM = it.getFloatExtra("destRadiusM", destRadiusM)
            }
        }

        val notification = buildNotification("Navigating • arrival at ${destRadiusM.toInt()} m")
        startForeground(notifId, notification)

        try {
            // Request updates from both providers for better reliability
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                intervalMs,
                minDistanceM,
                this
            )
            locationManager.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER,
                intervalMs,
                minDistanceM,
                this
            )
        } catch (e: SecurityException) {
            // Missing permissions – stop service
            stopSelf()
        }
        return START_STICKY
    }

    override fun onLocationChanged(location: Location) {
        val dLat = destLat
        val dLng = destLng
        if (dLat != null && dLng != null) {
            val dest = Location("dest").apply {
                latitude = dLat
                longitude = dLng
            }
            val distance = location.distanceTo(dest)
            if (distance <= destRadiusM) {
                // Update notification and stop
                val notification = buildNotification("Arrived at destination")
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.notify(notifId, notification)
                stopSelf()
            } else {
                // Keep foreground notification updated with distance (rounded)
                val kmText = String.format("%.0f m to destination", distance)
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.notify(notifId, buildNotification(kmText))
            }
        }
    }

    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    override fun onDestroy() {
        try {
            locationManager.removeUpdates(this)
        } catch (_: Exception) { }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Fuel Finder Navigation",
                NotificationManager.IMPORTANCE_LOW
            )
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(content: String): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Fuel Finder")
            .setContentText(content)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }
}
