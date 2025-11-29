Recommended Stack
Capacitor core + Android platform (bundled web assets).
Custom Capacitor plugin for background location using Android LocationManager (no GMS).
Local Notifications for arrival alerts.
Optional product flavors:
fdroid: no Google libs, bundled assets.
gms (optional): uses FusedLocationProvider if ever needed (not for F‑Droid).
Architecture
ForegroundService with persistent notification and foregroundServiceType="location".
Start service when navigation starts; stop on arrival/clearRoute.
Plugin API:
startTracking({ intervalMs, minDistanceM })
stopTracking()
setDestination(lat, lng, radiusM)
clearDestination()
events: location, arrival, status, error
JS wiring:
useRoute: on routeTo(): setDestination + startTracking; on clearRoute(): stopTracking.
On arrival event: fire local notification + haptics; clear route.
Permissions & UX:
Request FINE + BACKGROUND location, POST_NOTIFICATIONS (Android 13+).
Prompt to ignore battery optimizations (Doze); link to Settings.
Show always-on notification text (e.g., “Navigating to • Arrival at 100 m”).
F‑Droid/Self-host Compliance
No proprietary SDKs (no Google Play Services, no Transistorsoft).
Bundle web assets (no remote-code updates). Backend API calls remain remote (OK).
Keep push optional; rely on Local Notifications for arrival.
Reproducible builds via Gradle; provide metadata later if you want F‑Droid inclusion.
Next Steps (proposed)
Choose app id and name.
Suggested: id org.fuelfinder.app, name “Fuel Finder”
Initialize Capacitor and Android:
In frontend/: install Capacitor, add Android, set bundled assets.
Add plugins:
capacitor/local-notifications
, 
capacitor/haptics
, 
capacitor/preferences
Implement Kotlin plugin + service and wire to React hooks.
Configure permissions/manifest and battery optimization flows.
Build signed release APK/AAB for sideload or F‑Droid submission.
If you want, I can run the initial scaffolding commands (inside frontend/) once you confirm the app id/name:

npm i -D @capacitor/cli && npm i @capacitor/core
npx cap init "Fuel Finder" org.fuelfinder.app
npm i @capacitor/android @capacitor/local-notifications @capacitor/haptics @capacitor/preferences
npx cap add android
Configure capacitor.config to bundle assets; then I’ll add the Kotlin plugin + service and wire it up.
Confirm
App ID and display name (ID: org.fuelfinder.app and Name if Fuel Finder)
Arrival radius default = 100 m okay?(Okay)
Use bundled assets (F‑Droid-friendly) as the default?(okay.)

---
Detailed Implementation Plan (Android-first)

Current State (repository)
- Capacitor already initialized in frontend (package.json has @capacitor/*, android/ folder exists).
- capacitor.config.ts uses webDir="build" and Vite build.outDir is also "build". No change needed.
- Plugins already present: @capacitor/local-notifications, @capacitor/haptics, @capacitor/preferences.

1) Capacitor configuration
- Confirm webDir: "build" (matches Vite build.outDir).
- Optional dev live-reload (device): set server.url to http://<LAN_IP>:3000 and server.cleartext=true. Remove for release builds.
- Optional: androidScheme: "https" (default ok). Ensure content is served via file scheme when bundling.
- After config edits: npm run build && npx cap sync android.

2) Android Manifest & permissions (app/src/main/AndroidManifest.xml)
- Add permissions:
  - ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION
  - ACCESS_BACKGROUND_LOCATION (Android 10+)
  - POST_NOTIFICATIONS (Android 13+)
  - FOREGROUND_SERVICE and FOREGROUND_SERVICE_LOCATION (Android 10+/12+)
- Declare service:
  - <service android:name=".background.BackgroundLocationService"
            android:exported="false"
            android:foregroundServiceType="location" />
- Notification channel for persistent foreground notification (created on service start).
- Battery optimization: intent to ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS (user-controlled).

3) Native Background Location plugin (Kotlin)
- Files (under android/app/src/main/java/org/fuelfinder/app/background/):
  - BackgroundLocationPlugin.kt (Capacitor plugin API)
  - BackgroundLocationService.kt (ForegroundService + LocationManager updates)
- Plugin API (mirrors JS plan):
  - startTracking({ intervalMs, minDistanceM })
  - stopTracking()
  - setDestination(lat, lng, radiusM)
  - clearDestination()
  - checkPermissions()/requestPermissions()
- Behavior:
  - Service requests GPS/Network updates via LocationManager with provided interval/distance.
  - Emits events via notifyListeners("location"|"arrival"|"status"|"error", data).
  - Arrival detection done in service (compute distance to destination; if <= radiusM, fire local notification and set status=arrived; stop if configured).
  - Persistent notification shows status: “Navigating • arrival at 100 m”.
- No Google Play Services dependency (F-Droid friendly).

4) Frontend wiring (React)
- Create src/capacitor/backgroundLocation.ts: typed wrapper around Capacitor plugin with safe no-op web fallback.
- Integrate with useRoute hook:
  - On routeTo: BackgroundLocation.setDestination + startTracking.
  - On clearRoute/arrival: stopTracking + clearDestination.
  - Subscribe to "arrival" to trigger UI updates; plugin will already show a native notification for background.
- Respect SettingsButton toggles:
  - Voice announcements, visual notifications (bridge to native/local notifications already enabled), keep screen on (existing web Wake Lock; optional native PowerManager WakeLock can be added later if needed).
- Ensure Capacitor.isNativePlatform() gating to avoid invoking plugin on web.

5) Networking & CORS
- Backend allowed origins should include:
  - capacitor://localhost
  - http://localhost (for dev)
  - http://localhost:5173 and http://<LAN_IP>:5173 (Vite dev server)
  - Production domains: https://fuelfinderths.netlify.app and your custom domain(s)
- Set frontend .env.mobile with VITE_API_BASE_URL=https://fuelfinder.duckdns.org
- For dev live-reload on device: ensure LAN IP is reachable and allowed by backend CORS.

6) Developer workflow
- Local device build:
  - npm run build
  - npx cap sync android
  - Open Android Studio → Run on device
- Live reload (optional):
  - Vite: npm run dev (on LAN, port 3000 per vite.config.ts)
  - capacitor.config.ts: server.url=http://<LAN_IP>:3000, cleartext=true → npx cap sync android → Run
- Logging: use Logcat (tag: BackgroundLocationService / Capacitor).

7) Release & signing
- App versioning: bump versionCode/versionName in android/app/build.gradle.
- Keystore: keytool -genkeypair …; configure signingConfigs + release buildTypes.
- Build:
  - ./gradlew assembleRelease (APK) or ./gradlew bundleRelease (AAB)
- Assets: generate app icons/splash (capacitor-assets or Android Studio Image Asset). Use existing logo in frontend/public if desired.
- Privacy policy: include URL and in-app link.

8) F-Droid friendly variant (optional)
- No GMS dependencies already ensured.
- Product flavors (optional):
  - fdroid: default
  - gms: optional future flavor using FusedLocationProvider if ever needed (not required now)
- Reproducible builds: document exact Gradle/SDK versions.

9) QA checklist
- Permissions flows: foreground + background + notifications on Android 10–14.
- ForegroundService notification visible while tracking; stops when route cleared/arrival.
- Arrival detection at 100 m: fires native local notification, haptics; clears route.
- Background/locked-screen tracking for 10+ minutes; verify Doze behavior and battery optimization prompt.
- Network resilience: offline/online transitions; GPS unavailable fallbacks.
- CORS/API calls work on device (capacitor://localhost origin).
- Web fallback still works in browsers without plugin.

Action items (execution order)
- Confirm capacitor.config.ts → webDir: "build"; add optional dev server.url=http://<LAN_IP>:3000 for device testing.
- Implement Kotlin plugin + service; declare manifest permissions/service.
- Wire frontend to plugin under useRoute; add event subscriptions.
- Update backend allowedOrigins to include capacitor://localhost and dev hosts.
- Build, run on device, and execute QA checklist.