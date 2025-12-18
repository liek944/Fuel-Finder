FINAL OFFLINE STACK (NATIVE ANDROID)
1️⃣ Language & Core

Kotlin

Android Jetpack

ViewModel

LiveData / StateFlow

Room

Coroutines (background routing & GPS)

2️⃣ Offline Map Rendering
🗺 Mapsforge

Why this wins

True offline

Small size

No API keys

Province-scale optimized

Files

oriental_mindoro.map (≈ 30–40 MB)

Libraries

implementation "org.mapsforge:mapsforge-map-android:0.20.0"
implementation "org.mapsforge:mapsforge-themes:0.20.0"

3️⃣ Offline Routing Engine
🧭 GraphHopper (Embedded)

Capabilities

Point-to-point routing

GPS following

Offline rerouting

A\* under the hood (thesis-friendly)

What you ship

Prebuilt graph cache (≈ 10–20 MB)

Libraries

implementation "com.graphhopper:graphhopper-core:8.0"
implementation "com.graphhopper:graphhopper-reader-osm:8.0"

⚠️ Graph build happens OFF DEVICE (important).

4️⃣ GPS Tracking (Offline)
📍 Fused Location Provider

Uses satellites

No internet needed

implementation "com.google.android.gms:play-services-location:21.0.1"

5️⃣ Local Database (Stations & Prices)
🗄 Room (SQLite)

Stores:

Station ID

Brand

Coordinates

Fuel types

Price

Last updated

implementation "androidx.room:room-runtime:2.6.1"
kapt "androidx.room:room-compiler:2.6.1"

📦 APK ASSET STRUCTURE (IMPORTANT)
app/
└── src/main/
├── assets/
│ ├── map/
│ │ └── oriental_mindoro.map
│ ├── routing/
│ │ └── graphhopper/
│ └── db/
│ └── stations.db
└── java/

🛠 PRE-BUILD PIPELINE (ONE TIME)
Step 1: Clip OSM
osmium extract oriental_mindoro.poly philippines-latest.osm.pbf \
-o mindoro.osm.pbf

Step 2: Build Mapsforge Map
osmosis \
--read-pbf mindoro.osm.pbf \
--mapfile-writer file=oriental_mindoro.map

Step 3: Build GraphHopper Cache
java -jar graphhopper-web.jar \
config=graphhopper.yml \
osmreader.osm=mindoro.osm.pbf

Output → graphhopper/ folder
Copy into APK assets.

🧠 APP ARCHITECTURE (THESIS-CLEAN)
UI (MapView)
│
├── LocationService (GPS)
│
├── RoutingEngine (GraphHopper)
│
├── StationRepository (Room)
│
└── MapRenderer (Mapsforge)

🧭 Offline “Follow User” Flow

GPS updates user position

Snap to nearest road

Check deviation threshold

Recalculate route locally

Update polyline on map

No server. No internet. No API calls.

📊 APK SIZE EXPECTATION
Component Size
Mapsforge map ~35 MB
GraphHopper cache ~15 MB
Station DB <1 MB
APK code ~8–10 MB

Total: ~60 MB

✔ Play Store safe
✔ Offline
✔ Thesis-credible

---

# FINAL THESIS MIGRATION PLAN

**From:** Web-Based Hybrid App (React/Postgres)
**To:** Native Offline Android System (Kotlin/Room/GraphHopper)

> [!IMPORTANT]
> Make changes step-by-step. Complete one phase before moving to the next.
> Create an `.md` file after completing each phase to document changes.
> check @MIGRATION_PROGRESS.md for progress.

---

## [ ] 🏛 PHASE 0 — The Control Group (Freeze Current System)

**Action:** Do not delete or dismantle your current frontend or backend folders.

**Academic Purpose:** This acts as your Baseline for Chapter V (Evaluation).

- [ ] Freeze current frontend/ folder (do not modify)
- [ ] Freeze current backend/ folder (do not modify)
- [ ] Document baseline metrics:
  - **Online System:** Web App + OSRM + Postgres (Requires Internet)
  - **Offline System:** Android APK + GraphHopper + SQLite (No Internet)
  - **Comparison Metric:** "The Offline System reduces route calculation latency by 100% in zero-connectivity zones compared to the Online System."

---

## [ ] 🛠 PHASE 1 — Data Bridge (Backend → Offline DB)

**Refinement:** You cannot simply copy-paste Postgres to SQLite. Room requires strict schema matching.

### [ ] 1️⃣ Create the Export Script

- [ ] Write a Node.js script in `backend/scripts/export_to_offline.js`
- [ ] Implement the following logic:

```javascript
// Logic:
// 1. Fetch stations from Postgres.
// 2. Map Postgres columns (snake_case) to Room Entity fields (camelCase).
// 3. Convert PostGIS coordinates (POINT) to simple Lat/Lon (Double).
// 4. Write to 'stations.db' (SQLite).
```

### [ ] 2️⃣ Schema Synchronization

- [ ] Ensure Kotlin Data Class matches exported SQLite table
- [ ] Handle fuel_type conversion:
  - **Postgres:** fuel_type (Array/JSON)
  - **Android Room:** Store as comma-separated string (e.g., "Diesel,Unleaded")
- [ ] Verify `stations.db` is ready for Android assets/db/

📦 **Result:** stations.db (Ready for Android assets/db/)

---

## [x] 🖼 PHASE 2 — Asset Migration (Supabase → Local)

**Refinement:** Supabase URLs (https://...) will fail offline. You must bundle images.

### [ ] 1️⃣ The Download Script

- [x] Add image download to export script:
  - [x] Iterate through all Stations
  - [x] Download the thumbnail version of each station image
  - [x] Save to local folder: `./offline_images/[station_id].jpg`

### [ ] 2️⃣ Database Update

- [x] Update stations.db:
  - [x] Change `image_url` from `https://supabase.co/...` to `file:///android_asset/station_images/[station_id].jpg`
- [x] Verify folder of JPGs ready for Android assets/station_images/

📦 **Result:** A folder of JPGs to copy into Android assets/station_images/.

---

## [ ] 🧭 PHASE 3 — Offline Routing Engine (GraphHopper)

**Refinement:** Choosing the right algorithm configuration for Mobile Performance.

### Prerequisites

- [ ] Verify `mindoro.osm.pbf` exists and is valid
- [ ] Download GraphHopper Web JAR (version 9.1 recommended)
- [ ] Create `graphhopper.yml` config file

### [ ] 1️⃣ Build the Graph (On PC)

- [ ] Create config file with car profile:

```yaml
graphhopper:
  datareader.file: mindoro.osm.pbf
  graph.location: ./graphhopper-cache
  profiles:
    - name: car
      vehicle: car
      weighting: fastest
  prepare.ch.weightings: fastest
```

- [ ] Run build command:

```bash
java -Xmx2g -jar graphhopper-web-9.1.jar import graphhopper.yml
```

- [ ] Verify output folder `graphhopper-cache/` contains: `edges`, `nodes`, `geometry`, `location_index`

### [ ] 2️⃣ Test the Graph (Optional but Recommended)

- [ ] Start test server:

```bash
java -Xmx1g -jar graphhopper-web-9.1.jar server graphhopper.yml
```

- [ ] Query test route: `http://localhost:8989/route?point=12.5,121.0&point=12.6,121.1&profile=car`
- [ ] Verify JSON response contains valid `paths[0].points`

### [ ] 3️⃣ Algorithm Choice

| Option              | Config                           | Speed | Flexibility     |
| ------------------- | -------------------------------- | ----- | --------------- |
| **A (Recommended)** | `prepare.ch.weightings: fastest` | ~50ms | Fixed weights   |
| B                   | `prepare.ch.weightings: no`      | ~1-2s | Dynamic weights |

**Recommendation:** Use Option A (CH). Speed impresses examiners more than flexibility on mobile.

### Expected Output

- Graph size: ~10-20 MB for Oriental Mindoro (car profile only)
- Copy `graphhopper-cache/` folder to Android `assets/routing/`

📦 **Result:** Copy the graphhopper/ folder (containing edges, nodes, geometry) to Android assets/routing/.

---

## [ ] 🗺 PHASE 4 — Map Rendering (Mapsforge)

**Old:** Leaflet (Web) fetching PNG tiles from the internet.
**New:** Mapsforge (Android) reading Vector data from storage.

**The Workflow:**

- [ ] 1. **Input:** mindoro.osm.pbf
- [ ] 2. **Process:** Run osmosis with the map-writer plugin
- [ ] 3. **Output:** oriental_mindoro.map
- [ ] 4. **Android:** Use MapView from Mapsforge library to render this file

---

## [ ] 📱 PHASE 5 — The Android Architecture (CLI-Only, No Android Studio)

> [!NOTE]
> This phase uses **command-line tools only**. No Android Studio required!
> Works on machines with 4GB RAM.

### [ ] 1️⃣ Environment Setup

- [ ] Verify SDK tools are installed:

```bash
# Check sdkmanager
sdkmanager --version

# Check gradle
gradle --version

# Check adb
adb version
```

- [ ] Install required SDK packages (if not already):

```bash
sdkmanager "platforms;android-34" "build-tools;34.0.0"
```

- [ ] Set environment variables in `~/.bashrc` or `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

### [ ] 2️⃣ Project Creation (One-Time Setup)

- [ ] Create project directory structure:

```bash
mkdir -p fuel-finder-android/app/src/main/{java/com/fuelfinder,assets,res}
cd fuel-finder-android
```

- [ ] Create `settings.gradle.kts`:

```kotlin
rootProject.name = "FuelFinder"
include(":app")
```

- [ ] Create `build.gradle.kts` (root):

```kotlin
plugins {
    id("com.android.application") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
}
```

- [ ] Create `app/build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
}

android {
    namespace = "com.fuelfinder"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.fuelfinder"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Room (SQLite)
    implementation("androidx.room:room-runtime:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // Location
    implementation("com.google.android.gms:play-services-location:21.0.1")

    // GraphHopper
    implementation("com.graphhopper:graphhopper-core:8.0")

    // Mapsforge
    implementation("org.mapsforge:mapsforge-map-android:0.20.0")
    implementation("org.mapsforge:mapsforge-themes:0.20.0")

    // Android Core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
}
```

### [ ] 3️⃣ Project Structure

```plaintext
fuel-finder-android/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── gradlew / gradlew.bat
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/
        │   ├── db/stations.db           <-- From Phase 1
        │   ├── map/oriental_mindoro.map <-- From Phase 4
        │   ├── routing/graphhopper/     <-- From Phase 3
        │   └── station_images/          <-- From Phase 2
        ├── java/com/fuelfinder/
        │   ├── data/
        │   │   ├── AppDatabase.kt
        │   │   └── StationDao.kt
        │   ├── service/
        │   │   └── LocationService.kt
        │   ├── ui/
        │   │   └── MapViewModel.kt
        │   └── map/
        │       └── OfflineMapAdapter.kt
        └── res/
            └── layout/
                └── activity_main.xml
```

### [ ] 4️⃣ Kotlin Source Files

- [ ] Create `AppDatabase.kt` (Room database)
- [ ] Create `StationDao.kt` (Data access object)
- [ ] Create `LocationService.kt` (FusedLocationProvider)
- [ ] Create `MapViewModel.kt` (Connects DB + GPS + UI)
- [ ] Create `OfflineMapAdapter.kt` (Mapsforge rendering)

### [ ] 5️⃣ Build & Test (CLI Commands)

- [ ] Generate Gradle wrapper (one-time):

```bash
gradle wrapper --gradle-version 8.4
```

- [ ] Build debug APK:

```bash
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

- [ ] Install to connected device:

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

- [ ] View logs for debugging:

```bash
adb logcat | grep -i fuelfinder
```

### [ ] 6️⃣ Editor Setup (VS Code)

- [ ] Install VS Code extensions:

  - **Kotlin Language** (mathiasfrohlich.kotlin)
  - **Gradle for Java** (vscjava.vscode-gradle)

- [ ] Create `.vscode/settings.json` for syntax highlighting:

```json
{
  "files.associations": {
    "*.kts": "kotlin"
  }
}
```

> [!TIP]
> You can write all Kotlin code in VS Code, then run `./gradlew assembleDebug` in the terminal to build.

---

---

## [ ] 📊 PHASE 6 — Feature Parity Table (Web vs APK)

**Goal**: Document implementation differences between online web and offline APK

- [ ] Complete feature parity documentation:

| Feature | Online (Web)        | Offline (APK)             | Implementation Note                                |
| ------- | ------------------- | ------------------------- | -------------------------------------------------- |
| Search  | API Request         | Room Query                | `SELECT * FROM stations WHERE name LIKE "%query%"` |
| Routing | OSRM HTTP           | GraphHopper Lib           | `hopper.route(req)` runs in background thread      |
| Images  | Supabase URL        | Asset Stream              | `assets.open("station_images/" + id + ".jpg")`     |
| GPS     | Browser Geolocation | Android Location Services | Requires `ACCESS_FINE_LOCATION` permission         |

---

## [ ] 🎓 PHASE 7 — Thesis Defense "Hybrid" Argument

**Goal**: Present a synchronized ecosystem narrative

> 🛡 You are not abandoning the backend. You are presenting a **Synchronized Ecosystem**.

- [ ] Prepare the narrative:

> "The Central Server (Phase 0) acts as the 'Master Source.' The Android APK (Phase 4) is the 'Field Unit.' In a production environment, the APK would download a fresh `stations.db` update whenever the user reaches Wi-Fi, ensuring offline data remains current."

---

## [ ] ✅ PHASE 8 — Validation & Testing Metrics

**Goal**: Run tests for Chapter V

- [ ] Run cold start routing test (Calapan to Roxas)
- [ ] Measure storage footprint (Goal: Keep under 100MB)
- [ ] Compare route accuracy between OSRM and GraphHopper

| Test               | Online                 | Offline                                  | Notes                       |
| ------------------ | ---------------------- | ---------------------------------------- | --------------------------- |
| Cold Start Routing | Time + Network Latency | Time only (likely <500ms with CH)        | Route from Calapan to Roxas |
| Storage Footprint  | N/A                    | APK + Assets (Map + Graph + DB + Images) | Goal: Keep under 100MB      |
| Route Accuracy     | OSRM geometry (Web)    | GraphHopper geometry (Android)           | Should be nearly identical  |

---

## [ ] 📦 PHASE 9 — Submission Deliverables

**Goal**: Prepare final deliverables

| Done | #   | Deliverable         | Description                  |
| ---- | --- | ------------------- | ---------------------------- |
| [ ]  | 1   | Web Source Code     | The admin/manager interface  |
| [ ]  | 2   | Android Source Code | The user/driver interface    |
| [ ]  | 3   | APK File            | Pre-loaded with Mindoro data |

> ✅ This plan is technically sound, academically rigorous, and acknowledges the specific constraints of migrating from a Web/Supabase architecture to a Native/Local architecture.
