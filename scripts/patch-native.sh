#!/usr/bin/env bash
###############################################################################
# scripts/patch-native.sh
#
# Patch automatique des fichiers natifs SoloCab après `npx cap add android/ios`.
# Ajoute toutes les permissions nécessaires pour le mode "Uber/Bolt" :
#  - Notifications haute priorité (FCM/APNS)
#  - GPS arrière-plan (foreground service)
#  - Affichage par-dessus les autres apps (SYSTEM_ALERT_WINDOW)
#  - Plein écran sur lockscreen (USE_FULL_SCREEN_INTENT)
#  - Wake lock + désactivation optimisation batterie
#
# Usage :
#   chmod +x scripts/patch-native.sh
#   ./scripts/patch-native.sh
#
# Idempotent : peut être relancé sans dupliquer les permissions.
###############################################################################

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_MANIFEST="$ROOT/android/app/src/main/AndroidManifest.xml"
IOS_PLIST="$ROOT/ios/App/App/Info.plist"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 SoloCab — Patch natif Android & iOS${NC}"
echo

###############################################################################
# ANDROID
###############################################################################
if [ -f "$ANDROID_MANIFEST" ]; then
  echo -e "${GREEN}✓${NC} AndroidManifest.xml trouvé"

  # Permissions à ajouter
  ANDROID_PERMS=(
    "android.permission.ACCESS_FINE_LOCATION"
    "android.permission.ACCESS_COARSE_LOCATION"
    "android.permission.ACCESS_BACKGROUND_LOCATION"
    "android.permission.FOREGROUND_SERVICE"
    "android.permission.FOREGROUND_SERVICE_LOCATION"
    "android.permission.POST_NOTIFICATIONS"
    "android.permission.WAKE_LOCK"
    "android.permission.VIBRATE"
    "android.permission.RECEIVE_BOOT_COMPLETED"
    "android.permission.SYSTEM_ALERT_WINDOW"
    "android.permission.USE_FULL_SCREEN_INTENT"
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"
    "android.permission.RECORD_AUDIO"
    "android.permission.MODIFY_AUDIO_SETTINGS"
    "android.permission.INTERNET"
    "android.permission.ACCESS_NETWORK_STATE"
  )

  TMP=$(mktemp)
  cp "$ANDROID_MANIFEST" "$TMP"

  for PERM in "${ANDROID_PERMS[@]}"; do
    if grep -q "$PERM" "$TMP"; then
      echo -e "  ${YELLOW}↳${NC} $PERM (déjà présent)"
    else
      # Insérer juste avant <application
      sed -i.bak "s|<application|<uses-permission android:name=\"$PERM\" />\n    <application|" "$TMP"
      echo -e "  ${GREEN}+${NC} $PERM"
    fi
  done

  # Activité principale : showWhenLocked + turnScreenOn
  if ! grep -q 'android:showWhenLocked="true"' "$TMP"; then
    sed -i.bak 's|android:name="\.MainActivity"|android:name=".MainActivity"\n            android:showWhenLocked="true"\n            android:turnScreenOn="true"\n            android:launchMode="singleTask"|' "$TMP"
    echo -e "  ${GREEN}+${NC} MainActivity: showWhenLocked + turnScreenOn"
  fi

  rm -f "$TMP.bak"
  cp "$TMP" "$ANDROID_MANIFEST"
  rm "$TMP"
  echo -e "${GREEN}✅ AndroidManifest.xml patché${NC}"
else
  echo -e "${YELLOW}⚠️  android/ non trouvé. Lancez d'abord : npx cap add android${NC}"
fi

echo

###############################################################################
# iOS
###############################################################################
if [ -f "$IOS_PLIST" ]; then
  echo -e "${GREEN}✓${NC} Info.plist trouvé"

  add_plist_string() {
    local KEY="$1"
    local VALUE="$2"
    if ! /usr/libexec/PlistBuddy -c "Print :$KEY" "$IOS_PLIST" >/dev/null 2>&1; then
      /usr/libexec/PlistBuddy -c "Add :$KEY string $VALUE" "$IOS_PLIST"
      echo -e "  ${GREEN}+${NC} $KEY"
    else
      echo -e "  ${YELLOW}↳${NC} $KEY (déjà présent)"
    fi
  }

  add_plist_string "NSLocationWhenInUseUsageDescription" "SoloCab utilise votre position pour vous proposer des courses à proximité et guider les clients."
  add_plist_string "NSLocationAlwaysAndWhenInUseUsageDescription" "SoloCab a besoin de votre position en arrière-plan pour vous notifier des courses même quand l'app n'est pas ouverte."
  add_plist_string "NSLocationAlwaysUsageDescription" "Suivi GPS continu pour le partage de course et la gestion en temps réel."
  add_plist_string "NSUserNotificationsUsageDescription" "Recevez les alertes de courses immédiatement."
  add_plist_string "NSMicrophoneUsageDescription" "Pour passer des appels en toute confidentialité avec votre client."
  add_plist_string "NSCameraUsageDescription" "Pour scanner les QR codes clients et photographier votre véhicule."
  add_plist_string "NSPhotoLibraryUsageDescription" "Pour télécharger les photos de votre véhicule."

  # Background modes
  if ! /usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" "$IOS_PLIST" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" "$IOS_PLIST"
  fi
  for MODE in location fetch remote-notification processing voip audio; do
    if ! /usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" "$IOS_PLIST" 2>/dev/null | grep -q "\b$MODE\b"; then
      /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes: string $MODE" "$IOS_PLIST"
      echo -e "  ${GREEN}+${NC} UIBackgroundModes: $MODE"
    fi
  done

  echo -e "${GREEN}✅ Info.plist patché${NC}"
else
  echo -e "${YELLOW}⚠️  ios/ non trouvé. Sur Mac, lancez : npx cap add ios${NC}"
fi

echo
echo -e "${GREEN}🎉 Patch terminé !${NC}"
echo
echo "Étapes suivantes :"
echo "  1. Si Firebase n'est pas encore configuré → placez google-services.json dans android/app/"
echo "  2. npx cap sync"
echo "  3. npx cap run android  (ou ios)"
