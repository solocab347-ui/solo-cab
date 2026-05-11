package com.solocab.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
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
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Foreground service Android natif pour le mode chauffeur ONLINE.
 *
 * Objectif VTC production : le suivi GPS et le heartbeat DB ne dépendent plus
 * du cycle React/WebView. Tant que le bouton online reste actif, Android garde
 * une notification persistante, un PARTIAL_WAKE_LOCK et des updates LocationManager.
 */
public class SoloCabDriverForegroundService extends Service {
    public static final String TAG = "SoloCabDriverService";
    public static final String ACTION_START = "com.solocab.app.driver_service.START";
    public static final String ACTION_STOP = "com.solocab.app.driver_service.STOP";
    public static final String EXTRA_DRIVER_ID = "driver_id";
    public static final String EXTRA_ACCESS_TOKEN = "access_token";
    public static final String EXTRA_REFRESH_TOKEN = "refresh_token";

    private static final String PREFS = "CapacitorStorage";
    private static final String KEY_ENABLED = "solocab_gps_tracking_enabled";
    private static final String KEY_DRIVER_ID = "solocab_native_driver_id";
    private static final String KEY_ACCESS_TOKEN = "solocab_native_access_token";
    private static final String KEY_REFRESH_TOKEN = "solocab_native_refresh_token";
    private static final String GPS_CHANNEL_ID = "solocab_driver_active";
    private static final int NOTIFICATION_ID = 73501;
    private static final long GPS_INTERVAL_MS = 8_000L;
    private static final float GPS_DISTANCE_M = 5f;
    private static final long HEARTBEAT_MS = 10_000L;
    private static final long STALE_LOG_MS = 30_000L;

    // Publishable backend config: safe in client/native code, private keys are never stored here.
    private static final String SUPABASE_URL = "https://iyothopplhbwcfrpxryc.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5b3Rob3BwbGhid2NmcnB4cnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5MTUsImV4cCI6MjA3OTIwODkxNX0.qnFWbejy-Tp3HkvHPI-O_43-3hzp61hjGTrYfnnsdxQ";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final AtomicBoolean uploadInFlight = new AtomicBoolean(false);

    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;
    private Location lastLocation;
    private long lastFixAt = 0L;
    private long lastStaleLogAt = 0L;
    private String driverId;
    private String accessToken;
    private String refreshToken;

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            if (location == null) return;
            lastLocation = location;
            lastFixAt = System.currentTimeMillis();
            Log.i(TAG, "GPS_FIX " + ts() + " provider=" + location.getProvider()
                    + " lat=" + location.getLatitude()
                    + " lng=" + location.getLongitude()
                    + " acc=" + location.getAccuracy());
            uploadLocation(location, "fix");
        }

        @Override public void onProviderEnabled(String provider) { Log.i(TAG, "provider_enabled " + provider + " " + ts()); }
        @Override public void onProviderDisabled(String provider) { Log.w(TAG, "provider_disabled " + provider + " " + ts()); }
        @Override public void onStatusChanged(String provider, int status, Bundle extras) { Log.i(TAG, "provider_status " + provider + " status=" + status + " " + ts()); }
    };

    private final Runnable heartbeat = new Runnable() {
        @Override
        public void run() {
            try {
                if (!isTrackingEnabled()) {
                    Log.i(TAG, "heartbeat_stop_disabled " + ts());
                    stopSelf();
                    return;
                }

                if (lastLocation != null) {
                    long age = System.currentTimeMillis() - lastFixAt;
                    Log.i(TAG, "GPS_HEARTBEAT " + ts() + " age_ms=" + age
                            + " lat=" + lastLocation.getLatitude()
                            + " lng=" + lastLocation.getLongitude());
                    uploadLocation(lastLocation, "heartbeat");
                    if (age > STALE_LOG_MS && System.currentTimeMillis() - lastStaleLogAt > STALE_LOG_MS) {
                        lastStaleLogAt = System.currentTimeMillis();
                        logGpsLoss("no_fix_timeout", age, lastLocation, "native_service_heartbeat_stale");
                    }
                } else {
                    Log.w(TAG, "GPS_HEARTBEAT_NO_FIX " + ts());
                    requestSingleBestLastKnown();
                }
            } catch (Exception e) {
                Log.e(TAG, "heartbeat_error", e);
            } finally {
                handler.postDelayed(this, HEARTBEAT_MS);
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "onCreate " + ts());
        createChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "onStartCommand action=" + action + " flags=" + flags + " startId=" + startId + " " + ts());

        if (ACTION_STOP.equals(action)) {
            stopTrackingAndSelf();
            return START_NOT_STICKY;
        }

        readIntentOrPrefs(intent);
        persistState(true);
        startAsForeground();
        startLocationTracking();
        handler.removeCallbacks(heartbeat);
        handler.post(heartbeat);
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        Log.w(TAG, "onTaskRemoved app_swiped_or_task_removed " + ts());
        if (isTrackingEnabled()) {
            Intent restart = buildStartIntent(this, driverId, accessToken, refreshToken);
            ContextCompat.startForegroundService(this, restart);
        }
    }

    @Override
    public void onDestroy() {
        Log.w(TAG, "onDestroy " + ts() + " enabled=" + isTrackingEnabled());
        stopLocationTracking();
        releaseWakeLock();
        handler.removeCallbacks(heartbeat);
        network.shutdownNow();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }

    public static Intent buildStartIntent(Context context, String driverId, String accessToken, String refreshToken) {
        Intent intent = new Intent(context, SoloCabDriverForegroundService.class);
        intent.setAction(ACTION_START);
        intent.putExtra(EXTRA_DRIVER_ID, driverId);
        intent.putExtra(EXTRA_ACCESS_TOKEN, accessToken);
        intent.putExtra(EXTRA_REFRESH_TOKEN, refreshToken);
        return intent;
    }

    public static Intent buildStopIntent(Context context) {
        Intent intent = new Intent(context, SoloCabDriverForegroundService.class);
        intent.setAction(ACTION_STOP);
        return intent;
    }

    private void readIntentOrPrefs(Intent intent) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (intent != null) {
            String did = intent.getStringExtra(EXTRA_DRIVER_ID);
            String at = intent.getStringExtra(EXTRA_ACCESS_TOKEN);
            String rt = intent.getStringExtra(EXTRA_REFRESH_TOKEN);
            if (did != null && !did.isEmpty()) driverId = did;
            if (at != null && !at.isEmpty()) accessToken = at;
            if (rt != null && !rt.isEmpty()) refreshToken = rt;
        }
        if (driverId == null) driverId = prefs.getString(KEY_DRIVER_ID, null);
        if (accessToken == null) accessToken = prefs.getString(KEY_ACCESS_TOKEN, null);
        if (refreshToken == null) refreshToken = prefs.getString(KEY_REFRESH_TOKEN, null);
    }

    private void persistState(boolean enabled) {
        SharedPreferences.Editor editor = getSharedPreferences(PREFS, MODE_PRIVATE).edit();
        editor.putBoolean(KEY_ENABLED, enabled);
        editor.putString(KEY_ENABLED, enabled ? "true" : "false");
        if (driverId != null) editor.putString(KEY_DRIVER_ID, driverId);
        if (accessToken != null) editor.putString(KEY_ACCESS_TOKEN, accessToken);
        if (refreshToken != null) editor.putString(KEY_REFRESH_TOKEN, refreshToken);
        editor.apply();
    }

    private boolean isTrackingEnabled() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            Object value = prefs.getAll().get(KEY_ENABLED);
            if (value instanceof Boolean) return (Boolean) value;
            if (value instanceof String) return "true".equalsIgnoreCase((String) value);
        } catch (Exception e) {
            Log.w(TAG, "read_enabled_failed", e);
        }
        return false;
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void startAsForeground() {
        Notification notification = buildNotification("SoloCab actif", "GPS actif — courses disponibles même écran verrouillé.");
        boolean hasLoc = hasLocationPermission();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && hasLoc) {
                // Android 10+ : type LOCATION uniquement si la permission runtime est accordée,
                // sinon Android 14+/15+ lève SecurityException et crashe le service (FGS type=location).
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                // Pas de permission GPS encore : on démarre quand même en foreground sans type
                // pour rester en vie ; le tracking GPS sera (re)tenté plus tard depuis le JS.
                startForeground(NOTIFICATION_ID, notification);
            }
            Log.i(TAG, "startForeground_ok hasLoc=" + hasLoc + " " + ts());
        } catch (SecurityException se) {
            Log.e(TAG, "startForeground_security_exception fallback_no_type", se);
            try {
                startForeground(NOTIFICATION_ID, notification);
            } catch (Exception ignored) {
                stopSelf();
            }
        }
    }

    private Notification buildNotification(String title, String body) {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open == null) open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent contentPi = PendingIntent.getActivity(this, 735, open, piFlags);

        return new NotificationCompat.Builder(this, GPS_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(
                        "SoloCab actif — GPS natif en arrière-plan, réception des courses et alertes hors application."))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setContentIntent(contentPi)
                .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(GPS_CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(
                GPS_CHANNEL_ID,
                "SoloCab actif",
                NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Service permanent chauffeur online : GPS et courses en arrière-plan");
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.setSound(null, null);
        ch.enableVibration(false);
        nm.createNotificationChannel(ch);
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm == null || wakeLock != null && wakeLock.isHeld()) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Log.i(TAG, "battery_optimization_ignored=" + pm.isIgnoringBatteryOptimizations(getPackageName()) + " " + ts());
            }
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SoloCab:DriverGpsWakeLock");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(6 * 60 * 60 * 1000L);
            Log.i(TAG, "wake_lock_acquired " + ts());
        } catch (Exception e) {
            Log.e(TAG, "wake_lock_failed", e);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
            wakeLock = null;
            Log.i(TAG, "wake_lock_released " + ts());
        } catch (Exception e) {
            Log.w(TAG, "wake_lock_release_failed", e);
        }
    }

    private void startLocationTracking() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Log.i(TAG, "overlay_permission=" + Settings.canDrawOverlays(this) + " " + ts());
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "location_permission_missing " + ts());
            logGpsLoss("foreground_service_lost", null, null, "location_permission_missing");
            return;
        }

        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (locationManager == null) {
            Log.e(TAG, "location_manager_null " + ts());
            return;
        }

        try {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, GPS_INTERVAL_MS, GPS_DISTANCE_M, locationListener, Looper.getMainLooper());
            Log.i(TAG, "gps_provider_requested " + ts());
        } catch (Exception e) {
            Log.e(TAG, "gps_provider_request_failed", e);
        }

        try {
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, GPS_INTERVAL_MS, GPS_DISTANCE_M, locationListener, Looper.getMainLooper());
            Log.i(TAG, "network_provider_requested " + ts());
        } catch (Exception e) {
            Log.w(TAG, "network_provider_request_failed", e);
        }

        requestSingleBestLastKnown();
    }

    private void requestSingleBestLastKnown() {
        if (locationManager == null) return;
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return;
        try {
            Location gps = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            Location net = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            Location best = gps != null ? gps : net;
            if (gps != null && net != null && net.getTime() > gps.getTime()) best = net;
            if (best != null) locationListener.onLocationChanged(best);
        } catch (Exception e) {
            Log.w(TAG, "last_known_failed", e);
        }
    }

    private void stopLocationTracking() {
        try {
            if (locationManager != null) locationManager.removeUpdates(locationListener);
            locationManager = null;
            Log.i(TAG, "location_updates_removed " + ts());
        } catch (Exception e) {
            Log.w(TAG, "remove_updates_failed", e);
        }
    }

    private void stopTrackingAndSelf() {
        Log.i(TAG, "stop_requested " + ts());
        persistState(false);
        stopLocationTracking();
        releaseWakeLock();
        stopForeground(true);
        stopSelf();
    }

    private void uploadLocation(Location location, String reason) {
        if (location == null || driverId == null || accessToken == null) {
            Log.w(TAG, "upload_skip_missing_state reason=" + reason + " driver=" + (driverId != null) + " token=" + (accessToken != null));
            return;
        }
        if (!uploadInFlight.compareAndSet(false, true)) return;

        network.execute(() -> {
            try {
                boolean ok = postLocation(location);
                if (!ok && refreshAccessToken()) {
                    ok = postLocation(location);
                }
                Log.i(TAG, "upload_" + (ok ? "ok" : "failed") + " reason=" + reason + " " + ts());
            } catch (Exception e) {
                Log.e(TAG, "upload_exception reason=" + reason, e);
            } finally {
                uploadInFlight.set(false);
            }
        });
    }

    private boolean postLocation(Location location) throws Exception {
        URL url = new URL(SUPABASE_URL + "/rest/v1/rpc/update_driver_location_batch");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(10_000);
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
        conn.setRequestProperty("Authorization", "Bearer " + accessToken);
        conn.setRequestProperty("Prefer", "return=minimal");

        JSONObject body = new JSONObject();
        body.put("p_driver_id", driverId);
        body.put("p_latitude", location.getLatitude());
        body.put("p_longitude", location.getLongitude());
        body.put("p_accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }

        int code = conn.getResponseCode();
        if (code >= 200 && code < 300) return true;
        String err = readResponse(conn);
        Log.w(TAG, "post_location_http_" + code + " " + err);
        return false;
    }

    private boolean refreshAccessToken() {
        if (refreshToken == null || refreshToken.isEmpty()) return false;
        try {
            URL url = new URL(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout(10_000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
            JSONObject body = new JSONObject();
            body.put("refresh_token", refreshToken);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                Log.w(TAG, "refresh_http_" + code + " " + readResponse(conn));
                return false;
            }
            JSONObject json = new JSONObject(readResponse(conn));
            accessToken = json.optString("access_token", accessToken);
            refreshToken = json.optString("refresh_token", refreshToken);
            persistState(true);
            Log.i(TAG, "token_refresh_ok " + ts());
            return accessToken != null && !accessToken.isEmpty();
        } catch (Exception e) {
            Log.e(TAG, "token_refresh_failed", e);
            return false;
        }
    }

    private void logGpsLoss(String lossType, Long gapMs, Location loc, String detail) {
        if (driverId == null || accessToken == null) return;
        network.execute(() -> {
            try {
                URL url = new URL(SUPABASE_URL + "/rest/v1/gps_loss_log");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(10_000);
                conn.setReadTimeout(10_000);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + accessToken);
                conn.setRequestProperty("Prefer", "return=minimal");
                JSONObject body = new JSONObject();
                body.put("driver_id", driverId);
                body.put("loss_type", lossType);
                body.put("gap_ms", gapMs == null ? JSONObject.NULL : gapMs);
                body.put("last_known_lat", loc == null ? JSONObject.NULL : loc.getLatitude());
                body.put("last_known_lng", loc == null ? JSONObject.NULL : loc.getLongitude());
                JSONObject details = new JSONObject();
                details.put("source", "native_android_service");
                details.put("detail", detail);
                details.put("timestamp", ts());
                body.put("details", details);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }
                Log.i(TAG, "gps_loss_log_http_" + conn.getResponseCode() + " type=" + lossType);
            } catch (Exception e) {
                Log.w(TAG, "gps_loss_log_failed", e);
            }
        });
    }

    private String readResponse(HttpURLConnection conn) {
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(
                    conn.getResponseCode() >= 400 ? conn.getErrorStream() : conn.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private static String ts() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date());
    }
}
