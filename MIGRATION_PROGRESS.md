# Android Migration Progress Tracker

> Started: 2025-12-17
> Branch: `android`

---

## Phase 0 — Freeze Current System ✅

- [x] Git branch created (`android` branch)
- [x] Freeze current `frontend/` folder (do not modify)
- [x] Freeze current `backend/` folder (do not modify)
- [x] Document baseline metrics

### Baseline Metrics

| System             | Stack                              | Requirements      |
| ------------------ | ---------------------------------- | ----------------- |
| **Online System**  | Web App + OSRM + Postgres          | Requires Internet |
| **Offline System** | Android APK + GraphHopper + SQLite | No Internet       |

**Comparison Metric:** "The Offline System reduces route calculation latency by 100% in zero-connectivity zones compared to the Online System."

---

## Phase 1 — Data Bridge (Backend → Offline DB) ✅

- [x] Create export script (`backend/scripts/export_to_offline.js`)
- [x] Schema synchronization (Postgres → SQLite/Room)
- [x] Generate `stations.db`

### Export Results

| Metric      | Value                                |
| ----------- | ------------------------------------ |
| Stations    | 50                                   |
| Fuel Prices | 149                                  |
| DB Size     | 0.05 MB                              |
| Output      | `backend/android_export/stations.db` |

**Schema Mapping:**

- PostGIS `geom` → `lat REAL, lng REAL`
- `services` array → comma-separated TEXT
- `operating_hours` JSONB → JSON TEXT
- `fuel_prices` → separate table with foreign key

---

## Phase 2 — Asset Migration (Supabase → Local) ✅

- [x] Download station images from Supabase
- [x] Update image paths in database
- [x] Verify images folder ready

---

## Phase 3 — Offline Routing Engine (GraphHopper)

- [ ] Verify `mindoro.osm.pbf` exists
- [ ] Download GraphHopper Web JAR
- [ ] Create `graphhopper.yml` config
- [ ] Build the graph
- [ ] Test the graph (optional)

---

## Phase 4 — Map Rendering (Mapsforge)

- [ ] Build `oriental_mindoro.map` from OSM data

---

## Phase 5 — Android Architecture

- [ ] Environment setup
- [ ] Project creation
- [ ] Kotlin source files
- [ ] Build & test

---

## Phase 6 — Feature Parity Documentation

- [ ] Complete feature parity table

---

## Phase 7 — Thesis Defense Narrative

- [ ] Prepare synchronized ecosystem narrative

---

## Phase 8 — Validation & Testing

- [ ] Cold start routing test
- [ ] Storage footprint measurement
- [ ] Route accuracy comparison

---

## Phase 9 — Submission Deliverables

- [ ] Web source code
- [ ] Android source code
- [ ] APK file
