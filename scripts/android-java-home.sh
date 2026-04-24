#!/usr/bin/env bash

detect_android_java_home() {
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    return 0
  fi

  local candidates=()

  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    local mac_home
    mac_home="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || true)"
    [ -n "$mac_home" ] && candidates+=("$mac_home")
  fi

  candidates+=(
    "$HOME/Library/Java/JavaVirtualMachines"/*/Contents/Home
    "/Library/Java/JavaVirtualMachines"/*/Contents/Home
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    "/Applications/Android Studio.app/Contents/jre/Contents/Home"
    "$HOME/AppData/Local/Programs/Android Studio/jbr"
    "$HOME/AppData/Local/Android/Android Studio/jbr"
    "/mnt/c/Program Files/Android/Android Studio/jbr"
    "/usr/lib/jvm/java-21-openjdk"*
    "/usr/lib/jvm/java-17-openjdk"*
    "/usr/lib/jvm/temurin-21"*
    "/usr/lib/jvm/temurin-17"*
  )

  local candidate version
  for candidate in "${candidates[@]}"; do
    [ -x "$candidate/bin/java" ] || continue
    version="$($candidate/bin/java -version 2>&1 | awk -F '"' '/version/ {print $2; exit}')"
    case "$version" in
      17.*|21.*)
        export JAVA_HOME="$candidate"
        export PATH="$JAVA_HOME/bin:$PATH"
        return 0
        ;;
    esac
  done

  if command -v java >/dev/null 2>&1; then
    version="$(java -version 2>&1 | awk -F '"' '/version/ {print $2; exit}')"
    case "$version" in
      17.*|21.*) return 0 ;;
    esac
  fi

  return 1
}

detect_android_java_home