#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

red() { printf '\033[0;31m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$1"; }

HAS_ERROR=0

for forbidden_file in \
  "$ROOT_DIR/src/registerSW.ts" \
  "$ROOT_DIR/src/components/PWAInstallBanner.tsx" \
  "$ROOT_DIR/src/contexts/PWABannerContext.tsx" \
  "$ROOT_DIR/src/pages/InstallPWA.tsx" \
  "$ROOT_DIR/public/sw.js" \
  "$ROOT_DIR/public/service-worker.js" \
  "$ROOT_DIR/public/manifest.webmanifest" \
  "$ROOT_DIR/public/pwa-192x192.png" \
  "$ROOT_DIR/public/pwa-512x512.png" \
  "$ROOT_DIR/dist/sw.js" \
  "$ROOT_DIR/dist/service-worker.js" \
  "$ROOT_DIR/dist/manifest.webmanifest"; do
  if [ -e "$forbidden_file" ]; then
    red "❌ Fichier PWA interdit détecté : ${forbidden_file#$ROOT_DIR/}"
    HAS_ERROR=1
  fi
done

while IFS= read -r generated_file; do
  [ -z "$generated_file" ] && continue
  red "❌ Fichier PWA généré détecté : ${generated_file#$ROOT_DIR/}"
  HAS_ERROR=1
done < <(
  for dir in "$ROOT_DIR/dist" "$ROOT_DIR/android/app/src/main/assets"; do
    [ -d "$dir" ] || continue
    find "$dir" -type f \( \
      -name 'sw.js' -o \
      -name 'service-worker.js' -o \
      -name 'manifest.webmanifest' -o \
      -name 'workbox-*.js' -o \
      -name 'registerSW*.js' -o \
      -name 'pwa-*.png' \
    \)
  done
)

SCAN_TARGETS=(
  "$ROOT_DIR/package.json"
  "$ROOT_DIR/vite.config.ts"
  "$ROOT_DIR/index.html"
  "$ROOT_DIR/src"
  "$ROOT_DIR/public"
)

if [ -d "$ROOT_DIR/dist" ]; then
  SCAN_TARGETS+=("$ROOT_DIR/dist")
else
  yellow "⚠️ dist/ absent : scan des fichiers générés ignoré. Lancez npm run build avant le contrôle pré-Gradle."
fi

if [ -d "$ROOT_DIR/android/app/src/main/assets" ]; then
  SCAN_TARGETS+=("$ROOT_DIR/android/app/src/main/assets")
fi

PWA_PATTERN='vite-plugin-pwa|VitePWA|virtual:pwa|registerSW|workbox|manifest\.webmanifest|rel=["'"'"']manifest["'"'"']|beforeinstallprompt|mobile-web-app-capable|apple-mobile-web-app|navigator\.serviceWorker|serviceWorker\.register|/sw\.js|pwa-192x192|pwa-512x512|PWABannerContext|PWAInstallBanner|InstallPWA'

MATCHES="$(grep -RInE "$PWA_PATTERN" "${SCAN_TARGETS[@]}" 2>/dev/null || true)"
if [ -n "$MATCHES" ]; then
  red "❌ Références PWA interdites détectées :"
  printf '%s\n' "$MATCHES" | sed "s#${ROOT_DIR}/##"
  HAS_ERROR=1
fi

if [ "$HAS_ERROR" -eq 1 ]; then
  red "❌ Contrôle anti-PWA échoué : APK/AAB bloqué avant Gradle."
  exit 1
fi

green "✅ Contrôle anti-PWA OK : aucun manifest, service worker, VitePWA, Workbox ou asset PWA détecté."