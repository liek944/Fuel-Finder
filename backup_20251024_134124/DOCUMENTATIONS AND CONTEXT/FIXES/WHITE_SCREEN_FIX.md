# White Screen Fix - Trip Replay

## Problem

When clicking "Replay" on a trip, the screen went completely white.

## Root Cause

The `TripReplayVisualizer` component was being rendered **outside** the `MapContainer`. 

React-Leaflet components (like `Polyline`, `Marker`, etc.) **must** be rendered inside a `MapContainer` to access the map context. When they're rendered outside, they fail and cause a white screen.

## Solution

Moved `TripReplayVisualizer` **inside** the `MapContainer`, right before it closes.

### Before (❌ Broken):
```tsx
<MapContainer>
  <TileLayer />
  <Marker />
  {/* ... other map components ... */}
</MapContainer>

{/* ❌ OUTSIDE MapContainer - causes white screen */}
{selectedTrip && (
  <TripReplayVisualizer trip={selectedTrip} />
)}
```

### After (✅ Fixed):
```tsx
<MapContainer>
  <TileLayer />
  <Marker />
  {/* ... other map components ... */}
  
  {/* ✅ INSIDE MapContainer - works correctly */}
  {selectedTrip && (
    <TripReplayVisualizer trip={selectedTrip} />
  )}
</MapContainer>
```

## Changes Made

**File:** `frontend/src/components/MainApp.tsx`

1. Moved `TripReplayVisualizer` from outside MapContainer (line ~1595)
2. To inside MapContainer, before closing tag (line ~1352)
3. Removed duplicate instance

## Why This Matters

React-Leaflet uses React Context to provide map instance to child components:

```
MapContainer (provides context)
  ├─ TileLayer (uses context) ✅
  ├─ Marker (uses context) ✅
  └─ TripReplayVisualizer (uses context) ✅
      └─ Polyline (uses context) ✅

TripReplayVisualizer (no context available) ❌
  └─ Polyline (crashes - no map context) 💥
```

## Testing

1. Click "Trip History" button
2. Select a trip
3. Click "Replay"
4. Should now see:
   - Map with route visualization
   - Animated marker moving along route
   - Playback controls
   - No white screen!

## Build Status

✅ Build successful  
✅ No errors  
✅ Ready to deploy

---

**Fixed:** October 13, 2025  
**Issue:** White screen on replay  
**Status:** ✅ Resolved
