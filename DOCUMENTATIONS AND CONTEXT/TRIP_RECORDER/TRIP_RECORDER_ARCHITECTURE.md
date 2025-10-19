# Trip Recorder - System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Fuel Finder App                          │
│                         (MainApp.tsx)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ imports & renders
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TripRecorder Component                       │
│                     (TripRecorder.tsx)                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  UI State Management                                     │  │
│  │  - isExpanded, tripName, recorderState                  │  │
│  │  - Event handlers (start, stop, pause, resume)          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             │ subscribes to                     │
│                             ▼                                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │
┌─────────────────────────────▼───────────────────────────────────┐
│                  LocationRecorder Service                       │
│                   (locationRecorder.ts)                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  State Management                                        │  │
│  │  - status, currentTrip, pointsRecorded, lastPoint       │  │
│  │  - listeners (observer pattern)                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │  Geolocation API Integration                            │  │
│  │  - navigator.geolocation.watchPosition()                │  │
│  │  - Position success/error handlers                      │  │
│  │  - Throttling & accuracy filtering                      │  │
│  └─────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│                             │ saves to                          │
│                             ▼                                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │
┌─────────────────────────────▼───────────────────────────────────┐
│                    IndexedDB Manager                            │
│                      (indexedDB.ts)                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Database Operations                                     │  │
│  │  - createTrip(), getTrip(), getAllTrips()               │  │
│  │  - addGPSPoint(), endTrip(), deleteTrip()               │  │
│  └─────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│                             │ persists to                       │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Browser IndexedDB                                       │  │
│  │  Database: FuelFinderTrips                              │  │
│  │  Store: trips                                           │  │
│  │  Indexes: startTime, isActive                           │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Recording Start Flow

```
User clicks "Start Recording"
         │
         ▼
TripRecorder.handleStartRecording()
         │
         ├─→ locationRecorder.requestPermission()
         │         │
         │         └─→ navigator.geolocation.getCurrentPosition()
         │                   │
         │                   └─→ [Permission Granted]
         │
         ├─→ tripDB.getActiveTrip()
         │         │
         │         └─→ [End existing trip if found]
         │
         ├─→ tripDB.createTrip(name)
         │         │
         │         └─→ IndexedDB.add(trip)
         │
         └─→ navigator.geolocation.watchPosition()
                   │
                   └─→ [Start continuous tracking]
```

### GPS Point Capture Flow

```
navigator.geolocation.watchPosition()
         │
         ├─→ [Every ~3 seconds]
         │
         ▼
handlePositionSuccess(position)
         │
         ├─→ Check throttle (updateInterval)
         │         │
         │         └─→ [Skip if too soon]
         │
         ├─→ Check accuracy (minAccuracy)
         │         │
         │         └─→ [Skip if accuracy > 50m]
         │
         ├─→ Create GPSPoint object
         │         │
         │         └─→ { lat, lng, timestamp, accuracy, ... }
         │
         ├─→ tripDB.addGPSPoint(tripId, point)
         │         │
         │         └─→ IndexedDB.put(updatedTrip)
         │
         └─→ Update state & notify listeners
                   │
                   └─→ TripRecorder re-renders with new data
```

### Recording Stop Flow

```
User clicks "Stop & Save"
         │
         ▼
TripRecorder.handleStopRecording()
         │
         ├─→ locationRecorder.stopRecording()
         │         │
         │         ├─→ navigator.geolocation.clearWatch()
         │         │
         │         ├─→ tripDB.endTrip(tripId)
         │         │         │
         │         │         └─→ IndexedDB.put(trip with endTime)
         │         │
         │         └─→ Return completed trip
         │
         └─→ onTripComplete(trip)
                   │
                   └─→ [Callback to parent component]
```

## Component Hierarchy

```
MainApp
  │
  ├─── MapContainer (Leaflet)
  │      │
  │      ├─── TileLayer
  │      ├─── Markers (Stations)
  │      ├─── Markers (POIs)
  │      └─── Polyline (Routes)
  │
  └─── TripRecorder (Floating Widget)
         │
         ├─── Header (Status Indicator)
         │
         └─── Content (Expandable)
                │
                ├─── StartSection
                │      ├─── Input (Trip Name)
                │      └─── Button (Start)
                │
                ├─── RecordingSection
                │      ├─── StatsGrid
                │      │      ├─── Duration
                │      │      ├─── Points
                │      │      ├─── Accuracy
                │      │      └─── Speed
                │      │
                │      ├─── LastPointInfo
                │      │      ├─── Coordinates
                │      │      └─── Timestamp
                │      │
                │      └─── ControlButtons
                │             ├─── Pause/Resume
                │             └─── Stop
                │
                └─── ErrorSection
                       ├─── ErrorIcon
                       ├─── ErrorMessage
                       └─── RetryButton
```

## State Management

### LocationRecorder State

```typescript
interface RecorderState {
  status: 'idle' | 'recording' | 'paused' | 'error';
  currentTrip: Trip | null;
  pointsRecorded: number;
  lastPoint: GPSPoint | null;
  error: string | null;
}
```

**State Transitions:**
```
idle ──[start]──> recording
                     │
                     ├──[pause]──> paused ──[resume]──> recording
                     │
                     ├──[stop]───> idle
                     │
                     └──[error]──> error ──[retry]──> recording
```

### Observer Pattern

```
LocationRecorder (Subject)
         │
         ├─→ listeners: Set<(state) => void>
         │
         ├─→ subscribe(listener)
         │      └─→ listeners.add(listener)
         │
         ├─→ notifyListeners()
         │      └─→ listeners.forEach(l => l(state))
         │
         └─→ updateState(changes)
                └─→ notifyListeners()

TripRecorder (Observer)
         │
         └─→ useEffect(() => {
                const unsubscribe = locationRecorder.subscribe(setState);
                return unsubscribe;
             })
```

## Database Schema

### IndexedDB Structure

```
Database: FuelFinderTrips (v1)
  │
  └─── ObjectStore: trips
         │
         ├─── keyPath: "id"
         │
         ├─── Index: "startTime" (non-unique)
         │
         └─── Index: "isActive" (non-unique)

Trip Object:
{
  id: string,              // Primary key
  name: string,
  startTime: number,       // Indexed
  endTime: number | null,
  isActive: boolean,       // Indexed
  coordinates: GPSPoint[]  // Array of points
}

GPSPoint Object:
{
  latitude: number,
  longitude: number,
  timestamp: number,
  accuracy?: number,
  altitude?: number | null,
  altitudeAccuracy?: number | null,
  heading?: number | null,
  speed?: number | null
}
```

## API Integration Points

### Browser APIs Used

```
┌─────────────────────────────────────┐
│  Geolocation API                    │
│  - getCurrentPosition()             │
│  - watchPosition()                  │
│  - clearWatch()                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  IndexedDB API                      │
│  - indexedDB.open()                 │
│  - createObjectStore()              │
│  - transaction()                    │
│  - add(), get(), put(), delete()    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  React Hooks                        │
│  - useState()                       │
│  - useEffect()                      │
│  - Custom cleanup functions         │
└─────────────────────────────────────┘
```

## Performance Optimization

### Throttling Strategy

```
GPS Update (every ~1s from device)
         │
         ▼
watchPosition callback
         │
         ├─→ Check: now - lastUpdateTime < updateInterval?
         │         │
         │         ├─→ YES: Skip (throttle)
         │         │
         │         └─→ NO: Continue
         │
         ├─→ Check: accuracy > minAccuracy?
         │         │
         │         ├─→ YES: Skip (filter)
         │         │
         │         └─→ NO: Continue
         │
         └─→ Save point to IndexedDB
```

### Memory Management

```
Component Mount
         │
         └─→ useEffect(() => {
                const unsubscribe = subscribe(...);
                return () => unsubscribe();  // Cleanup
             })

Component Unmount
         │
         └─→ Cleanup function called
                │
                └─→ Remove listener from Set
```

## Error Handling Flow

```
Geolocation Error
         │
         ├─→ PERMISSION_DENIED (code 1)
         │      └─→ "Location permission denied..."
         │
         ├─→ POSITION_UNAVAILABLE (code 2)
         │      └─→ "Location information unavailable..."
         │
         └─→ TIMEOUT (code 3)
                └─→ "Location request timed out..."
                         │
                         ▼
         handlePositionError(error)
                         │
                         ├─→ getGeolocationErrorMessage()
                         │
                         └─→ updateState({ status: 'error', error: msg })
                                  │
                                  └─→ notifyListeners()
                                         │
                                         └─→ UI shows error section
```

## Configuration Flow

```
Default Config
         │
         ├─→ updateInterval: 3000
         ├─→ highAccuracy: true
         ├─→ maximumAge: 5000
         ├─→ timeout: 10000
         └─→ minAccuracy: 50
                │
                ▼
locationRecorder.updateConfig({ ... })
                │
                └─→ Merge with existing config
                         │
                         └─→ Applied on next watchPosition() call
```

## Security & Privacy Model

```
User Action Required
         │
         ▼
Browser Permission Prompt
         │
         ├─→ [Allow]
         │      │
         │      └─→ Geolocation enabled
         │             │
         │             └─→ Data stored locally (IndexedDB)
         │                    │
         │                    └─→ No server transmission
         │
         └─→ [Deny]
                │
                └─→ Error state
                       │
                       └─→ User can retry
```

## Deployment Architecture

```
┌─────────────────────────────────────┐
│  Development                        │
│  - npm start                        │
│  - localhost:3000                   │
│  - Hot reload enabled               │
└─────────────────────────────────────┘
                │
                │ npm run build
                ▼
┌─────────────────────────────────────┐
│  Production Build                   │
│  - Optimized bundle                 │
│  - Minified JS/CSS                  │
│  - Source maps                      │
└─────────────────────────────────────┘
                │
                │ deploy
                ▼
┌─────────────────────────────────────┐
│  Vercel (Frontend)                  │
│  - Static hosting                   │
│  - CDN distribution                 │
│  - HTTPS enabled                    │
└─────────────────────────────────────┘
                │
                │ user accesses
                ▼
┌─────────────────────────────────────┐
│  User's Browser                     │
│  - React app loads                  │
│  - IndexedDB initialized            │
│  - Geolocation requested            │
└─────────────────────────────────────┘
```

## Module Dependencies

```
TripRecorder.tsx
  │
  ├─→ React (useState, useEffect)
  ├─→ locationRecorder (service)
  ├─→ Trip (type from indexedDB)
  └─→ TripRecorder.css (styles)

locationRecorder.ts
  │
  ├─→ tripDB (IndexedDB manager)
  ├─→ GPSPoint, Trip (types)
  └─→ navigator.geolocation (browser API)

indexedDB.ts
  │
  ├─→ indexedDB (browser API)
  └─→ GPSPoint, Trip (type definitions)
```

## Testing Strategy

```
Unit Tests
  │
  ├─→ indexedDB.ts
  │      ├─→ CRUD operations
  │      ├─→ Error handling
  │      └─→ Data validation
  │
  ├─→ locationRecorder.ts
  │      ├─→ State transitions
  │      ├─→ Throttling logic
  │      └─→ Error handling
  │
  └─→ TripRecorder.tsx
         ├─→ Component rendering
         ├─→ User interactions
         └─→ State updates

Integration Tests
  │
  ├─→ Full recording flow
  ├─→ Permission handling
  └─→ Data persistence

E2E Tests
  │
  ├─→ User journey (start → record → stop)
  ├─→ Error scenarios
  └─→ Mobile responsiveness
```

## Phase 2 Architecture: Trip Session Manager ✅

### Trip Session Manager Layer

```
┌─────────────────────────────────────────────────────────┐
│         Trip Session Manager (tripSessionManager.ts)    │
│                      Singleton Service                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  CRUD Operations                                  │ │
│  │  - createTrip(), createMultipleTrips()            │ │
│  │  - getTrip(), getAllTrips(), getActiveTrip()      │ │
│  │  - renameTrip(), batchRenameTrips()               │ │
│  │  - deleteTrip(), deleteMultipleTrips()            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Advanced Queries                                 │ │
│  │  - getFilteredTrips(filter)                       │ │
│  │  - getSortedTrips(sortOptions)                    │ │
│  │  - getTripsWithOptions(filter, sort)              │ │
│  │  - getTripMetadata(), getAllTripMetadata()        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Batch Operations                                 │ │
│  │  - deleteCompletedTrips()                         │ │
│  │  - deleteOldTrips(date)                           │ │
│  │  - clearAllTrips()                                │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Analytics & Utilities                            │ │
│  │  - calculateDistance() (Haversine)                │ │
│  │  - calculateAverageSpeed()                        │ │
│  │  - validateTrip()                                 │ │
│  │  - getStorageStats()                              │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              IndexedDB Manager (tripDB)                 │
│  - Low-level database operations                       │
│  - Transaction management                              │
└─────────────────────────────────────────────────────────┘
```

### Data Flow - Phase 2

```
UI Component (e.g., TripList)
         │
         ├─→ tripSessionManager.getAllTripMetadata()
         │         │
         │         └─→ Returns lightweight metadata
         │
         ├─→ tripSessionManager.renameTrip(id, name)
         │         │
         │         └─→ Updates trip in IndexedDB
         │
         ├─→ tripSessionManager.deleteTrip(id)
         │         │
         │         └─→ Removes from IndexedDB
         │
         └─→ tripSessionManager.getFilteredTrips(filter)
                   │
                   └─→ Returns filtered & sorted trips
```

### Filter & Sort Pipeline

```
getAllTrips()
      │
      ▼
Apply Filters
  ├─→ isActive filter
  ├─→ Date range filter
  ├─→ Duration filter
  ├─→ Point count filter
  └─→ Search term filter
      │
      ▼
Apply Sorting
  ├─→ By startTime
  ├─→ By endTime
  ├─→ By duration
  ├─→ By pointCount
  └─→ By name
      │
      ▼
Return Results
```

---

## Phase 3 Architecture: Route Visualization ✅

### Route Visualization Layer

```
┌─────────────────────────────────────────────────────────────┐
│         TripRouteVisualizer Component                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Route Rendering                                      │ │
│  │  - createGradientSegments()                           │ │
│  │  - Leaflet Polyline (multiple colored segments)      │ │
│  │  - Start/End markers with custom icons               │ │
│  │  - Auto-fit bounds with useFitBounds hook            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Interactive Features                                 │ │
│  │  - Click handlers on polylines                       │ │
│  │  - Hover effects                                      │ │
│  │  - Popup information on markers                      │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Route Visualizer Utilities                     │
│  - Color gradient generation (RGB interpolation)           │
│  - GPS coordinate conversion                               │
│  - Bounds calculation                                      │
│  - Route simplification (Douglas-Peucker)                  │
│  - Data validation                                         │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Trip Visualization

```
┌─────────────────────────────────────────────────────────────┐
│         MultiTripVisualizer Component                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Trip Management                                      │ │
│  │  - Render multiple TripRouteVisualizer instances     │ │
│  │  - Automatic color differentiation                   │ │
│  │  - Batch bounds fitting                              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│         ├─→ TripRouteVisualizer (Trip 1, Green→Red)        │
│         ├─→ TripRouteVisualizer (Trip 2, Blue→Orange)      │
│         └─→ TripRouteVisualizer (Trip 3, Purple→Yellow)    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow - Phase 3

```
User selects trip to visualize
         │
         ▼
Load trip from IndexedDB (Phase 2)
         │
         ├─→ tripSessionManager.getTrip(id)
         │
         ▼
Validate route points
         │
         ├─→ validateRoutePoints(coordinates)
         │         │
         │         └─→ Check: ≥2 points, valid lat/lng
         │
         ▼
Create gradient segments
         │
         ├─→ generateColorGradient(gradient)
         │         │
         │         └─→ Interpolate colors (100 steps)
         │
         ├─→ splitIntoSegments(points, 100)
         │         │
         │         └─→ Divide route into segments
         │
         ▼
Render on Leaflet map
         │
         ├─→ Multiple Polyline components (colored segments)
         ├─→ Marker (start) with custom icon
         ├─→ Marker (end) with custom icon
         │
         ▼
Auto-fit map bounds
         │
         └─→ calculateBounds() → map.fitBounds()
```

### Color Gradient Algorithm

```
Input: start color, end color, steps
         │
         ▼
Parse hex colors to RGB
         │
         ├─→ '#00ff00' → R:0, G:255, B:0
         ├─→ '#ff0000' → R:255, G:0, B:0
         │
         ▼
For each step (0 to steps-1):
         │
         ├─→ factor = step / (steps - 1)
         │
         ├─→ R = R1 + factor * (R2 - R1)
         ├─→ G = G1 + factor * (G2 - G1)
         ├─→ B = B1 + factor * (B2 - B1)
         │
         └─→ Convert back to hex: '#rrggbb'
```

---

## Future Architecture Extensions

### Phase 4: Replay Animation (Next)
```
TripRouteVisualizer
  │
  └─→ TripReplayAnimator Component
         │
         ├─→ requestAnimationFrame() loop
         ├─→ Marker interpolation between points
         ├─→ Speed controls (1x-4x)
         ├─→ Progress indicator
         └─→ Play/Pause/Restart controls
```

### Phase 5: Advanced Analytics
```
TripAnalytics Component
  │
  ├─→ Elevation profile chart
  ├─→ Speed heatmap overlay
  ├─→ Stop detection visualization
  └─→ Route comparison tools
```

---

**Architecture Version**: 3.0  
**Last Updated**: 2025-10-12  
**Status**: Phase 3 Complete - Production Ready
