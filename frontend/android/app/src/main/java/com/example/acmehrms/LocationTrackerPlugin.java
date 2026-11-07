package com.example.acmehrms;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocationTracker")
public class LocationTrackerPlugin extends Plugin {

    private static final String TAG = "LocationTrackerPlugin";

    @PluginMethod
    public void startTracking(PluginCall call) {
        Context context = getContext();
        String serverUrl = call.getString("serverUrl", "");
        String token = call.getString("token", "");

        // Safely extract intervalMs — JS numbers may arrive as Integer, not Long.
        // call.getLong() fails silently in that case and returns the default.
        long intervalMs = 15L * 60 * 1000; // fallback
        try {
            Object raw = call.getData().opt("intervalMs");
            if (raw instanceof Number) {
                intervalMs = ((Number) raw).longValue();
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to parse intervalMs, using default: " + e.getMessage());
        }

        Log.i(TAG, "startTracking called: serverUrl=" + serverUrl + ", intervalMs=" + intervalMs);

        Intent intent = new Intent(context, LocationTrackerService.class);
        intent.setAction(LocationTrackerService.ACTION_START);
        intent.putExtra(LocationTrackerService.EXTRA_SERVER_URL, serverUrl);
        intent.putExtra(LocationTrackerService.EXTRA_AUTH_TOKEN, token);
        intent.putExtra(LocationTrackerService.EXTRA_INTERVAL_MS, intervalMs);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Foreground location tracking started with interval " + (intervalMs / 60000) + " min(s)");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, LocationTrackerService.class);
        intent.setAction(LocationTrackerService.ACTION_STOP);
        context.startService(intent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Foreground location tracking stopped");
        call.resolve(ret);
    }

    @PluginMethod
    public void isTracking(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("hrms_tracker_prefs", Context.MODE_PRIVATE);
        boolean isActive = prefs.getBoolean("is_active", false);

        JSObject ret = new JSObject();
        ret.put("isTracking", isActive);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermissionsStatus(PluginCall call) {
        Context context = getContext();

        // 1. Notifications
        boolean notificationsGranted = NotificationManagerCompat.from(context).areNotificationsEnabled();

        // 2. Battery Optimization (Unrestricted)
        boolean batteryUnrestricted = false;
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    batteryUnrestricted = pm.isIgnoringBatteryOptimizations(context.getPackageName());
                } else {
                    batteryUnrestricted = true;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error checking battery optimization: " + e.getMessage());
        }

        // 3. Foreground Location
        boolean fineLocationGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean coarseLocationGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean locationGranted = fineLocationGranted || coarseLocationGranted;

        // 4. Background Location ("Allow all the time")
        boolean backgroundLocationGranted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            backgroundLocationGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
        } else {
            backgroundLocationGranted = locationGranted;
        }

        boolean allGranted = notificationsGranted && batteryUnrestricted && backgroundLocationGranted && fineLocationGranted;

        JSObject ret = new JSObject();
        ret.put("notificationsGranted", notificationsGranted);
        ret.put("batteryUnrestricted", batteryUnrestricted);
        ret.put("locationGranted", locationGranted);
        ret.put("backgroundLocationGranted", backgroundLocationGranted);
        ret.put("allGranted", allGranted);

        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimization(PluginCall call) {
        Context context = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization: " + e.getMessage());
            // Fallback to general battery saver settings
            try {
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Unable to open battery optimization settings: " + ex.getMessage());
            }
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (getActivity() != null) {
                    ActivityCompat.requestPermissions(
                            getActivity(),
                            new String[]{Manifest.permission.POST_NOTIFICATIONS},
                            9001
                    );
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error requesting notification permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestLocationPermissions(PluginCall call) {
        try {
            if (getActivity() != null) {
                Context context = getContext();
                boolean fineGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;

                if (!fineGranted) {
                    // First ask for foreground location
                    ActivityCompat.requestPermissions(
                            getActivity(),
                            new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                            9002
                    );
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    // Then ask for background location
                    ActivityCompat.requestPermissions(
                            getActivity(),
                            new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                            9003
                    );
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error requesting location permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error opening app settings: " + e.getMessage());
        }
    }
}
