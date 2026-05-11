package com.solocab.app;

import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.solocab.app.permissions.SoloCabPermissionsPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "SoloCabMainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SoloCabPermissionsPlugin.class);
        super.onCreate(savedInstanceState);

        // Android 14+ (API 34) : `setFullScreenIntent` requiert une permission
        // utilisateur explicite. Sans ça, les notifs "incoming_ride" dégradent
        // en heads-up classique → l'écran ne se réveille pas → le chauffeur
        // rate la course. On envoie l'utilisateur sur l'écran système une seule
        // fois, au premier lancement où la permission n'est pas accordée.
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                NotificationManager nm = getSystemService(NotificationManager.class);
                if (nm != null && !nm.canUseFullScreenIntent()) {
                    Intent i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                    i.setData(Uri.parse("package:" + getPackageName()));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                }
            }
        } catch (Exception ignored) {
            // Ne jamais crasher au boot pour une perm secondaire.
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        IncomingRideOverlayManager.dismiss(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.i(TAG, "app_foreground onResume");
    }

    @Override
    public void onPause() {
        Log.i(TAG, "app_background onPause");
        super.onPause();
    }

    @Override
    public void onStop() {
        Log.i(TAG, "app_background onStop");
        super.onStop();
    }

    @Override
    public void onDestroy() {
        Log.w(TAG, "activity_destroyed");
        super.onDestroy();
    }
}
