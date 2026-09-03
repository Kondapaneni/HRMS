package com.example.acmehrms;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocationTracker")
public class LocationTrackerPlugin extends Plugin {

    @PluginMethod
    public void startTracking(PluginCall call) {
        Context context = getContext();
        String serverUrl = call.getString("serverUrl", "https://hrms-qwv3.onrender.com/api/employee/attendance/punch");
        String token = call.getString("token", "");
        Long intervalMs = call.getLong("intervalMs", 2L * 60 * 1000);

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
        ret.put("message", "Foreground location tracking started");
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
}
