#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"

red() { printf '\033[0;31m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$1"; }

read_property() {
  local key="$1"
  for file in "$ANDROID_DIR/local.properties" "$ANDROID_DIR/gradle.properties" "$ROOT_DIR/gradle.properties"; do
    [ -f "$file" ] || continue
    grep -E "^${key}=" "$file" | tail -n 1 | cut -d '=' -f 2- || true
  done | tail -n 1
}

value_for() {
  local primary="$1"
  local fallback="$2"
  local value="${!primary:-}"
  [ -n "$value" ] || value="${!fallback:-}"
  [ -n "$value" ] || value="$(read_property "$primary")"
  [ -n "$value" ] || value="$(read_property "$fallback")"
  printf '%s' "$value"
}

STORE_FILE="$(value_for SOLOCAB_RELEASE_STORE_FILE RELEASE_STORE_FILE)"
KEY_ALIAS="$(value_for SOLOCAB_RELEASE_KEY_ALIAS RELEASE_KEY_ALIAS)"
STORE_PASSWORD="$(value_for SOLOCAB_RELEASE_STORE_PASSWORD RELEASE_STORE_PASSWORD)"
KEY_PASSWORD="$(value_for SOLOCAB_RELEASE_KEY_PASSWORD RELEASE_KEY_PASSWORD)"

HAS_ERROR=0

if [ -z "$STORE_FILE" ]; then
  red "❌ Keystore release absent : définissez SOLOCAB_RELEASE_STORE_FILE ou RELEASE_STORE_FILE."
  HAS_ERROR=1
else
  if [[ "$STORE_FILE" = /* ]]; then
    RESOLVED_STORE_FILE="$STORE_FILE"
  elif [ -f "$ROOT_DIR/$STORE_FILE" ]; then
    RESOLVED_STORE_FILE="$ROOT_DIR/$STORE_FILE"
  else
    RESOLVED_STORE_FILE="$ANDROID_DIR/$STORE_FILE"
  fi

  if [ ! -f "$RESOLVED_STORE_FILE" ]; then
    red "❌ Fichier keystore introuvable : $STORE_FILE"
    HAS_ERROR=1
  elif [ ! -r "$RESOLVED_STORE_FILE" ]; then
    red "❌ Fichier keystore non lisible : $STORE_FILE"
    HAS_ERROR=1
  else
    green "✅ Fichier keystore release présent"
  fi
fi

if [ -z "$KEY_ALIAS" ]; then
  red "❌ Alias keystore absent : définissez SOLOCAB_RELEASE_KEY_ALIAS ou RELEASE_KEY_ALIAS."
  HAS_ERROR=1
else
  green "✅ Alias keystore release configuré"
fi

if [ -z "$STORE_PASSWORD" ]; then
  red "❌ storePassword absent : définissez SOLOCAB_RELEASE_STORE_PASSWORD ou RELEASE_STORE_PASSWORD."
  HAS_ERROR=1
else
  green "✅ storePassword release configuré"
fi

if [ -z "$KEY_PASSWORD" ]; then
  red "❌ keyPassword absent : définissez SOLOCAB_RELEASE_KEY_PASSWORD ou RELEASE_KEY_PASSWORD."
  HAS_ERROR=1
else
  green "✅ keyPassword release configuré"
fi

if [ "$HAS_ERROR" -eq 1 ]; then
  yellow "Variables attendues avant assembleRelease/bundleRelease :"
  echo "  SOLOCAB_RELEASE_STORE_FILE=/chemin/vers/solocab-release.keystore"
  echo "  SOLOCAB_RELEASE_KEY_ALIAS=alias_de_production"
  echo "  SOLOCAB_RELEASE_STORE_PASSWORD=<secret>"
  echo "  SOLOCAB_RELEASE_KEY_PASSWORD=<secret>"
  red "❌ Signature release Android incomplète : build Play Store bloquée."
  exit 1
fi

green "✅ Signature release Android prête pour assembleRelease/bundleRelease."