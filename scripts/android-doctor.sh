#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_DETECTED=0

if source "$ROOT_DIR/scripts/android-java-home.sh" >/dev/null 2>&1; then
  JAVA_DETECTED=1
fi

red() { printf '\033[0;31m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$1"; }

HAS_ERROR=0

echo "SoloCab Android Doctor"
echo

if [ "$JAVA_DETECTED" -eq 1 ] && command -v java >/dev/null 2>&1; then
  green "✅ Java détecté"
  java -version 2>&1 | head -n 3
else
  red "❌ Java JDK 17/21 introuvable dans PATH ou emplacements Android Studio connus"
  HAS_ERROR=1
fi

if [ -n "${JAVA_HOME:-}" ]; then
  green "✅ JAVA_HOME défini : $JAVA_HOME"
else
  red "❌ JAVA_HOME non défini"
  HAS_ERROR=1
fi

if [ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ]; then
  green "✅ Android SDK détecté"
  echo "ANDROID_HOME=${ANDROID_HOME:-<non défini>}"
  echo "ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-<non défini>}"
else
  yellow "⚠️ ANDROID_HOME / ANDROID_SDK_ROOT non défini — Android Studio doit installer/configurer le SDK."
fi

if [ -d "$ROOT_DIR/android" ]; then
  green "✅ Dossier android/ présent"
else
  red "❌ Dossier android/ absent"
  HAS_ERROR=1
fi

if [ -x "$ROOT_DIR/android/gradlew" ]; then
  green "✅ Gradle wrapper exécutable"
else
  red "❌ android/gradlew absent ou non exécutable"
  HAS_ERROR=1
fi

echo
if [ "$HAS_ERROR" -eq 1 ]; then
  red "Android/Gradle ne peut pas builder tant que Java/JAVA_HOME ne sont pas configurés."
  echo "Installe Android Studio avec JDK 17 ou 21, puis relance :"
  echo "  npm install --legacy-peer-deps"
  echo "  npm run build"
  echo "  npx cap sync android"
  echo "  cd android && ./gradlew assembleDebug"
  exit 1
fi

green "✅ Environnement Android prêt pour Gradle."