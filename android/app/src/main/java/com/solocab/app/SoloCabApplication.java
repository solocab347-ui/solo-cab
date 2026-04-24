package com.solocab.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.os.Build;

/**
 * Application class — initialise le canal de notification "solocab_rides"
 * avec IMPORTANCE_HIGH dès le boot, AVANT toute notif.
 *
 * Sans cette étape, les notifs FCM reçues app fermée n'auraient pas le bon canal
 * et ne déclencheraient ni le son, ni la vibration, ni le réveil d'écran.
 */
public class SoloCabApplication extends Application {

    public static final String RIDES_CHANNEL_ID = "solocab_rides";

    @Override
    public void onCreate() {
        super.onCreate();
        createRidesChannel();
    }

    private void createRidesChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Si déjà créé, pas de re-création (Android l'ignore mais autant être propre)
        if (nm.getNotificationChannel(RIDES_CHANNEL_ID) != null) return;

        NotificationChannel ch = new NotificationChannel(
                RIDES_CHANNEL_ID,
                "Nouvelles courses",
                NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Alertes de courses entrantes — réveil immédiat");
        ch.enableLights(true);
        ch.setLightColor(Color.parseColor("#FF6B00"));
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 400});
        ch.setLockscreenVisibility(NotificationManager.IMPORTANCE_HIGH);
        ch.setBypassDnd(true);

        // Son par défaut système (pas de fichier custom pour éviter les crashs MediaPlayer)
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        ch.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, attrs);

        nm.createNotificationChannel(ch);
    }
}
