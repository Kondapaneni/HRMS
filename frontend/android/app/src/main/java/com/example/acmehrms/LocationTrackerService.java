package com.example.acmehrms;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class LocationTrackerService extends Service implements LocationListener {

    private static final String TAG = "LocationTrackerService";
    public static final String CHANNEL_ID = "hrms_location_tracking_channel";
    public static final int NOTIFICATION_ID = 8848;
    private static final int ALARM_REQUEST_CODE = 8849;
    private static final String ACTION_ALARM_TICK = "com.example.acmehrms.ALARM_TICK";

    public static final String ACTION_START = "ACTION_START_TRACKING";
    public static final String ACTION_STOP = "ACTION_STOP_TRACKING";

    public static final String EXTRA_SERVER_URL = "EXTRA_SERVER_URL";
    public static final String EXTRA_AUTH_TOKEN = "EXTRA_AUTH_TOKEN";
    public static final String EXTRA_INTERVAL_MS = "EXTRA_INTERVAL_MS";

    private LocationManager locationManager;
    private Handler handler;
    private AlarmManager alarmManager;

    private String serverUrl = "https://hrms-qwv3.onrender.com/api/employee/attendance/punch";
    private String authToken = "";
    private long intervalMs = 2 * 60 * 1000; // default 2 minutes

    private Location lastKnownLocation = null;
    private boolean isTracking = false;
    private int punchCount = 0;
    private PowerManager.WakeLock wakeLock;

    // BroadcastReceiver for AlarmManager ticks
    private final BroadcastReceiver alarmReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (ACTION_ALARM_TICK.equals(intent.getAction())) {
                Log.d(TAG, "AlarmManager tick received - sending punch");
                sendPunchRequest();
                // Schedule next alarm
                scheduleNextAlarm();
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannel();

        // Acquire partial wake lock to keep CPU running for location updates
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "acmehrms:locationtracker");
        wakeLock.acquire();

        // Register alarm receiver
        IntentFilter filter = new IntentFilter(ACTION_ALARM_TICK);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(alarmReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(alarmReceiver, filter);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopTracking();
                return START_NOT_STICKY;
            }

            if (intent.hasExtra(EXTRA_SERVER_URL)) {
                serverUrl = intent.getStringExtra(EXTRA_SERVER_URL);
            }
            if (intent.hasExtra(EXTRA_AUTH_TOKEN)) {
                authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN);
            }
            if (intent.hasExtra(EXTRA_INTERVAL_MS)) {
                intervalMs = intent.getLongExtra(EXTRA_INTERVAL_MS, 2 * 60 * 1000);
            }

            // Persist to SharedPreferences so service can resume if restarted by OS
            SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
            if (authToken != null && !authToken.isEmpty()) {
                prefs.edit()
                        .putString("server_url", serverUrl)
                        .putString("auth_token", authToken)
                        .putLong("interval_ms", intervalMs)
                        .putBoolean("is_active", true)
                        .apply();
            } else {
                serverUrl = prefs.getString("server_url", serverUrl);
                authToken = prefs.getString("auth_token", "");
                intervalMs = prefs.getLong("interval_ms", intervalMs);
            }
        } else {
            // Restarted by OS after being killed
            SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
            boolean isActive = prefs.getBoolean("is_active", false);
            if (!isActive) {
                stopSelf();
                return START_NOT_STICKY;
            }
            serverUrl = prefs.getString("server_url", serverUrl);
            authToken = prefs.getString("auth_token", "");
            intervalMs = prefs.getLong("interval_ms", 2 * 60 * 1000);
        }

        startForegroundServiceNotification();
        startLocationTracking();

        return START_STICKY;
    }

    private void startForegroundServiceNotification() {
        int mins = (int)(intervalMs / 60000);
        Notification notification = buildNotification("Duty Active • Tracking location every " + mins + " mins");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        isTracking = true;
    }

    private Notification buildNotification(String statusText) {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Acme HRMS — Attendance Tracker")
                .setContentText(statusText)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    private void updateNotification(String statusText) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(statusText));
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Acme HRMS Location Tracker",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background location tracking during active employee work shift");
            channel.setShowBadge(false);
            NotificationManager manager = (NotificationManager) getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @SuppressLint("MissingPermission")
    private void startLocationTracking() {
        try {
            // Request continuous location updates for keeping GPS warm
            // Use 30s min interval for GPS updates (independent of punch interval)
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 30000, 0, this);
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 30000, 0, this);
            }

            Location lastGps = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            Location lastNet = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            if (lastGps != null) lastKnownLocation = lastGps;
            else if (lastNet != null) lastKnownLocation = lastNet;

        } catch (SecurityException se) {
            Log.e(TAG, "Location permission missing", se);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start location updates", e);
        }

        // Send immediate first punch
        Log.d(TAG, "Sending immediate first punch on service start");
        sendPunchRequest();

        // Schedule reliable alarm for next punch
        scheduleNextAlarm();
    }

    private void scheduleNextAlarm() {
        Intent alarmIntent = new Intent(ACTION_ALARM_TICK);
        alarmIntent.setPackage(getPackageName());
        PendingIntent pi = PendingIntent.getBroadcast(
                this, ALARM_REQUEST_CODE, alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        long triggerAt = System.currentTimeMillis() + intervalMs;

        // Use setExactAndAllowWhileIdle for Doze-resistant alarms
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }

        Log.d(TAG, "Next alarm scheduled in " + (intervalMs / 1000) + "s at " +
                new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date(triggerAt)));
    }

    private void cancelAlarm() {
        Intent alarmIntent = new Intent(ACTION_ALARM_TICK);
        alarmIntent.setPackage(getPackageName());
        PendingIntent pi = PendingIntent.getBroadcast(
                this, ALARM_REQUEST_CODE, alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        alarmManager.cancel(pi);
    }

    @SuppressLint("MissingPermission")
    private void sendPunchRequest() {
        new Thread(() -> {
            try {
                Location bestLocation = lastKnownLocation;

                // Try to get fresh location
                try {
                    Location gps = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                    Location net = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    if (gps != null && (bestLocation == null || gps.getTime() > bestLocation.getTime())) {
                        bestLocation = gps;
                    }
                    if (net != null && (bestLocation == null || net.getTime() > bestLocation.getTime())) {
                        bestLocation = net;
                    }
                } catch (Exception ignored) {}

                if (bestLocation == null) {
                    Log.w(TAG, "No GPS location available yet. Will retry on next alarm tick.");
                    return;
                }

                if (authToken == null || authToken.trim().isEmpty()) {
                    Log.w(TAG, "No auth token available for punch.");
                    return;
                }

                URL url = new URL(serverUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(30000);
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("action", "punch");
                payload.put("latitude", bestLocation.getLatitude());
                payload.put("longitude", bestLocation.getLongitude());
                payload.put("photo", "Tracker");

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes("utf-8"));
                }

                int code = conn.getResponseCode();
                StringBuilder response = new StringBuilder();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(
                        code >= 200 && code < 400 ? conn.getInputStream() : conn.getErrorStream()
                ))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                }

                String timeStr = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                punchCount++;

                if (code == 200) {
                    Log.d(TAG, "Tracker punch #" + punchCount + " SUCCESS at " + timeStr +
                            " | Lat: " + bestLocation.getLatitude() + " Lng: " + bestLocation.getLongitude());
                    updateNotification("Duty Active • Punch #" + punchCount + " sent at " + timeStr);
                } else {
                    Log.e(TAG, "Tracker punch FAILED HTTP " + code + ": " + response);
                    String respStr = response.toString().toLowerCase();

                    // If day/shift ended or checked out, automatically stop background service
                    if (respStr.contains("cannot punch after checking out") ||
                        respStr.contains("day has ended") ||
                        respStr.contains("cannot punch without checking in") ||
                        respStr.contains("shift and working day has ended") ||
                        respStr.contains("maximum working duration") ||
                        respStr.contains("unauthorized") ||
                        code == 401 || code == 403) {
                        Log.i(TAG, "Stopping native location tracker due to: " + respStr);
                        handler.post(() -> stopTracking());
                    }
                }

            } catch (Exception e) {
                Log.e(TAG, "Exception during background punch request", e);
            }
        }).start();
    }

    private void stopTracking() {
        isTracking = false;

        // Cancel alarm
        cancelAlarm();

        try {
            if (locationManager != null) {
                locationManager.removeUpdates(this);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error removing location updates", e);
        }

        // Unregister receiver safely
        try {
            unregisterReceiver(alarmReceiver);
        } catch (Exception ignored) {}

        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }

        SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
        prefs.edit().putBoolean("is_active", false).apply();

        stopForeground(true);
        stopSelf();
        Log.i(TAG, "Location tracking service stopped. Total punches sent: " + punchCount);
    }

    @Override
    public void onDestroy() {
        if (isTracking) {
            stopTracking();
        }
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // When user swipes the app away from recent tasks, DO NOT kill the foreground service.
        // It keeps running because employee is still checked in!
        Log.i(TAG, "App swiped away from recent tasks. Foreground service continues running.");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location != null) {
            lastKnownLocation = location;
        }
    }

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
