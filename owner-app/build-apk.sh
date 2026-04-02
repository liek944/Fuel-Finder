#!/bin/bash
# Fuel Finder Owner — APK Build Script
# Builds the debug APK entirely via terminal (no Android Studio required)
# Tested on 3.7GB RAM machine with JDK 21

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"

echo "=== Fuel Finder Owner — APK Build ==="
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

# Step 4: Build APK
echo "🏗️  Building APK (this may take a few minutes on low-RAM machines)..."
cd android
./gradlew assembleRelease --no-daemon
cd ..

# Step 5: Report result
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo "✅ APK built successfully!"
  echo "   📍 Location: $APK_PATH"
  echo "   📏 Size: $APK_SIZE"
  echo ""
  echo "   Install on device: adb install $APK_PATH"
else
  echo ""
  echo "❌ APK build failed — check output above for errors"
  exit 1
fi
