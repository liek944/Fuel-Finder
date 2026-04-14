#!/bin/bash
# Fuel Finder — Signed Release APK Build Script
# Builds the signed release APK entirely via terminal (no Android Studio required)
# Tested with JDK 21 and Node.js v20+

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

# Step 1: Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Step 2: Build web assets
echo "🔨 Building web assets..."
npm run build

# Step 3: Sync to Capacitor Android
echo "📱 Syncing to Android..."
npx cap sync android

# Step 4: Build Signed Release APK
echo "🏗️  Building Signed Release APK (this may take a few minutes on low-RAM machines)..."
cd android
./gradlew clean assembleRelease --no-daemon
cd ..

# Step 5: Report result
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo "✅ APK built successfully!"
  echo "   📍 Location: frontend/$APK_PATH"
  echo "   📏 Size: $APK_SIZE"
  echo ""
  echo "   Install on device: adb install frontend/$APK_PATH"
else
  echo ""
  echo "❌ APK build failed — check output above for errors"
  exit 1
fi
