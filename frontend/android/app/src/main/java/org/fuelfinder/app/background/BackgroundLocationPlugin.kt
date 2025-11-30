package org.fuelfinder.app.background

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "BackgroundLocation",
    permissions = [
        Permission(strings = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION], alias = "location"),
        Permission(strings = [Manifest.permission.ACCESS_BACKGROUND_LOCATION], alias = "background"),
        Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")
    ]
)
class BackgroundLocationPlugin : Plugin() {
    private var destLat: Double? = null
    private var destLng: Double? = null
    private var destRadiusM: Float = 100f

    @PluginMethod
    fun setDestination(call: PluginCall) {
        destLat = call.getDouble("lat")
        destLng = call.getDouble("lng")
        destRadiusM = (call.getDouble("radiusM") ?: destRadiusM.toDouble()).toFloat()
        call.resolve()
    }

    @PluginMethod
    fun clearDestination(call: PluginCall) {
        destLat = null
        destLng = null
        call.resolve()
    }

    @PluginMethod
    fun startTracking(call: PluginCall) {
        val intervalMs = call.getLong("intervalMs") ?: 2000L
        val minDistanceM = ((call.getDouble("minDistanceM") ?: 5.0)).toFloat()
        val lat = call.getDouble("lat") ?: destLat
        val lng = call.getDouble("lng") ?: destLng
        val radius = ((call.getDouble("radiusM") ?: destRadiusM.toDouble())).toFloat()

        val intent = Intent(context, BackgroundLocationService::class.java).apply {
            putExtra("intervalMs", intervalMs)
            putExtra("minDistanceM", minDistanceM)
            if (lat != null && lng != null) {
                putExtra("destLat", lat)
                putExtra("destLng", lng)
            }
            putExtra("destRadiusM", radius)
        }
        ContextCompat.startForegroundService(context, intent)
        call.resolve()
    }

    @PluginMethod
    fun stopTracking(call: PluginCall) {
        val intent = Intent(context, BackgroundLocationService::class.java)
        context.stopService(intent)
        call.resolve()
    }

    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        val ret = JSObject()
        val fineGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val bgGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        val notifGranted = if (android.os.Build.VERSION.SDK_INT >= 33) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else true
        ret.put("location", fineGranted || coarseGranted)
        ret.put("background", bgGranted)
        ret.put("notifications", notifGranted)
        call.resolve(ret)
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        // Request all declared permission aliases
        requestPermissionForAliases(arrayOf("location", "background", "notifications"), call, "permissionsCallback")
    }

    @PermissionCallback
    fun permissionsCallback(call: PluginCall) {
        checkPermissions(call)
    }
}
