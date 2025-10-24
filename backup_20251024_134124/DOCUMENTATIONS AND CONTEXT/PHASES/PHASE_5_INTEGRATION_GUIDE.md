# Phase 5 - Integration Guide

## Playback Controls Integration

**Version**: 5.0.0  
**Date**: October 12, 2025

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Basic Integration](#basic-integration)
4. [Advanced Integration](#advanced-integration)
5. [MainApp.tsx Integration](#mainapp-integration)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Dependencies

Ensure you have completed Phase 1-4:

- ✅ **Phase 1**: Location recording (`locationRecorder.ts`)
- ✅ **Phase 2**: Trip session management (`tripSessionManager.ts`)
- ✅ **Phase 3**: Route visualization (`TripRouteVisualizer.tsx`)
- ✅ **Phase 4**: Replay animation (`tripReplayAnimator.ts`)

### Required Files

```
frontend/src/
├── components/
│   ├── TripReplayController.tsx    ✅ Phase 4
│   └── TripReplayVisualizer.tsx    ✅ Phase 4
├── utils/
│   ├── tripReplayAnimator.ts       ✅ Phase 4
│   └── indexedDB.ts                ✅ Phase 2
└── styles/
    └── TripReplayVisualizer.css    ✅ Phase 4
```

### TypeScript Version

Minimum: TypeScript 4.5+

### React Version

Minimum: React 18.0+

---

## Installation

### Step 1: Verify Files

Check that all Phase 4 files exist:

```bash
ls frontend/src/components/TripReplayController.tsx
ls frontend/src/components/TripReplayVisualizer.tsx
ls frontend/src/utils/tripReplayAnimator.ts
ls frontend/src/styles/TripReplayVisualizer.css
```

### Step 2: Import CSS

In your main app or component file:

```typescript
import './styles/TripReplayVisualizer.css';
```

Or in `index.tsx`:

```typescript
import './styles/TripReplayVisualizer.css';
```

### Step 3: Verify Imports

Test imports in a component:

```typescript
import TripReplayController from './components/TripReplayController';
import TripReplayVisualizer from './components/TripReplayVisualizer';
import { createTripReplayAnimator } from './utils/tripReplayAnimator';
```

---

## Basic Integration

### Scenario 1: Using TripReplayVisualizer (Recommended)

The easiest way - includes built-in controls:

```tsx
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import TripReplayVisualizer from './components/TripReplayVisualizer';
import { Trip } from './utils/indexedDB';

interface Props {
  trip: Trip;
}

const TripReplayPage: React.FC<Props> = ({ trip }) => {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <MapContainer
        center={[trip.coordinates[0].latitude, trip.coordinates[0].longitude]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* Built-in controls included */}
        <TripReplayVisualizer
          trip={trip}
          showControls={true}
          showRoute={true}
          showTraveledPath={true}
          autoFollow={false}
        />
      </MapContainer>
    </div>
  );
};

export default TripReplayPage;
```

### Scenario 2: Standalone Controller

Use controller separately from visualizer:

```tsx
import React, { useRef, useEffect } from 'react';
import TripReplayController from './components/TripReplayController';
import { createTripReplayAnimator, TripReplayAnimator } from './utils/tripReplayAnimator';
import { Trip } from './utils/indexedDB';

interface Props {
  trip: Trip;
}

const StandaloneControls: React.FC<Props> = ({ trip }) => {
  const animatorRef = useRef<TripReplayAnimator | null>(null);

  useEffect(() => {
    // Create animator
    animatorRef.current = createTripReplayAnimator(trip.coordinates);

    // Cleanup
    return () => {
      if (animatorRef.current) {
        animatorRef.current.dispose();
      }
    };
  }, [trip]);

  if (!animatorRef.current) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <TripReplayController
        animator={animatorRef.current}
        showTime={true}
        showSpeedControls={true}
        showProgressBar={true}
      />
    </div>
  );
};

export default StandaloneControls;
```

---

## Advanced Integration

### Scenario 3: Custom Event Handling

Track animation state and position:

```tsx
import React, { useState } from 'react';
import TripReplayVisualizer from './components/TripReplayVisualizer';
import { AnimationState, AnimationPosition } from './utils/tripReplayAnimator';

const AdvancedReplay: React.FC<{ trip: Trip }> = ({ trip }) => {
  const [state, setState] = useState<AnimationState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

  const handleStateChange = (newState: AnimationState) => {
    setState(newState);
    console.log('Animation state:', newState);
    
    if (newState === 'completed') {
      alert('Trip replay completed!');
    }
  };

  const handlePositionUpdate = (position: AnimationPosition) => {
    setProgress(position.progress);
    setCurrentLocation([position.latitude, position.longitude]);
  };

  return (
    <div>
      {/* Status Display */}
      <div style={{ padding: '10px', background: '#f5f5f5' }}>
        <p>State: {state}</p>
        <p>Progress: {(progress * 100).toFixed(1)}%</p>
        {currentLocation && (
          <p>Location: {currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}</p>
        )}
      </div>

      {/* Map with Replay */}
      <MapContainer center={[13.4, 121.2]} zoom={13} style={{ height: '500px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TripReplayVisualizer
          trip={trip}
          showControls={true}
          onStateChange={handleStateChange}
          onPositionUpdate={handlePositionUpdate}
        />
      </MapContainer>
    </div>
  );
};
```

### Scenario 4: Multiple Trip Selector

Allow users to select and replay different trips:

```tsx
import React, { useState } from 'react';
import TripReplayVisualizer from './components/TripReplayVisualizer';

const MultiTripReplay: React.FC<{ trips: Trip[] }> = ({ trips }) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip>(trips[0]);
  const [key, setKey] = useState(0); // Force re-render

  const handleTripChange = (trip: Trip) => {
    setSelectedTrip(trip);
    setKey(prev => prev + 1); // Force new animator instance
  };

  return (
    <div>
      {/* Trip Selector */}
      <div style={{ padding: '10px', background: '#f5f5f5' }}>
        <label>Select Trip: </label>
        <select onChange={(e) => {
          const trip = trips.find(t => t.id === e.target.value);
          if (trip) handleTripChange(trip);
        }}>
          {trips.map(trip => (
            <option key={trip.id} value={trip.id}>
              {trip.name}
            </option>
          ))}
        </select>
      </div>

      {/* Map with Replay */}
      <MapContainer center={[13.4, 121.2]} zoom={12} style={{ height: '500px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TripReplayVisualizer
          key={key}
          trip={selectedTrip}
          showControls={true}
          autoFollow={true}
        />
      </MapContainer>
    </div>
  );
};
```

### Scenario 5: Programmatic Control

Control animation from external buttons:

```tsx
import React, { useRef, useState } from 'react';
import TripReplayVisualizer from './components/TripReplayVisualizer';
import { TripReplayAnimator } from './utils/tripReplayAnimator';

const ProgrammaticControl: React.FC<{ trip: Trip }> = ({ trip }) => {
  const animatorRef = useRef<TripReplayAnimator | null>(null);
  const [speed, setSpeed] = useState(1);

  // Custom control functions
  const handlePlay = () => animatorRef.current?.play();
  const handlePause = () => animatorRef.current?.pause();
  const handleRestart = () => animatorRef.current?.restart();
  const handleSpeedUp = () => {
    const newSpeed = Math.min(speed + 0.5, 4);
    animatorRef.current?.setSpeed(newSpeed as any);
    setSpeed(newSpeed);
  };
  const handleSlowDown = () => {
    const newSpeed = Math.max(speed - 0.5, 1);
    animatorRef.current?.setSpeed(newSpeed as any);
    setSpeed(newSpeed);
  };

  return (
    <div>
      {/* Custom Control Panel */}
      <div style={{ padding: '10px', background: '#f5f5f5', marginBottom: '10px' }}>
        <button onClick={handlePlay}>▶ Play</button>
        <button onClick={handlePause}>⏸ Pause</button>
        <button onClick={handleRestart}>↻ Restart</button>
        <button onClick={handleSlowDown}>🐌 Slower</button>
        <button onClick={handleSpeedUp}>🚀 Faster</button>
        <span>Speed: {speed}x</span>
      </div>

      {/* Map with Replay (no built-in controls) */}
      <MapContainer center={[13.4, 121.2]} zoom={13} style={{ height: '500px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TripReplayVisualizer
          trip={trip}
          showControls={false}  // Hide built-in controls
          ref={(viz) => {
            // Access animator through visualizer
            if (viz) {
              // Store animator reference
            }
          }}
        />
      </MapContainer>
    </div>
  );
};
```

---

## MainApp Integration

### Complete MainApp.tsx Example

Integrate all phases into your main application:

```tsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import TripReplayVisualizer from './components/TripReplayVisualizer';
import { Trip, tripSessionManager } from './utils/indexedDB';
import './styles/TripReplayVisualizer.css';

const MainApp: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isReplayMode, setIsReplayMode] = useState(false);

  // Load trips on mount
  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    const allTrips = await tripSessionManager.getAllTrips();
    setTrips(allTrips);
  };

  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsReplayMode(true);
  };

  const handleExitReplay = () => {
    setIsReplayMode(false);
    setSelectedTrip(null);
  };

  return (
    <div className="main-app">
      {/* Header */}
      <header style={{ padding: '10px', background: '#2196F3', color: 'white' }}>
        <h1>Fuel Finder - Trip Replay</h1>
      </header>

      {/* Trip List Sidebar */}
      {!isReplayMode && (
        <aside style={{ width: '300px', padding: '10px', background: '#f5f5f5' }}>
          <h2>Your Trips</h2>
          {trips.length === 0 ? (
            <p>No trips recorded yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {trips.map(trip => (
                <li key={trip.id} style={{ marginBottom: '10px' }}>
                  <button
                    onClick={() => handleTripSelect(trip)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{trip.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(trip.startTime).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {trip.coordinates.length} points
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {isReplayMode && selectedTrip ? (
          <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Back Button */}
            <div style={{ padding: '10px', background: '#f5f5f5' }}>
              <button onClick={handleExitReplay}>← Back to Trips</button>
              <span style={{ marginLeft: '20px', fontWeight: 'bold' }}>
                {selectedTrip.name}
              </span>
            </div>

            {/* Map with Replay */}
            <div style={{ flex: 1 }}>
              <MapContainer
                center={[
                  selectedTrip.coordinates[0].latitude,
                  selectedTrip.coordinates[0].longitude
                ]}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                
                <TripReplayVisualizer
                  trip={selectedTrip}
                  showControls={true}
                  showRoute={true}
                  showTraveledPath={true}
                  autoFollow={true}
                  animationConfig={{
                    speed: 2,
                    interpolate: true,
                    interpolationSteps: 10
                  }}
                  onStateChange={(state) => {
                    if (state === 'completed') {
                      console.log('Replay completed!');
                    }
                  }}
                />
              </MapContainer>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>Select a trip to replay</h2>
            <p>Choose a trip from the sidebar to view its replay animation.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainApp;
```

---

## Troubleshooting

### Issue 1: Controls Not Visible

**Symptom**: Playback controls don't appear.

**Solution**: Import CSS file.

```typescript
import './styles/TripReplayVisualizer.css';
```

### Issue 2: Animator Not Defined

**Symptom**: `TypeError: animator is undefined`

**Solution**: Ensure animator is created before rendering controller.

```typescript
const animatorRef = useRef<TripReplayAnimator | null>(null);

useEffect(() => {
  animatorRef.current = createTripReplayAnimator(trip.coordinates);
}, [trip]);

if (!animatorRef.current) {
  return <div>Loading...</div>;
}
```

### Issue 3: Progress Bar Not Updating

**Symptom**: Progress bar stays at 0%.

**Solution**: Verify subscription is set up correctly.

```typescript
useEffect(() => {
  const unsubscribe = animator.subscribe((position, state) => {
    setProgress(position.progress);
  });
  return () => unsubscribe();
}, [animator]);
```

### Issue 4: Memory Leaks

**Symptom**: Memory usage increases over time.

**Solution**: Always dispose animator on unmount.

```typescript
useEffect(() => {
  return () => {
    if (animatorRef.current) {
      animatorRef.current.dispose();
    }
  };
}, []);
```

### Issue 5: Mobile Touch Not Working

**Symptom**: Touch events don't work on mobile.

**Solution**: Ensure touch event handlers are present (they should be by default in TripReplayController).

### Issue 6: Animation Jerky

**Symptom**: Animation is not smooth.

**Solution**: Enable interpolation.

```typescript
const animator = createTripReplayAnimator(trip.coordinates, {
  interpolate: true,
  interpolationSteps: 10
});
```

---

## Best Practices

### 1. Always Cleanup

```typescript
useEffect(() => {
  const animator = createTripReplayAnimator(trip.coordinates);
  
  return () => {
    animator.dispose();
  };
}, [trip]);
```

### 2. Validate Trip Data

```typescript
if (!trip || trip.coordinates.length < 2) {
  return <div>Error: Invalid trip data</div>;
}
```

### 3. Handle Loading States

```typescript
if (!animator) {
  return <div>Loading animator...</div>;
}
```

### 4. Memoize Callbacks

```typescript
const handleStateChange = useCallback((state: AnimationState) => {
  console.log('State:', state);
}, []);
```

### 5. Use Keys for Dynamic Trips

```tsx
<TripReplayVisualizer
  key={trip.id}  // Force re-render on trip change
  trip={trip}
/>
```

---

## Testing Checklist

Before deploying:

- [ ] Import CSS file
- [ ] Test play/pause/restart buttons
- [ ] Test speed controls (all 5 speeds)
- [ ] Test progress bar scrubbing
- [ ] Test on desktop browser
- [ ] Test on mobile device
- [ ] Test touch controls
- [ ] Test keyboard navigation
- [ ] Verify cleanup on unmount
- [ ] Check for memory leaks
- [ ] Test with small trips (< 50 points)
- [ ] Test with large trips (> 100 points)

---

## Next Steps

After integration:

1. **Test thoroughly** on all target devices
2. **Gather user feedback** on controls usability
3. **Monitor performance** metrics
4. **Consider Phase 6** enhancements (analytics, export, etc.)

---

## Related Documentation

- **API Reference**: `PHASE_5_API_DOCUMENTATION.md`
- **Quick Reference**: `PHASE_5_QUICK_REFERENCE.md`
- **Feature Details**: `PHASE_5_PLAYBACK_CONTROLS.md`
- **Phase 4 Docs**: `PHASE_4_COMPLETE.md`

---

**Last Updated**: October 12, 2025  
**Version**: 5.0.0  
**Status**: Production Ready
