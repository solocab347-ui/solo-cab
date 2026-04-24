#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
PACKAGE_JSON="$ROOT_DIR/package.json"

red() { printf '\033[0;31m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$1"; }

CAPACITOR_MAJORS="$(ROOT_DIR="$ROOT_DIR" node - <<'NODE'
const path = require('path');
const pkg = require(path.join(process.env.ROOT_DIR, 'package.json'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const caps = Object.entries(deps).filter(([name]) => name.startsWith('@capacitor/'));
const majors = new Map();
for (const [name, version] of caps) {
  const major = String(version).replace(/^[^0-9]*/, '').split('.')[0];
  if (!major) continue;
  if (!majors.has(major)) majors.set(major, []);
  majors.get(major).push(`${name}@${version}`);
}
for (const [major, entries] of majors) console.log(`${major}:${entries.join(',')}`);
NODE
)"

CAPACITOR_MAJOR_COUNT="$(printf '%s\n' "$CAPACITOR_MAJORS" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "$CAPACITOR_MAJOR_COUNT" -gt 1 ]; then
  red "❌ Versions Capacitor incompatibles détectées dans package.json"
  printf '%s\n' "$CAPACITOR_MAJORS"
  echo "Tous les paquets @capacitor/* doivent être sur la même version majeure."
  HAS_CAP_ERROR=1
else
  green "✅ Versions majeures Capacitor cohérentes"
  HAS_CAP_ERROR=0
fi

if [ ! -d "$ANDROID_DIR" ]; then
  yellow "⚠️ Dossier android/ absent : vérification package natif ignorée dans cet environnement."
  echo "Sur votre machine, créez-le avec : npx cap add android"
  exit "$HAS_CAP_ERROR"
fi

if [ ! -f "$MANIFEST" ]; then
  red "❌ AndroidManifest.xml introuvable."
  exit 1
fi

APP_ID="$(grep -oE "appId: '[^']+'" "$ROOT_DIR/capacitor.config.ts" | sed -E "s/appId: '([^']+)'/\1/" | head -n 1)"

if [ -z "$APP_ID" ]; then
  red "❌ Impossible de lire appId depuis capacitor.config.ts"
  exit 1
fi

MAIN_ACTIVITY_FILE="$(grep -Rsl --include='MainActivity.java' --include='MainActivity.kt' '^package ' "$ANDROID_DIR/app/src/main/java" 2>/dev/null | head -n 1 || true)"

if [ -z "$MAIN_ACTIVITY_FILE" ]; then
  red "❌ MainActivity.java / MainActivity.kt introuvable dans android/app/src/main/java"
  echo "Le projet Android est probablement cassé ou incomplet."
  echo "Solution sûre :"
  echo "  rm -rf android"
  echo "  npx cap add android"
  exit 1
fi

MAIN_ACTIVITY_PACKAGE="$(grep -E '^package ' "$MAIN_ACTIVITY_FILE" | sed -E 's/package ([^;]+);?/\1/' | head -n 1)"
APPLICATION_ID="$(ANDROID_DIR="$ANDROID_DIR" python3 - <<'PY'
from pathlib import Path
import os
import re
for path in Path(os.environ['ANDROID_DIR'], 'app').rglob('*'):
    if path.suffix not in {'.gradle', '.kts'}:
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    m = re.search(r'applicationId\s+["\']([^"\']+)["\']', text)
    if m:
        print(m.group(1))
        break
PY
)"
NAMESPACE="$(ANDROID_DIR="$ANDROID_DIR" python3 - <<'PY'
from pathlib import Path
import os
import re
for path in Path(os.environ['ANDROID_DIR'], 'app').rglob('*'):
    if path.suffix not in {'.gradle', '.kts'}:
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    m = re.search(r'namespace\s*[= ]+?["\']([^"\']+)["\']', text)
    if m:
        print(m.group(1))
        break
PY
)"

echo "Capacitor appId        : $APP_ID"
echo "MainActivity package   : $MAIN_ACTIVITY_PACKAGE"
echo "Gradle applicationId   : ${APPLICATION_ID:-<non trouvé>}"
echo "Gradle namespace       : ${NAMESPACE:-<non trouvé>}"

HAS_ERROR="$HAS_CAP_ERROR"

if [ "$MAIN_ACTIVITY_PACKAGE" != "$APP_ID" ]; then
  red "❌ MainActivity n'utilise pas le même package que capacitor.config.ts"
  HAS_ERROR=1
fi

if [ -n "$APPLICATION_ID" ] && [ "$APPLICATION_ID" != "$APP_ID" ]; then
  red "❌ applicationId Gradle ne correspond pas à appId"
  HAS_ERROR=1
fi

if [ -n "$NAMESPACE" ] && [ "$NAMESPACE" != "$APP_ID" ]; then
  red "❌ namespace Gradle ne correspond pas à appId"
  HAS_ERROR=1
fi

if [ "$HAS_ERROR" -eq 1 ]; then
  yellow "⚠️ Cause probable du crash 'ClassNotFoundException MainActivity'."
  echo "Réparation recommandée :"
  echo "  1. Désinstaller l'app du téléphone"
  echo "  2. rm -rf android"
  echo "  3. npx cap add android"
  echo "  4. bash scripts/patch-native.sh"
  echo "  5. bash scripts/verify-android-package.sh"
  echo "  6. npm run build"
  echo "  7. npx cap sync android"
  echo "  8. cd android && ./gradlew clean && cd .."
  echo "  9. npx cap run android"
  exit 1
fi

green "✅ Configuration Android cohérente : aucun mismatch de package détecté."