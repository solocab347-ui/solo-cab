package com.solocab.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Service FCM custom :
 *  - Pour data-message "incoming_ride" : notification full-screen-intent style Uber/Bolt
 *    (réveille l'écran, contourne le lockscreen, actions inline Accepter/Refuser).
 *  - Pour les autres types : laisse Capacitor PushNotifications gérer.
 *
 * Note : Android n'autorise plus les vrais "system overlays" (TYPE_APPLICATION_OVERLAY)
 * pour ce type d'usage à cause des restrictions de Background Activity Start (Android 10+).
 * La technique recommandée par Google = full-screen intent + setShowWhenLocked + setTurnScreenOn
 * sur la MainActivity, ce qui est déjà configuré dans AndroidManifest.xml.
 * C'est exactement la technique utilisée par Uber et Bolt en 2024.
 */
public class SoloCabFirebaseMessagingService extends FirebaseMessagingService {

    public static final String ACTION_ACCEPT_RIDE = "com.solocab.app.ACTION_ACCEPT_RIDE";
    public static final String ACTION_DECLINE_RIDE = "com.solocab.app.ACTION_DECLINE_RIDE";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        if ("incoming_ride".equals(type)) {
            showIncomingRideNotification(remoteMessage);
            return;
        }

        super.onMessageReceived(remoteMessage);
    }

    private void showIncomingRideNotification(RemoteMessage msg) {
        Map<String, String> data = msg.getData();
        String title = data.get("title") != null
                ? data.get("title")
                : (msg.getNotification() != null && msg.getNotification().getTitle() != null
                    ? msg.getNotification().getTitle()
                    : "🚖 Nouvelle course !");
        String body = data.get("body") != null
                ? data.get("body")
                : (msg.getNotification() != null && msg.getNotification().getBody() != null
                    ? msg.getNotification().getBody()
                    : "Course disponible à proximité");
        String rideId = data.get("ride_id");
        String pickupAddress = data.get("pickup_address");
        String price = data.get("price");

        // Body enrichi avec adresse + prix
        StringBuilder bigText = new StringBuilder(body);
        if (pickupAddress != null && !pickupAddress.isEmpty()) {
            bigText.append("\n📍 ").append(pickupAddress);
        }
        if (price != null && !price.isEmpty()) {
            bigText.append("\n💰 ").append(price);
        }

        // ── Intent principal : ouvre l'app sur la course ──
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("type", "incoming_ride");
        if (rideId != null) {
            openIntent.putExtra("ride_id", rideId);
            openIntent.setData(Uri.parse("solocab://ride/" + rideId));
        }

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentPi = PendingIntent.getActivity(this, 1, openIntent, piFlags);
        PendingIntent fullScreenPi = PendingIntent.getActivity(this, 2, openIntent, piFlags);

        // ── Action ACCEPTER : ouvre l'app et passe l'action en extra ──
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        acceptIntent.setAction(ACTION_ACCEPT_RIDE);
        acceptIntent.putExtra("type", "incoming_ride");
        acceptIntent.putExtra("ride_action", "accept");
        if (rideId != null) acceptIntent.putExtra("ride_id", rideId);
        PendingIntent acceptPi = PendingIntent.getActivity(this, 3, acceptIntent, piFlags);

        // ── Action REFUSER ──
        Intent declineIntent = new Intent(this, MainActivity.class);
        declineIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        declineIntent.setAction(ACTION_DECLINE_RIDE);
        declineIntent.putExtra("type", "incoming_ride");
        declineIntent.putExtra("ride_action", "decline");
        if (rideId != null) declineIntent.putExtra("ride_id", rideId);
        PendingIntent declinePi = PendingIntent.getActivity(this, 4, declineIntent, piFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(
                this, SoloCabApplication.RIDES_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText.toString()))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(contentPi)
                .setFullScreenIntent(fullScreenPi, true)
                .setVibrate(new long[]{0, 400, 200, 400, 200, 400})
                .addAction(R.mipmap.ic_launcher, "✅ Accepter", acceptPi)
                .addAction(R.mipmap.ic_launcher, "❌ Refuser", declinePi);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            // ID stable basé sur rideId pour éviter empilement
            int notifId = rideId != null ? rideId.hashCode() : (int) (System.currentTimeMillis() % 100000);
            nm.notify(notifId, builder.build());
        }
    }
}
