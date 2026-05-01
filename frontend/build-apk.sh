#!/bin/bash
# Fuel Finder — Signed Release APK Build Script
# Builds the signed release APK entirely via terminal (no Android Studio required)
# Tested with JDK 21 and Node.js v20+
#
# USAGE:
#   ./build-apk.sh 1.2.0        → bumps to v1.2.0, builds, done
#   ./build-apk.sh              → re-builds with whatever version is already in build.gradle
#
# Everything is automatic — you never need to edit any file manually.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"

# Load NVM to ensure we use the correct Node.js version (v20+)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "=== Fuel Finder Main App — APK Build ==="
echo ""

GRADLE_FILE="android/app/build.gradle"

# ── Step 1: Handle version argument ───────────────────────────────────────────
if [ -n "$1" ]; then
  NEW_VERSION="$1"

  # Validate semver format (e.g. 1.2.3)
  if ! echo "$NEW_VERSION" | grep -qP '^\d+\.\d+(\.\d+)?$'; then
    echo "❌ Invalid version format: '$NEW_VERSION'"
    echo "   Expected format: MAJOR.MINOR.PATCH  (e.g. 1.2.0)"
    exit 1
  fi

  # Auto-increment versionCode by reading the current value and adding 1
  CURRENT_CODE=$(grep -oP 'versionCode\s+\K\d+' "$GRADLE_FILE")
  NEW_CODE=$((CURRENT_CODE + 1))

  # Patch build.gradle in-place
  sed -i "s/versionCode\s\+[0-9]\+/versionCode $NEW_CODE/" "$GRADLE_FILE"
  sed -i "s/versionName\s\+\"[^\"]*\"/versionName \"$NEW_VERSION\"/" "$GRADLE_FILE"

  echo "🏷️  Version bumped: v$NEW_VERSION  (versionCode: $CURRENT_CODE → $NEW_CODE)"
else
  echo "ℹ️  No version argument given — using existing version in build.gradle"
fi

# ── Step 2: Read the final version from build.gradle ──────────────────────────
APP_VERSION=$(grep -oP 'versionName\s+"\K[^"]+' "$GRADLE_FILE")

if [ -z "$APP_VERSION" ]; then
  echo "❌ Could not read versionName from $GRADLE_FILE"
  exit 1
fi

echo "📌 Building: v$APP_VERSION"

# Stamp public/version.json so the web bundle knows its own version at runtime
echo "{ \"version\": \"$APP_VERSION\" }" > public/version.json
echo "   ✔ Stamped public/version.json"
echo ""

# ── Step 3: Install dependencies (if needed) ──────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# ── Step 4: Build web assets ──────────────────────────────────────────────────
echo "🔨 Building web assets..."
npm run build

# ── Step 5: Sync to Capacitor Android ────────────────────────────────────────
echo "📱 Syncing to Android..."
npx cap sync android

# ── Step 6: Build Signed Release APK ─────────────────────────────────────────
echo "🏗️  Building Signed Release APK (this may take a few minutes on low-RAM machines)..."
cd android
./gradlew clean assembleRelease --no-daemon
cd ..

# ── Step 7: Report result ─────────────────────────────────────────────────────
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo "✅ APK built successfully!"
  echo "   📍 Location: $APK_PATH"
  echo "   📏 Size:     $APK_SIZE"
  echo "   🏷️  Version:  v$APP_VERSION"
  echo ""

  # ── Step 8: Auto-publish to GitHub Releases ──────────────────────────────────
  if command -v gh &>/dev/null && gh auth status &>/dev/null; then
    echo "🚀 Publishing GitHub release v$APP_VERSION..."
    gh release create "v$APP_VERSION" "$APK_PATH" \
      --title "v$APP_VERSION" \
      --generate-notes
    echo ""
    echo "🎉 Done! Users will now be notified of the update on next app launch."
  else
    echo "⚠️  GitHub CLI (gh) not found or not authenticated."
    echo "   Install it: https://cli.github.com"
    echo "   Then run:   gh auth login"
    echo ""
    echo "   Or upload manually:"
    echo "   gh release create v$APP_VERSION $APK_PATH --title \"v$APP_VERSION\" --generate-notes"
  fi
else
  echo ""
  echo "❌ APK build failed — check output above for errors"
  exit 1
fi

