# Offline Mode & Map Caching - Implementation Plan

**Feature**: Offline Mode & Map Caching for Oriental Mindoro  
**Priority**: SHOULD-HAVE (High Value Enhancement)  
**Estimated Effort**: 2-3 weeks  
**Business Value**: Expands addressable market, PWA enhancement, rural area support

---

## Problem Statement

Users in rural areas of Oriental Mindoro face expensive mobile data costs and unreliable connectivity. The current Fuel Finder app requires constant internet connection for:

- Loading map tiles from OpenStreetMap
- Fetching station data from the backend API
- Calculating routes via OSRM
- Accessing navigation features

**User Pain Point**: _"Mobile data is expensive in rural areas"_

---

## Current State Analysis

### ✅ Existing Infrastructure

1. **PWA Foundation** (`vite.config.ts`)

   - VitePWA plugin already installed (`vite-plugin-pwa@1.1.0`)
   - Basic runtime caching configured:
     - OSM tiles: `StaleWhileRevalidate` (1000 entries, 7 days)
     - API calls: `NetworkFirst` (100 entries, 1 day)
   - PWA manifest configured with proper icons and metadata

2. **IndexedDB Implementation** (`src/utils/indexedDB.ts`)

   - Database: `FuelFinderTrips`
   - Stores trip recordings with GPS coordinates
   - Proven working implementation for persistent storage

3. **Service Worker** (`public/sw.js`)

   - Minimal implementation (install, activate, notifications)
   - **Does NOT handle caching** (relies on Workbox from VitePWA)

4. **API Structure**
   - `stationsApi.ts`: Fetches nearby stations
   - `routingApi.ts`: Gets routes from OSRM
   - Clean separation of concerns

### ❌ Missing Capabilities

1. **No Map Download Feature** - Users cannot pre-download Oriental Mindoro region
2. **No Offline Station Database** - Station data not cached for offline use
3. **No Offline Routing** - OSRM routes require network connection
4. **No Sync Mechanism** - No background sync when connection restored
5. **No Storage Management** - No UI for managing cached data
6. **No Offline Indicator** - Users don't know when they're offline

---

## User Review Required

> [!IMPORTANT] > **Storage Quota Considerations**
>
> Downloading the entire Oriental Mindoro map region will consume significant storage:
>
> - **Map tiles (zoom 10-16)**: ~50-150 MB
> - **Station data**: ~1-2 MB
> - **Cached routes**: ~5-10 MB
> - **Total**: ~60-165 MB
>
> **Questions for Review**:
>
> 1. Should we implement automatic download on first install, or require user opt-in? (Require user opt-in)
> 2. What zoom levels should be cached? (Higher zoom = more detail = more storage) (lower zoom = less detail = less storage) (Recommend zoom 10-16)
> 3. Should we allow users to download other regions beyond Oriental Mindoro? (No)

> [!WARNING] > **Offline Routing Limitations**
>
> True offline routing requires either:
>
> 1. **Client-side routing engine** (e.g., OSRM.js, Leaflet Routing Machine with offline tiles) - adds ~10MB to bundle size
> 2. **Pre-cached common routes** - limited to frequently used routes
> 3. **Simplified routing** - straight-line or basic pathfinding (fallback only)
>
> **Recommendation**: Integrate a client-side routing engine for full offline routing capability. Use pre-cached routes as a performance optimization and simplified routing only as a last-resort fallback.

---

## Proposed Changes

### Component 1: Offline Storage Infrastructure

#### [NEW] `src/utils/offlineStorage.ts`

**Purpose**: Centralized offline data management using IndexedDB

**Key Features**:

- Separate object stores for:
  - `stations`: Cached station data with metadata
  - `pois`: Cached POI data (gas, convenience, repair, car_wash, motor_shop)
  - `routes`: Pre-cached route geometries
  - `mapTiles`: Map tile metadata (tiles cached by service worker)
  - `syncQueue`: Pending operations to sync when online
- Expiration logic for stale data
- Storage quota monitoring

**API Design**:

```typescript
class OfflineStorageManager {
  // Stations
  async cacheStations(stations: Station[]): Promise<void>;
  async getOfflineStations(bounds?: LatLngBounds): Promise<Station[]>;
  async updateStation(id: number, data: Partial<Station>): Promise<void>;

  // POIs (gas, convenience, repair, car_wash, motor_shop)
  async cachePOIs(pois: POI[]): Promise<void>;
  async getOfflinePOIs(bounds?: LatLngBounds, type?: string): Promise<POI[]>;
  async updatePOI(id: number, data: Partial<POI>): Promise<void>;

  // Routes
  async cacheRoute(key: string, route: RouteData): Promise<void>;
  async getOfflineRoute(
    startLat,
    startLng,
    endLat,
    endLng
  ): Promise<RouteData | null>;

  // Sync Queue
  async addToSyncQueue(operation: SyncOperation): Promise<void>;
  async processSyncQueue(): Promise<void>;

  // Storage Management
  async getStorageUsage(): Promise<StorageEstimate>;
  async clearExpiredData(): Promise<void>;
}
```

---

#### [MODIFY] `frontend/vite.config.ts`

**Changes**:

1. **Enhanced Workbox Configuration**:

   - Increase OSM tile cache from 1000 to 5000 entries
   - Add precaching for Oriental Mindoro bounds (zoom 10-16)
   - Configure background sync for API calls
   - Add offline fallback page

2. **New Runtime Caching Strategies**:

   ```typescript
   // Station images - CacheFirst
   {
     urlPattern: /\/uploads\/stations\/.*/i,
     handler: 'CacheFirst',
     options: {
       cacheName: 'station-images',
       expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }
     }
   }

   // Station data - NetworkFirst with offline fallback
   {
     urlPattern: /\/api\/stations\/.*/i,
     handler: 'NetworkFirst',
     options: {
       cacheName: 'station-data',
       networkTimeoutSeconds: 5,
       plugins: [backgroundSyncPlugin]
     }
   }
   ```

3. **Precache Manifest**:
   - Add Oriental Mindoro tile URLs (calculated from bounds)
   - Include offline fallback HTML/CSS/JS

**Lines to modify**: 13-38 (workbox configuration)

---

### Component 2: Map Download Feature

#### [NEW] `src/components/OfflineMapDownloader.tsx`

**Purpose**: UI component for downloading map tiles

**Features**:

- Region selector (default: Oriental Mindoro)
- Zoom level selector (10-16)
- Download progress indicator
- Storage usage display
- Pause/Resume/Cancel controls

**UI Design**:

```
┌─────────────────────────────────────┐
│ 📴 Offline Maps                     │
├─────────────────────────────────────┤
│ Region: Oriental Mindoro       [▼]  │
│ Zoom Levels: 10-16             [▼]  │
│ Estimated Size: ~120 MB             │
│                                     │
│ [████████░░] 80% (96/120 MB)       │
│                                     │
│ Storage Used: 156 MB / 500 MB       │
│                                     │
│ [Pause] [Cancel]                    │
└─────────────────────────────────────┘
```

**Integration**: Add to Settings panel or create dedicated "Offline Mode" section

---

#### [NEW] `src/hooks/useMapDownloader.ts`

**Purpose**: Hook for managing map tile downloads

**Functionality**:

```typescript
interface UseMapDownloaderReturn {
  downloadMap: (region: MapRegion, zoomLevels: number[]) => Promise<void>;
  progress: { current: number; total: number; percentage: number };
  isDownloading: boolean;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  error: Error | null;
}
```

**Implementation Strategy**:

- Calculate tile URLs for given bounds and zoom levels
- Use `fetch()` with cache: 'force-cache' to populate service worker cache
- Batch requests (10 concurrent) to avoid overwhelming browser
- Store metadata in IndexedDB for tracking

---

### Component 3: Offline Station Data

#### [MODIFY] `src/api/stationsApi.ts`

**Changes**:

1. Add offline fallback to `nearby()` method:

   ```typescript
   nearby: async (lat, lng, radiusMeters) => {
     try {
       // Try network first
       const res = await apiGet(
         apiEndpoints.stations.nearby(lat, lng, radiusMeters)
       );
       const stations = await res.json();

       // Cache successful response
       await offlineStorage.cacheStations(stations);

       return stations;
     } catch (error) {
       // Fallback to offline cache
       if (!navigator.onLine) {
         return await offlineStorage.getOfflineStations({
           lat,
           lng,
           radiusMeters,
         });
       }
       throw error;
     }
   };
   ```

2. Add background sync for price reports:
   - Queue failed `reportPrice()` calls
   - Retry when connection restored

**Lines to modify**: 7-16 (nearby method), 28-36 (reportPrice method)

---

#### [NEW] `src/hooks/useOfflineStations.ts`

**Purpose**: Hook for accessing stations with offline support

**Features**:

- Automatic offline detection
- Seamless fallback to cached data
- Stale data indicators
- Background refresh when online

---

### Component 4: Offline Routing

#### [MODIFY] `src/api/routingApi.ts`

**Changes**:

1. Add route caching:

   ```typescript
   route: async (startLat, startLng, endLat, endLng) => {
     const cacheKey = `${startLat},${startLng}-${endLat},${endLng}`;

     try {
       // Try network first
       const res = await apiGet(apiEndpoints.routing.route(...));
       const routeData = await res.json();

       // Cache successful route
       await offlineStorage.cacheRoute(cacheKey, routeData);

       return routeData;
     } catch (error) {
       // Fallback to cached route
       const cached = await offlineStorage.getOfflineRoute(startLat, startLng, endLat, endLng);
       if (cached) return cached;

       // Last resort: simplified routing
       if (!navigator.onLine) {
         return generateSimplifiedRoute(startLat, startLng, endLat, endLng);
       }
       throw error;
     }
   }
   ```

**Lines to modify**: 11-21 (route method)

---

#### [NEW] `src/utils/offlineRouting.ts`

**Purpose**: Client-side routing engine for full offline navigation

**Strategy**:

- Integrate Leaflet Routing Machine with offline OSRM support
- Pre-download routing graph data for Oriental Mindoro (~10-15 MB)
- Full turn-by-turn navigation without network dependency
- Fall back to Turf.js straight-line routing if routing data unavailable
- Add disclaimer for fallback: "Simplified route - for reference only"

**Implementation**:

```typescript
interface OfflineRouter {
  // Initialize with downloaded routing data
  initialize(routingData: ArrayBuffer): Promise<void>;

  // Calculate route offline
  route(start: LatLng, end: LatLng): Promise<RouteResult>;

  // Check if routing data is available
  isAvailable(): boolean;

  // Download routing data for region
  downloadRoutingData(region: MapRegion): Promise<void>;
}
```

---

### Component 5: Background Sync

#### [NEW] `src/utils/backgroundSync.ts`

**Purpose**: Sync pending operations when connection restored

**Features**:

- Register sync events with service worker
- Queue failed API calls (price reports, reviews, donations)
- Retry logic with exponential backoff
- User notifications on sync completion

**Integration with Service Worker**:

```javascript
// In sw.js (or workbox config)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-fuel-finder") {
    event.waitUntil(syncPendingOperations());
  }
});
```

---

### Component 6: Offline UI Indicators

#### [NEW] `src/components/OfflineIndicator.tsx`

**Purpose**: Visual indicator when app is offline

**Design**:

```
┌─────────────────────────────────────┐
│ 📴 Offline Mode                     │
│ Using cached data from 2 hours ago  │
│ [Retry Connection]                  │
└─────────────────────────────────────┘
```

**Placement**: Top banner (similar to rerouting toast)

---

#### [MODIFY] `src/components/MainApp.tsx`

**Changes**:

1. Add `<OfflineIndicator />` component
2. Add online/offline event listeners
3. Show data freshness indicators on station and POI markers
4. Disable features that require network (e.g., price reporting)

**Lines to add**: After line 30 (imports), around line 100 (component render)

---

### Component 7: Settings & Management

#### [MODIFY] `src/contexts/SettingsContext.tsx`

**Changes**:

1. Add offline mode settings:
   ```typescript
   interface Settings {
     // ... existing settings
     offlineMode: {
       enabled: boolean;
       autoDownloadMaps: boolean;
       downloadOnWifiOnly: boolean;
       maxStorageMB: number;
       lastSyncAt: number | null;
     };
   }
   ```

**Lines to modify**: 10-20 (Settings interface)

---

#### [NEW] `src/components/OfflineSettings.tsx`

**Purpose**: Settings panel for offline mode configuration

**Features**:

- Toggle offline mode on/off
- Manage downloaded maps
- View storage usage
- Clear cached data
- Configure auto-download preferences

---

### Component 8: Data Freshness & Expiration

#### [NEW] `src/utils/dataFreshness.ts`

**Purpose**: Determine if cached data is still valid

**Logic**:

- Stations: 7 days
- Routes: 30 days
- Map tiles: 90 days
- Price data: 24 hours (show warning if older)

**Visual Indicators**:

- 🟢 Fresh (< 24 hours)
- 🟡 Stale (1-7 days)
- 🔴 Very Old (> 7 days)

---

## Verification Plan

### Automated Tests

#### 1. **IndexedDB Storage Tests**

**File**: `src/utils/__tests__/offlineStorage.test.ts` (NEW)

**Test Cases**:

- ✅ Cache stations successfully
- ✅ Retrieve cached stations by bounds
- ✅ Handle expired data
- ✅ Manage storage quota
- ✅ Sync queue operations

**Run Command**:

```bash
cd frontend
npm run test -- offlineStorage.test.ts
```

---

#### 2. **API Offline Fallback Tests**

**File**: `src/api/__tests__/stationsApi.test.ts` (NEW)

**Test Cases**:

- ✅ Network success caches data
- ✅ Network failure falls back to cache
- ✅ Offline mode uses cache
- ✅ Background sync queues failed requests

**Run Command**:

```bash
cd frontend
npm run test -- stationsApi.test.ts
```

---

#### 3. **Service Worker Caching Tests**

**File**: `src/__tests__/serviceWorker.test.ts` (NEW)

**Test Cases**:

- ✅ Map tiles cached correctly
- ✅ API responses cached with correct strategy
- ✅ Offline fallback page served
- ✅ Background sync triggered

**Run Command**:

```bash
cd frontend
npm run test -- serviceWorker.test.ts
```

---

### Manual Verification

#### 1. **Map Download Flow**

**Steps**:

1. Open app in Chrome DevTools
2. Go to Settings → Offline Maps
3. Click "Download Oriental Mindoro"
4. Verify progress indicator updates
5. Check Application → Cache Storage → `osm-tiles` in DevTools
6. Confirm ~120 MB of tiles cached

**Expected Result**: Map tiles visible in cache, progress reaches 100%

---

#### 2. **Offline Station & POI Access**

**Steps**:

1. Load app with internet connection
2. View stations and POIs in Oriental Mindoro
3. Open DevTools → Network tab
4. Check "Offline" checkbox
5. Pan map to different area
6. Verify stations and POIs still appear (from cache)
7. Check for "Offline Mode" banner
8. Verify all POI types display correctly (gas, convenience, repair, car_wash, motor_shop)

**Expected Result**: Cached stations and POIs display with correct icons, offline indicator shows

---

#### 3. **Offline Navigation**

**Steps**:

1. While online, navigate to a station (caches route)
2. Enable offline mode in DevTools
3. Navigate to the same station again
4. Verify route displays from cache
5. Try navigating to a new station (or POI)
6. Verify client-side routing engine calculates route offline
7. If routing data not downloaded, verify fallback message

**Expected Result**: Cached routes work, client-side routing works for new routes, graceful fallback if routing data unavailable

---

#### 4. **Background Sync**

**Steps**:

1. Enable offline mode
2. Try to report a fuel price (should queue)
3. Check IndexedDB → `syncQueue` store
4. Disable offline mode
5. Wait 10 seconds
6. Verify price report synced to server
7. Check for success notification

**Expected Result**: Queued operation syncs when online

---

#### 5. **Storage Management**

**Steps**:

1. Download map for Oriental Mindoro
2. Go to Settings → Offline Maps → Storage
3. Verify storage usage displayed correctly
4. Click "Clear Cached Maps"
5. Confirm cache cleared in DevTools
6. Verify storage usage updated

**Expected Result**: Storage accurately tracked and clearable

---

### Browser Testing

**Test in**:

- ✅ Chrome Desktop (primary)
- ✅ Chrome Mobile (Android)
- ✅ Safari iOS (PWA install)
- ✅ Firefox Desktop

**Focus Areas**:

- Service worker registration
- Cache API support
- IndexedDB compatibility
- Background Sync API (Chrome/Edge only)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Set up offline storage infrastructure

**Tasks**:

1. Create `offlineStorage.ts` with IndexedDB manager
2. Enhance `vite.config.ts` with better caching
3. Write unit tests for storage layer
4. Add offline detection utilities

**Deliverable**: Working offline storage system

---

### Phase 2: Map Caching (Week 1-2)

**Goal**: Enable map tile downloads

**Tasks**:

1. Build `OfflineMapDownloader` component
2. Implement `useMapDownloader` hook
3. Calculate Oriental Mindoro tile URLs
4. Add download progress tracking
5. Test with DevTools

**Deliverable**: Users can download maps

---

### Phase 3: Data Caching (Week 2)

**Goal**: Offline station and route access

**Tasks**:

1. Modify `stationsApi.ts` with offline fallback
2. Modify `poisApi.ts` with offline fallback for all POI types
3. Modify `routingApi.ts` with caching
4. Create `offlineRouting.ts` with client-side routing engine
5. Add data freshness indicators for stations and POIs
6. Write API tests

**Deliverable**: Stations, POIs, and routes work offline with full routing capability

---

### Phase 4: Sync & Polish (Week 2-3)

**Goal**: Background sync and UI refinements

**Tasks**:

1. Implement `backgroundSync.ts`
2. Add `OfflineIndicator` component
3. Create `OfflineSettings` panel
4. Add storage management UI
5. Manual testing across browsers

**Deliverable**: Complete offline mode feature

---

## Success Metrics

### Technical Metrics

- ✅ Map tiles cache: 5000+ tiles for Oriental Mindoro
- ✅ Offline station access: 100% of cached stations
- ✅ Route cache hit rate: >80% for common routes
- ✅ Storage usage: <200 MB total
- ✅ Sync success rate: >95% when online

### User Metrics

- ✅ Offline mode adoption: >30% of users
- ✅ Data savings: ~50 MB/month per user
- ✅ Rural user retention: +20%
- ✅ App rating: Maintain >4.5 stars

---

## Risks & Mitigations

### Risk 1: Storage Quota Exceeded

**Impact**: High - App unusable if quota full

**Mitigation**:

- Implement quota monitoring
- Auto-clear old data
- User controls for cache size
- Graceful degradation

---

### Risk 2: Stale Data Issues

**Impact**: Medium - Users see outdated prices

**Mitigation**:

- Clear visual indicators for data age
- Auto-refresh when online
- Expiration policies
- User education

---

### Risk 3: Browser Compatibility

**Impact**: Medium - Some browsers lack Background Sync

**Mitigation**:

- Feature detection
- Graceful fallback for unsupported browsers
- Manual sync button
- Clear messaging

---

### Risk 4: Complex State Management

**Impact**: Medium - Bugs in online/offline transitions

**Mitigation**:

- Comprehensive unit tests
- State machine for online/offline
- Extensive manual testing
- Error boundaries

---

## Future Enhancements (Post-MVP)

1. **Enhanced Routing Data**

   - Pre-download optimized routing graphs for faster calculations
   - Support for traffic-aware routing with periodic updates

2. **Multi-Region Support**

   - Download other provinces
   - Regional map management

3. **Predictive Caching**

   - ML-based route prediction
   - Pre-cache likely destinations

4. **Offline-First Architecture**

   - Prioritize offline by default
   - Sync in background

5. **P2P Data Sharing**
   - Share cached data between nearby users
   - Reduce server load

---

## Related Documentation

- **Feature Spec**: [CLIENT_FEATURE_WISHLIST.md](file:///home/keil/fuel_finder/DOCUMENTATIONS%20AND%20CONTEXT/CONTEXT/CLIENT_FEATURE_WISHLIST.md#L178-L189)
- **Current PWA Config**: [vite.config.ts](file:///home/keil/fuel_finder/frontend/vite.config.ts)
- **IndexedDB Implementation**: [indexedDB.ts](file:///home/keil/fuel_finder/frontend/src/utils/indexedDB.ts)
- **Service Worker**: [sw.js](file:///home/keil/fuel_finder/frontend/public/sw.js)

---

**Document Status**: ✅ Ready for Review  
**Next Step**: User approval to proceed with implementation  
**Estimated Timeline**: 2-3 weeks (1 developer)  
**Priority**: High Value Enhancement
