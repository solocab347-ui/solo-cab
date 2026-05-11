package com.solocab.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.core.content.ContextCompat;

/**
 * BootReceiver — relance le rappel de tracking GPS après un reboot du téléphone
 * ou un remplacement de package (mise à jour de l'app).
 *
 * Le foreground service `BackgroundGeolocation` ne peut être démarré que depuis
 * un contexte d'activité (limitations Android 12+). On affiche donc une notification
 * persistante qui invite le chauffeur à rouvrir SoloCab pour réactiver le tracking,
 * uniquement si la session précédente était "active" (cache SharedPreferences).
 *
 * Le flag `gps_tracking_enabled` est écrit côté JS (useDriverBackgroundGPS) via
 * @capacitor/preferences chaque fois que le tracking démarre/arrête.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "SoloCabBootReceiver";
    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String KEY_TRACKING_ENABLED = "solocab_gps_tracking_enabled";
    private static final String KEY_DRIVER_ID = "solocab_native_driver_id";
    private static final String KEY_ACCESS_TOKEN = "solocab_native_access_token";
    private static final String KEY_REFRESH_TOKEN = "solocab_native_refresh_token";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        Object raw = prefs.getAll().get(KEY_TRACKING_ENABLED);
        boolean wasTracking = raw instanceof Boolean ? (Boolean) raw : "true".equals(String.valueOf(raw));
        if (!wasTracking) return;

        String driverId = prefs.getString(KEY_DRIVER_ID, null);
        String accessToken = prefs.getString(KEY_ACCESS_TOKEN, null);
        String refreshToken = prefs.getString(KEY_REFRESH_TOKEN, null);
        if (driverId == null || accessToken == null) {
            Log.w(TAG, "boot_restart_skipped_missing_session action=" + action);
            return;
        }

        Intent serviceIntent = SoloCabDriverForegroundService.buildStartIntent(context, driverId, accessToken, refreshToken);
        ContextCompat.startForegroundService(context, serviceIntent);
        Log.i(TAG, "boot_restart_service_started action=" + action);
    }
}
