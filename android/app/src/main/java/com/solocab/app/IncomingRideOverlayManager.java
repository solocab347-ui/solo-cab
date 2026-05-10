package com.solocab.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.Map;

/**
 * Vraie surcouche Android SYSTEM_ALERT_WINDOW pour les courses entrantes.
 *
 * Le composant React GlobalRideOverlay ne peut s'afficher que dans la WebView : si
 * le chauffeur est sur l'écran d'accueil, Chrome, Waze, etc., il ne peut pas être
 * visible. Cette classe ajoute donc une fenêtre native via WindowManager dès que
 * le FCM data-only arrive.
 */
public final class IncomingRideOverlayManager {
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static View currentView;

    private IncomingRideOverlayManager() {}

    public static void show(Context context, Map<String, String> data) {
        if (!canDrawOverlays(context)) return;

        MAIN.post(() -> {
            try {
                dismiss(context);

                Context appContext = context.getApplicationContext();
                WindowManager wm = (WindowManager) appContext.getSystemService(Context.WINDOW_SERVICE);
                if (wm == null) return;

                String rideId = first(data.get("ride_id"), data.get("course_id"), data.get("id"));
                String title = first(data.get("title"), "🚖 Nouvelle course");
                String body = first(data.get("body"), "Une course vient d'arriver");
                String pickup = first(data.get("pickup_address"), data.get("pickup"), "Ouvrir SoloCab pour voir le départ");
                String price = first(data.get("price"), data.get("amount"), "");

                FrameLayout root = new FrameLayout(appContext);
                root.setBackgroundColor(Color.parseColor("#EE0D0A15"));
                root.setClickable(true);

                LinearLayout panel = new LinearLayout(appContext);
                panel.setOrientation(LinearLayout.VERTICAL);
                panel.setPadding(dp(appContext, 22), dp(appContext, 22), dp(appContext, 22), dp(appContext, 18));
                panel.setBackgroundColor(Color.parseColor("#FF1B1230"));
                panel.setClickable(true);

                TextView heading = text(appContext, title, 24, Color.parseColor("#FFE9D5FF"), true);
                TextView sub = text(appContext, body, 15, Color.parseColor("#CCFFFFFF"), false);
                TextView pickupView = text(appContext, "📍 " + pickup, 16, Color.WHITE, true);
                TextView priceView = text(appContext, price.isEmpty() ? "" : "💰 " + price, 18, Color.parseColor("#FF34D399"), true);

                panel.addView(heading, matchWrap());
                panel.addView(sub, withTopMargin(appContext, 6));
                panel.addView(pickupView, withTopMargin(appContext, 18));
                if (!price.isEmpty()) panel.addView(priceView, withTopMargin(appContext, 10));

                Button open = new Button(appContext);
                open.setText("OUVRIR LA COURSE");
                open.setTextSize(18);
                open.setTypeface(Typeface.DEFAULT_BOLD);
                open.setTextColor(Color.WHITE);
                open.setBackgroundColor(Color.parseColor("#FF8B5CF6"));
                open.setOnClickListener(v -> {
                    dismiss(appContext);
                    openRide(appContext, rideId, null);
                });
                panel.addView(open, buttonParams(appContext, 22));

                LinearLayout actions = new LinearLayout(appContext);
                actions.setOrientation(LinearLayout.HORIZONTAL);
                actions.setGravity(Gravity.CENTER);

                Button accept = new Button(appContext);
                accept.setText("✓ ACCEPTER");
                accept.setTextColor(Color.WHITE);
                accept.setTypeface(Typeface.DEFAULT_BOLD);
                accept.setBackgroundColor(Color.parseColor("#FF16A34A"));
                accept.setOnClickListener(v -> {
                    dismiss(appContext);
                    openRide(appContext, rideId, "accept");
                });

                Button decline = new Button(appContext);
                decline.setText("✕ REFUSER");
                decline.setTextColor(Color.WHITE);
                decline.setTypeface(Typeface.DEFAULT_BOLD);
                decline.setBackgroundColor(Color.parseColor("#FF374151"));
                decline.setOnClickListener(v -> {
                    dismiss(appContext);
                    openRide(appContext, rideId, "decline");
                });

                LinearLayout.LayoutParams actionParams = new LinearLayout.LayoutParams(0, dp(appContext, 56), 1f);
                actionParams.setMargins(0, 0, dp(appContext, 8), 0);
                actions.addView(accept, actionParams);
                LinearLayout.LayoutParams declineParams = new LinearLayout.LayoutParams(0, dp(appContext, 56), 1f);
                declineParams.setMargins(dp(appContext, 8), 0, 0, 0);
                actions.addView(decline, declineParams);
                panel.addView(actions, withTopMargin(appContext, 12));

                FrameLayout.LayoutParams panelParams = new FrameLayout.LayoutParams(
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.WRAP_CONTENT
                );
                panelParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
                int margin = dp(appContext, 18);
                panelParams.setMargins(margin, margin, margin, dp(appContext, 34));
                root.addView(panel, panelParams);

                int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;
                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.MATCH_PARENT,
                        type,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
                        android.graphics.PixelFormat.TRANSLUCENT
                );
                params.gravity = Gravity.CENTER;

                currentView = root;
                wm.addView(root, params);
                MAIN.postDelayed(() -> dismiss(appContext), 300_000);
            } catch (Exception ignored) {
                // La notification full-screen reste le fallback si le constructeur bloque l'overlay.
            }
        });
    }

    public static void dismiss(Context context) {
        if (currentView == null) return;
        try {
            WindowManager wm = (WindowManager) context.getApplicationContext().getSystemService(Context.WINDOW_SERVICE);
            if (wm != null) wm.removeView(currentView);
        } catch (Exception ignored) {
        } finally {
            currentView = null;
        }
    }

    private static void openRide(Context context, String rideId, String action) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("type", "incoming_ride");
        if (rideId != null && !rideId.isEmpty()) intent.putExtra("ride_id", rideId);
        if (action != null) intent.putExtra("ride_action", action);

        String safeRideId = rideId != null && !rideId.isEmpty() ? rideId : "pending";
        Uri uri = Uri.parse("solocab://ride/" + safeRideId + (action != null ? "?ride_action=" + action : ""));
        intent.setData(uri);
        context.startActivity(intent);
    }

    private static boolean canDrawOverlays(Context context) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context.getApplicationContext());
    }

    private static String first(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }

    private static String first(String a, String b, String fallback) {
        return first(first(a, b), fallback);
    }

    private static TextView text(Context context, String value, int sp, int color, boolean bold) {
        TextView tv = new TextView(context);
        tv.setText(value);
        tv.setTextSize(sp);
        tv.setTextColor(color);
        tv.setLineSpacing(0, 1.08f);
        if (bold) tv.setTypeface(Typeface.DEFAULT_BOLD);
        return tv;
    }

    private static LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT);
    }

    private static LinearLayout.LayoutParams withTopMargin(Context context, int topDp) {
        LinearLayout.LayoutParams p = matchWrap();
        p.setMargins(0, dp(context, topDp), 0, 0);
        return p;
    }

    private static LinearLayout.LayoutParams buttonParams(Context context, int topDp) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, dp(context, 62));
        p.setMargins(0, dp(context, topDp), 0, 0);
        return p;
    }

    private static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }
}