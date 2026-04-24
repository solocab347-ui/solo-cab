package com.solocab.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Service FCM custom : intercepte les data-messages "incoming_ride" pour
 * afficher une notification full-screen-intent qui réveille l'écran et
 * peut ouvrir l'app par-dessus le lockscreen — comportement Uber/Bolt.
 *
 * Pour les autres types de notifs, on laisse Capacitor PushNotifications
 * gérer normalement.
 */
public class SoloCabFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        // Le plugin @capacitor/push-notifications écoute déjà ce callback
        // et émet l'événement "registration" côté JS.
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        if ("incoming_ride".equals(type)) {
            showIncomingRideNotification(remoteMessage);
            return;
        }

        // Sinon : laisse Capacitor gérer (super = délégation au plugin)
        super.onMessageReceived(remoteMessage);
    }

    private void showIncomingRideNotification(RemoteMessage msg) {
        Map<String, String> data = msg.getData();
        String title = msg.getNotification() != null && msg.getNotification().getTitle() != null
                ? msg.getNotification().getTitle()
                : "🚖 Nouvelle course !";
        String body = msg.getNotification() != null && msg.getNotification().getBody() != null
                ? msg.getNotification().getBody()
                : "Course disponible à proximité";
        String rideId = data.get("ride_id");

        // Intent qui ouvre MainActivity en singleTask
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("type", "incoming_ride");
        if (rideId != null) openIntent.putExtra("ride_id", rideId);

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPi = PendingIntent.getActivity(this, 1, openIntent, piFlags);
        PendingIntent fullScreenPi = PendingIntent.getActivity(this, 2, openIntent, piFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(
                this, SoloCabApplication.RIDES_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(contentPi)
                .setFullScreenIntent(fullScreenPi, true)
                .setVibrate(new long[]{0, 400, 200, 400, 200, 400});

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify((int) (System.currentTimeMillis() % 100000), builder.build());
        }
    }
}
