# Native Mobile Setup — SoloCab

Ce document liste les étapes manuelles à effectuer **après** avoir téléchargé le projet
en local et exécuté `npx cap sync` pour publier l'app sur le **Play Store** et l'**App Store**.

---

## 🎯 Objectif

Reproduire l'expérience Uber/Bolt :
- L'app s'ouvre **par-dessus toutes les autres applications** quand une course arrive
- Le téléphone **vibre + sonne** même verrouillé
- Le GPS continue **en arrière-plan** sans drainer la batterie
- Les notifications arrivent en **<2 secondes**

---

## 📱 ANDROID — `android/app/src/main/AndroidManifest.xml`

Ajoutez ces permissions **avant** la balise `<application>` :

```xml
<!-- Localisation -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Service de premier plan (GPS continu) -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- Notifications (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Réveil de l'app + son -->
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<!-- Affichage par-dessus les autres apps (style Uber/Bolt) -->
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

<!-- Plein écran sur lockscreen pour les courses entrantes -->
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />

<!-- Optimisation batterie -->
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

<!-- Microphone (appels VoIP in-app) -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

Et dans la balise `<activity>` principale, ajoutez :

```xml
<activity
  ...
  android:showWhenLocked="true"
  android:turnScreenOn="true"
  android:launchMode="singleTask">
```

---

## 🍎 iOS — `ios/App/App/Info.plist`

Ajoutez ces clés dans `<dict>` :

```xml
<!-- Localisation -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>SoloCab utilise votre position pour vous proposer des courses à proximité et guider les clients.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SoloCab a besoin de votre position en arrière-plan pour vous notifier des courses même quand l'app n'est pas ouverte.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Suivi GPS continu pour le partage de course et la gestion en temps réel.</string>

<!-- Notifications -->
<key>NSUserNotificationsUsageDescription</key>
<string>Recevez les alertes de courses immédiatement.</string>

<!-- Microphone -->
<key>NSMicrophoneUsageDescription</key>
<string>Pour passer des appels en toute confidentialité avec votre client.</string>

<!-- Caméra (QR codes, photos véhicule) -->
<key>NSCameraUsageDescription</key>
<string>Pour scanner les QR codes clients et photographier votre véhicule.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Pour télécharger les photos de votre véhicule.</string>

<!-- Background modes -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
  <string>processing</string>
  <string>voip</string>
  <string>audio</string>
</array>

<!-- Lancement automatique au démarrage -->
<key>UIApplicationSupportsIndirectInputEvents</key>
<true/>
```

---

## 🔔 Configuration FCM (Firebase Cloud Messaging) — Android

1. Créez un projet sur https://console.firebase.google.com
2. Ajoutez une **application Android** avec le package `app.lovable.bb7de2decc6d441aa3800f8d244f90e4`
3. Téléchargez `google-services.json` → placez-le dans `android/app/`
4. Récupérez la **Server Key** dans Firebase → Settings → Cloud Messaging
5. Dans Lovable, ajoutez le secret `FCM_SERVER_KEY` (Cloud → Secrets)

---

## 🍏 Configuration APNS (Apple Push) — iOS

1. Connectez-vous à https://developer.apple.com
2. Créez une **clé APNS** (.p8) dans Certificates → Keys
3. Notez la `Key ID` et le `Team ID`
4. Ajoutez les secrets :
   - `APNS_KEY_P8` (contenu du .p8)
   - `APNS_KEY_ID`
   - `APNS_TEAM_ID`
   - `APNS_BUNDLE_ID` = `app.lovable.bb7de2decc6d441aa3800f8d244f90e4`

---

## ✅ Vérification finale

Une fois l'app installée sur un device réel, allez dans :

**Dashboard chauffeur → bandeau "Autorisations à activer"** (ou directement `/permissions`)

Vous devriez voir :
- 📍 Localisation : Activée ✓
- 🚗 GPS en arrière-plan : Activée ✓
- 🔔 Notifications : Activée ✓
- 📱 Affichage par-dessus : À activer (Android only)
- 🔋 Batterie : À activer (Android only)

**Activez tout dans cet ordre** pour reproduire l'expérience Uber/Bolt.

---

## 🚨 Important pour la publication

- **Apple App Store** : déclarez explicitement les usages de localisation/notifications dans App Store Connect → Privacy
- **Google Play** : remplissez le formulaire **Permissions sensibles** pour `SYSTEM_ALERT_WINDOW`, `BACKGROUND_LOCATION` et `USE_FULL_SCREEN_INTENT` (justification = "réception de courses VTC en temps réel")
- Sans ces déclarations, vos apps seront **rejetées**.
