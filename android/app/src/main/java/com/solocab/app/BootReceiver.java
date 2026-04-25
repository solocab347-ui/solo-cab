package com.solocab.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

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

    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String KEY_TRACKING_ENABLED = "solocab_gps_tracking_enabled";
    private static final int BOOT_NOTIFICATION_ID = 4242;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean wasTracking = prefs.getBoolean(KEY_TRACKING_ENABLED, false);
        if (!wasTracking) return;

        showReopenNotification(context);
    }

    private void showReopenNotification(Context context) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) return;
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPi = PendingIntent.getActivity(context, 0, launchIntent, flags);

        Notification notif = new NotificationCompat.Builder(context, SoloCabApplication.RIDES_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("SoloCab — réactivez votre disponibilité")
                .setContentText("Ouvrez SoloCab pour reprendre le suivi GPS et rester visible des clients.")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(
                        "Votre téléphone vient de redémarrer. Ouvrez SoloCab pour relancer le suivi GPS en arrière-plan et continuer à recevoir des courses."))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(contentPi)
                .setAutoCancel(true)
                .setOngoing(false)
                .build();

        nm.notify(BOOT_NOTIFICATION_ID, notif);
    }
}
