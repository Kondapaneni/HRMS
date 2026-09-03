package com.example.acmehrms;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
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
import java.util.Timer;
import java.util.TimerTask;

public class LocationTrackerService extends Service implements LocationListener {

    private static final String TAG = "LocationTrackerSvc";
    public static final String CHANNEL_ID = "hrms_location_tracking_channel";
    public static final int NOTIFICATION_ID = 8848;

    public static final String ACTION_START = "ACTION_START_TRACKING";
    public static final String ACTION_STOP = "ACTION_STOP_TRACKING";

    public static final String EXTRA_SERVER_URL = "EXTRA_SERVER_URL";
    public static final String EXTRA_AUTH_TOKEN = "EXTRA_AUTH_TOKEN";
    public static final String EXTRA_INTERVAL_MS = "EXTRA_INTERVAL_MS";

    private LocationManager locationManager;
    private Timer punchTimer;
    private HandlerThread handlerThread;
    private Handler bgHandler;

    private String serverUrl = "https://hrms-qwv3.onrender.com/api/employee/attendance/punch";
    private String authToken = "";
    private long intervalMs = 2 * 60 * 1000; // default 2 minutes

    private Location lastKnownLocation = null;
    private boolean isTracking = false;
    private int punchCount = 0;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createNotificationChannel();

        // Create a dedicated background HandlerThread for location callbacks
        handlerThread = new HandlerThread("LocationTrackerThread");
        handlerThread.start();
        bgHandler = new Handler(handlerThread.getLooper());

        // Acquire partial wake lock to prevent CPU from sleeping
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "acmehrms:locationtracker");
        wakeLock.acquire();
        Log.i(TAG, "Service created. WakeLock acquired.");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                Log.i(TAG, "Received STOP action");
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

        if (!isTracking) {
            startForegroundServiceNotification();
            startLocationTracking();
        }

        return START_STICKY;
    }

    private void startForegroundServiceNotification() {
        int mins = (int)(intervalMs / 60000);
        Notification notification = buildNotification("Duty Active • Tracking every " + mins + " min(s)");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        isTracking = true;
        Log.i(TAG, "Foreground service started with notification");
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
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(NOTIFICATION_ID, buildNotification(statusText));
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to update notification", e);
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
            // Request continuous location updates every 30s to keep GPS warm
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 30000, 0, this, handlerThread.getLooper());
                Log.d(TAG, "GPS provider location updates started");
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 30000, 0, this, handlerThread.getLooper());
                Log.d(TAG, "Network provider location updates started");
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

        // Use java.util.Timer (independent of Android main looper, not affected by Doze for foreground services)
        if (punchTimer != null) {
            punchTimer.cancel();
        }
        punchTimer = new Timer("PunchTimer", true);
        punchTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                Log.d(TAG, "Timer tick #" + (punchCount + 1) + " - sending punch request");
                sendPunchRequest();
            }
        }, intervalMs, intervalMs);

        Log.i(TAG, "Punch timer started: interval = " + (intervalMs / 1000) + "s (" + (intervalMs / 60000) + " min)");
    }

    @SuppressLint("MissingPermission")
    private void sendPunchRequest() {
        // Ensure wake lock is held during punch
        if (wakeLock != null && !wakeLock.isHeld()) {
            try {
                wakeLock.acquire();
            } catch (Exception ignored) {}
        }

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
                Log.w(TAG, "No GPS location available yet. Will retry on next tick.");
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

            conn.disconnect();

            String timeStr = new SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(new Date());
            punchCount++;

            if (code == 200) {
                Log.i(TAG, "✓ Punch #" + punchCount + " at " + timeStr +
                        " | Lat:" + String.format("%.5f", bestLocation.getLatitude()) +
                        " Lng:" + String.format("%.5f", bestLocation.getLongitude()));
                updateNotification("Duty Active • Punch #" + punchCount + " at " + timeStr);
            } else {
                Log.e(TAG, "✗ Punch FAILED HTTP " + code + " at " + timeStr + ": " + response);
                String respStr = response.toString().toLowerCase();

                // If day/shift ended or checked out, automatically stop background service
                if (respStr.contains("cannot punch after checking out") ||
                    respStr.contains("day has ended") ||
                    respStr.contains("cannot punch without checking in") ||
                    respStr.contains("shift and working day has ended") ||
                    respStr.contains("maximum working duration") ||
                    respStr.contains("unauthorized") ||
                    code == 401 || code == 403) {
                    Log.i(TAG, "Auto-stopping: " + respStr);
                    // Post to main thread for safe service teardown
                    new Handler(getMainLooper()).post(() -> stopTracking());
                }
            }

        } catch (Exception e) {
            Log.e(TAG, "Exception during punch: " + e.getMessage(), e);
        }
    }

    private void stopTracking() {
        isTracking = false;

        // Cancel timer
        if (punchTimer != null) {
            punchTimer.cancel();
            punchTimer = null;
        }

        try {
            if (locationManager != null) {
                locationManager.removeUpdates(this);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error removing location updates", e);
        }

        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }

        // Stop handler thread
        if (handlerThread != null) {
            handlerThread.quitSafely();
        }

        SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
        prefs.edit().putBoolean("is_active", false).apply();

        stopForeground(true);
        stopSelf();
        Log.i(TAG, "Service stopped. Total punches sent: " + punchCount);
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
        Log.i(TAG, "App swiped away. Foreground service continues tracking.");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location != null) {
            lastKnownLocation = location;
            Log.d(TAG, "Location updated: " + location.getLatitude() + ", " + location.getLongitude() +
                    " (provider: " + location.getProvider() + ")");
        }
    }

    @Override
    public void onProviderEnabled(String provider) {
        Log.d(TAG, "Provider enabled: " + provider);
    }

    @Override
    public void onProviderDisabled(String provider) {
        Log.d(TAG, "Provider disabled: " + provider);
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
