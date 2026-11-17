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
import android.os.SystemClock;
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

    private static final String TAG = "LocationTrackerSvc";
    public static final String CHANNEL_ID = "hrms_location_tracking_channel";
    public static final int NOTIFICATION_ID = 8848;
    public static final int ALARM_REQUEST_CODE = 8849;

    public static final String ACTION_START = "ACTION_START_TRACKING";
    public static final String ACTION_STOP = "ACTION_STOP_TRACKING";
    public static final String ACTION_PUNCH_TICK = "ACTION_PUNCH_TICK";

    public static final String EXTRA_SERVER_URL = "EXTRA_SERVER_URL";
    public static final String EXTRA_AUTH_TOKEN = "EXTRA_AUTH_TOKEN";
    public static final String EXTRA_INTERVAL_MS = "EXTRA_INTERVAL_MS";

    private LocationManager locationManager;
    private HandlerThread handlerThread;
    private Handler bgHandler;

    private String serverUrl = "";
    private String authToken = "";
    private long intervalMs = 15 * 60 * 1000; // default 15 minutes

    private Location lastKnownLocation = null;
    private boolean isTracking = false;
    private int punchCount = 0;
    private PowerManager.WakeLock wakeLock;

    /**
     * Primary recurring punch loop that runs on the dedicated background HandlerThread.
     * Unlike AlarmManager.setExactAndAllowWhileIdle (which Android OS throttles to 9-15 min in Doze),
     * a HandlerThread inside a ForegroundService with PARTIAL_WAKE_LOCK can execute at exact
     * sub-9-minute intervals (e.g. 1m, 2m, 5m).
     */
    private final Runnable punchTickRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isTracking) return;
            if (BuildConfig.DEBUG) Log.d(TAG, "Executing punchTickRunnable...");
            try {
                fetchDynamicIntervalFromServer();
                sendPunchRequest();
            } catch (Exception e) {
                if (BuildConfig.DEBUG) Log.e(TAG, "Error in punchTickRunnable: " + e.getMessage(), e);
            } finally {
                if (isTracking && bgHandler != null) {
                    bgHandler.removeCallbacks(this);
                    bgHandler.postDelayed(this, intervalMs);
                    if (BuildConfig.DEBUG) Log.i(TAG, "Scheduled next Handler tick in " + (intervalMs / 1000) + "s (" + (intervalMs / 60000) + " min)");
                    // Also schedule AlarmManager as watchdog in case CPU sleeps
                    scheduleNextPunchAlarm();
                }
            }
        }
    };

    private void restoreFromPreferences() {
        try {
            SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
            serverUrl = prefs.getString("server_url", serverUrl);
            String restored = TrackerTokenStore.load(this);
            authToken = restored != null ? restored : "";
            intervalMs = prefs.getLong("interval_ms", intervalMs);
        } catch (Exception e) {
            if (BuildConfig.DEBUG) Log.w(TAG, "Error restoring prefs: " + e.getMessage());
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createNotificationChannel();

        // Create a dedicated background HandlerThread for location callbacks and interval ticks
        handlerThread = new HandlerThread("LocationTrackerThread");
        handlerThread.start();
        bgHandler = new Handler(handlerThread.getLooper());

        // Acquire partial wake lock to prevent CPU from sleeping while duty is active
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "acmehrms:locationtracker");
            wakeLock.acquire();
        }

        restoreFromPreferences();
        if (BuildConfig.DEBUG) Log.i(TAG, "Service created. WakeLock acquired. Loaded interval=" + (intervalMs / 60000) + "m");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // A React WebView reload can send ACTION_START again while the native
        // service is already running. Preserve the existing punch deadline
        // unless the configured interval actually changes.
        final long previousIntervalMs = intervalMs;
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                if (BuildConfig.DEBUG) Log.i(TAG, "Received STOP action");
                stopTracking();
                return START_NOT_STICKY;
            }

            if (ACTION_PUNCH_TICK.equals(action)) {
                if (BuildConfig.DEBUG) Log.d(TAG, "Received ACTION_PUNCH_TICK from AlarmManager (Watchdog/Wakeup)");
                restoreFromPreferences();
                SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
                boolean isActive = prefs.getBoolean("is_active", false);

                if (isActive && TrackerTokenStore.trustedEndpoint(serverUrl)
                        && authToken != null && !authToken.isEmpty()) {
                    if (!isTracking) {
                        startForegroundServiceNotification();
                        startLocationTracking();
                    } else if (bgHandler != null) {
                        bgHandler.removeCallbacks(punchTickRunnable);
                        bgHandler.post(punchTickRunnable);
                    }
                } else {
                    // A migrated/corrupt credential must never restart tracking.
                    prefs.edit().putBoolean("is_active", false).apply();
                    stopSelf();
                    return START_NOT_STICKY;
                }
                return START_STICKY;
            }

            if (intent.hasExtra(EXTRA_SERVER_URL)) {
                serverUrl = intent.getStringExtra(EXTRA_SERVER_URL);
            }
            if (intent.hasExtra(EXTRA_AUTH_TOKEN)) {
                authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN);
            }
            if (intent.hasExtra(EXTRA_INTERVAL_MS)) {
                intervalMs = intent.getLongExtra(EXTRA_INTERVAL_MS, 15 * 60 * 1000);
            }

            // Persist only AES-GCM ciphertext. Existing installations are
            // migrated by TrackerTokenStore.load() on first restart.
            SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
            if (authToken != null && !authToken.isEmpty()) {
                try {
                    TrackerTokenStore.save(this, authToken);
                    prefs.edit()
                            .putString("server_url", serverUrl)
                            .putLong("interval_ms", intervalMs)
                            .putBoolean("is_active", true)
                            .apply();
                } catch (Exception e) {
                    TrackerTokenStore.clear(this);
                    prefs.edit().putBoolean("is_active", false).apply();
                    authToken = "";
                    stopSelf();
                    return START_NOT_STICKY;
                }
            } else {
                restoreFromPreferences();
            }
        } else {
            // Restarted by OS after being killed
            restoreFromPreferences();
            SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
            boolean isActive = prefs.getBoolean("is_active", false);
            if (!isActive) {
                stopSelf();
                return START_NOT_STICKY;
            }
        }

        // SEC-006: never resume native telemetry with a missing token or an
        // untrusted URL, even if old preferences survived an app upgrade.
        if (!TrackerTokenStore.trustedEndpoint(serverUrl)
                || authToken == null || authToken.isEmpty()) {
            TrackerTokenStore.clear(this);
            getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE)
                    .edit().putBoolean("is_active", false).apply();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!isTracking) {
            startForegroundServiceNotification();
            startLocationTracking();
        } else {
            // Idempotent START: reopening HRMS must not postpone the next punch.
            // Only an actual interval change reschedules Handler and watchdog.
            if (intervalMs != previousIntervalMs) {
                int mins = Math.max(1, (int)(intervalMs / 60000));
                updateNotification("Duty Active • Tracking every " + mins + " min(s)");
                if (bgHandler != null) {
                    bgHandler.removeCallbacks(punchTickRunnable);
                    bgHandler.postDelayed(punchTickRunnable, intervalMs);
                }
                scheduleNextPunchAlarm();
                if (BuildConfig.DEBUG) Log.i(TAG, "Tracking interval changed to " + mins + " min(s); next punch rescheduled.");
            } else {
                // Also avoid needlessly reposting a dismissed notification.
                if (BuildConfig.DEBUG) Log.d(TAG, "Duplicate START ignored; existing punch deadline preserved.");
            }
        }

        return START_STICKY;
    }

    private void startForegroundServiceNotification() {
        int mins = Math.max(1, (int)(intervalMs / 60000));
        Notification notification = buildNotification("Duty Active • Tracking every " + mins + " min(s)");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        isTracking = true;
        if (BuildConfig.DEBUG) Log.i(TAG, "Foreground service started with notification");
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
            if (BuildConfig.DEBUG) Log.w(TAG, "Failed to update notification", e);
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
                if (BuildConfig.DEBUG) Log.d(TAG, "GPS provider location updates started");
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 30000, 0, this, handlerThread.getLooper());
                if (BuildConfig.DEBUG) Log.d(TAG, "Network provider location updates started");
            }

            Location lastGps = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            Location lastNet = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            if (lastGps != null) lastKnownLocation = lastGps;
            else if (lastNet != null) lastKnownLocation = lastNet;

        } catch (SecurityException se) {
            if (BuildConfig.DEBUG) Log.e(TAG, "Location permission missing", se);
        } catch (Exception e) {
            if (BuildConfig.DEBUG) Log.e(TAG, "Failed to start location updates", e);
        }

        // Trigger immediate first punch and start the recurring loop
        if (BuildConfig.DEBUG) Log.d(TAG, "Starting recurring punch loop via bgHandler");
        if (bgHandler != null) {
            bgHandler.removeCallbacks(punchTickRunnable);
            bgHandler.post(punchTickRunnable);
        }
    }

    private void scheduleNextPunchAlarm() {
        if (!isTracking) return;
        try {
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                Intent tickIntent = new Intent(this, LocationTrackerService.class);
                tickIntent.setAction(ACTION_PUNCH_TICK);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pi = PendingIntent.getService(this, ALARM_REQUEST_CODE, tickIntent, flags);

                long triggerAtMillis = SystemClock.elapsedRealtime() + intervalMs;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pi);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pi);
                } else {
                    alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pi);
                }
                if (BuildConfig.DEBUG) Log.d(TAG, "Watchdog alarm set for " + (intervalMs / 1000) + "s");
            }
        } catch (Exception e) {
            if (BuildConfig.DEBUG) Log.e(TAG, "Failed to schedule punch alarm: " + e.getMessage(), e);
        }
    }

    /**
     * Self-fetch the dynamic tracking interval from the server.
     * Called on every punch tick so the native service stays in sync
     * with admin settings WITHOUT relying on the WebView.
     */
    private void fetchDynamicIntervalFromServer() {
        try {
            String newsUrl = serverUrl.replace("/employee/attendance/punch", "/news");
            URL url = new URL(newsUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("GET");
            if (authToken != null && !authToken.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
            }
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                StringBuilder sb = new StringBuilder();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        sb.append(line);
                    }
                }
                JSONObject resp = new JSONObject(sb.toString());
                if (resp.has("tracking_interval_minutes")) {
                    int serverMins = Math.max(1, resp.getInt("tracking_interval_minutes"));
                    long newIntervalMs = serverMins * 60L * 1000;
                    if (newIntervalMs != intervalMs) {
                        long oldIntervalMs = intervalMs;
                        intervalMs = newIntervalMs;

                        // Persist to SharedPreferences
                        SharedPreferences prefs = getSharedPreferences("hrms_tracker_prefs", MODE_PRIVATE);
                        prefs.edit().putLong("interval_ms", intervalMs).apply();

                        int oldMins = (int)(oldIntervalMs / 60000);
                        updateNotification("Duty Active • Tracking every " + serverMins + " min(s)");
                        if (BuildConfig.DEBUG) Log.i(TAG, "Dynamic interval updated from server: " + oldMins + " min(s) -> " + serverMins + " min(s)");
                    }
                }
            }
            conn.disconnect();
        } catch (Exception e) {
            if (BuildConfig.DEBUG) Log.w(TAG, "Failed to fetch dynamic interval from server (using current): " + e.getMessage());
        }
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
                if (BuildConfig.DEBUG) Log.w(TAG, "No GPS location available yet. Will retry on next tick.");
                return;
            }

            if (authToken == null || authToken.trim().isEmpty()) {
                if (BuildConfig.DEBUG) Log.w(TAG, "No auth token available for punch.");
                return;
            }

            URL url = new URL(serverUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
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
                if (BuildConfig.DEBUG) Log.i(TAG, "Punch accepted by HRMS (HTTP 200)");
                updateNotification("Duty Active • Punch #" + punchCount + " at " + timeStr);
            } else {
                if (BuildConfig.DEBUG) Log.w(TAG, "Punch request rejected (HTTP " + code + ")");
                String respStr = response.toString().toLowerCase();

                // If day/shift ended or checked out, automatically stop background service
                if (respStr.contains("cannot punch after checking out") ||
                    respStr.contains("day has ended") ||
                    respStr.contains("cannot punch without checking in") ||
                    respStr.contains("shift and working day has ended") ||
                    respStr.contains("maximum working duration") ||
                    respStr.contains("unauthorized") ||
                    code == 401 || code == 403) {
                    if (BuildConfig.DEBUG) Log.i(TAG, "Auto-stopping native tracking after server rejection");
                    // Post to main thread for safe service teardown
                    new Handler(getMainLooper()).post(() -> stopTracking());
                }
            }

        } catch (Exception e) {
            if (BuildConfig.DEBUG) Log.e(TAG, "Exception during punch: " + e.getMessage(), e);
        }
    }

    private void stopTracking() {
        isTracking = false;

        // Cancel recurring handler tick
        if (bgHandler != null) {
            bgHandler.removeCallbacks(punchTickRunnable);
        }

        // Cancel scheduled alarm
        try {
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                Intent tickIntent = new Intent(this, LocationTrackerService.class);
                tickIntent.setAction(ACTION_PUNCH_TICK);
                int flags = PendingIntent.FLAG_NO_CREATE;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pi = PendingIntent.getService(this, ALARM_REQUEST_CODE, tickIntent, flags);
                if (pi != null) {
                    alarmManager.cancel(pi);
                    pi.cancel();
                }
            }
        } catch (Exception ignored) {}

        try {
            if (locationManager != null) {
                locationManager.removeUpdates(this);
            }
        } catch (Exception e) {
            if (BuildConfig.DEBUG) Log.e(TAG, "Error removing location updates", e);
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
        TrackerTokenStore.clear(this);
        authToken = "";

        stopForeground(true);
        stopSelf();
        if (BuildConfig.DEBUG) Log.i(TAG, "Service stopped. Total punches sent: " + punchCount);
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
        if (BuildConfig.DEBUG) Log.i(TAG, "App swiped away. Foreground service continues tracking.");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location != null) {
            lastKnownLocation = location;
            if (BuildConfig.DEBUG) Log.d(TAG, "Location callback received");
        }
    }

    @Override
    public void onProviderEnabled(String provider) {
        if (BuildConfig.DEBUG) Log.d(TAG, "Provider enabled: " + provider);
    }

    @Override
    public void onProviderDisabled(String provider) {
        if (BuildConfig.DEBUG) Log.d(TAG, "Provider disabled: " + provider);
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
