# Phase 3 - Integration Guide

Quick guide to integrate route visualization into your Fuel Finder app.

**Version**: 3.0.0  
**Date**: 2025-10-12

---

## Quick Start (5 Minutes)

### Step 1: Import Components

Add to your map component:

```typescript
import TripRouteVisualizer from './components/TripRouteVisualizer';
import { tripSessionManager } from './utils/tripSessionManager';
import './styles/TripRouteVisualizer.css';
```

### Step 2: Load Trip Data

```typescript
const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

useEffect(() => {
  async function loadTrip() {
    const trips = await tripSessionManager.getAllTrips();
    if (trips.length > 0) {
      setSelectedTrip(trips[0]);
    }
  }
  loadTrip();
}, []);
```

### Step 3: Add to Map

```tsx
<MapContainer center={[13.4, 121.2]} zoom={10}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  
  {/* Your existing markers */}
  {stations.map(station => <Marker ... />)}
  
  {/* Add trip visualization */}
  {selectedTrip && (
    <TripRouteVisualizer trip={selectedTrip} />
  )}
</MapContainer>
```

**Done!** Your trip route will now display with a green-to-red gradient.

---

## Integration with MainApp.tsx

### Option 1: Add Trip Selector

```tsx
import React, { useState, useEffect } from 'react';
import TripRouteVisualizer from './TripRouteVisualizer';
import { tripSessionManager } from '../utils/tripSessionManager';

function MainApp() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    const allTrips = await tripSessionManager.getAllTrips();
    setTrips(allTrips);
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  return (
    <div>
      {/* Trip Selector UI */}
      <select onChange={(e) => setSelectedTripId(e.target.value)}>
        <option value="">Select a trip...</option>
        {trips.map(trip => (
          <option key={trip.id} value={trip.id}>
            {trip.name}
          </option>
        ))}
      </select>

      {/* Map with Route */}
      <MapContainer>
        <TileLayer />
        {selectedTrip && <TripRouteVisualizer trip={selectedTrip} />}
      </MapContainer>
    </div>
  );
}
```

### Option 2: Show Latest Trip Automatically

```tsx
function MainApp() {
  const [latestTrip, setLatestTrip] = useState<Trip | null>(null);

  useEffect(() => {
    async function loadLatest() {
      const trips = await tripSessionManager.getSortedTrips({
        field: 'startTime',
        order: 'desc'
      });
      if (trips.length > 0) {
        setLatestTrip(trips[0]);
      }
    }
    loadLatest();
  }, []);

  return (
    <MapContainer>
      <TileLayer />
      {latestTrip && <TripRouteVisualizer trip={latestTrip} />}
    </MapContainer>
  );
}
```

### Option 3: Toggle Visibility

```tsx
function MainApp() {
  const [showRoute, setShowRoute] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);

  return (
    <div>
      <button onClick={() => setShowRoute(!showRoute)}>
        {showRoute ? 'Hide Route' : 'Show Route'}
      </button>

      <MapContainer>
        <TileLayer />
        {showRoute && trip && <TripRouteVisualizer trip={trip} />}
      </MapContainer>
    </div>
  );
}
```

---

## Integration with TripRecorder

Connect recording and visualization:

```tsx
import TripRecorder from './TripRecorder';
import TripRouteVisualizer from './TripRouteVisualizer';

function MainApp() {
  const [completedTrip, setCompletedTrip] = useState<Trip | null>(null);

  const handleTripComplete = (trip: Trip) => {
    console.log('Trip completed:', trip.name);
    setCompletedTrip(trip);
  };

  return (
    <div>
      {/* Recording Widget */}
      <TripRecorder onTripComplete={handleTripComplete} />

      {/* Map with Route */}
      <MapContainer>
        <TileLayer />
        
        {/* Show completed trip */}
        {completedTrip && (
          <TripRouteVisualizer
            trip={completedTrip}
            options={{ fitBounds: true }}
          />
        )}
      </MapContainer>
    </div>
  );
}
```

---

## Customization Examples

### Custom Colors

```tsx
import { COLOR_GRADIENTS } from '../utils/routeVisualizer';

<TripRouteVisualizer
  trip={trip}
  options={{
    gradient: COLOR_GRADIENTS.BLUE_ORANGE
  }}
/>
```

### Thicker Line

```tsx
<TripRouteVisualizer
  trip={trip}
  options={{
    weight: 6,
    opacity: 0.9
  }}
/>
```

### No Markers

```tsx
<TripRouteVisualizer
  trip={trip}
  options={{
    showStartMarker: false,
    showEndMarker: false
  }}
/>
```

### Click Handler

```tsx
const handleRouteClick = (trip: Trip) => {
  alert(`Clicked on ${trip.name}`);
  // Start replay, show details, etc.
};

<TripRouteVisualizer
  trip={trip}
  onRouteClick={handleRouteClick}
/>
```

---

## Multiple Trips

```tsx
import MultiTripVisualizer from './MultiTripVisualizer';

function MainApp() {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    async function loadTrips() {
      const allTrips = await tripSessionManager.getAllTrips();
      setTrips(allTrips.slice(0, 3)); // Show last 3 trips
    }
    loadTrips();
  }, []);

  return (
    <MapContainer>
      <TileLayer />
      <MultiTripVisualizer
        trips={trips}
        useDistinctColors={true}
        fitAllTrips={true}
      />
    </MapContainer>
  );
}
```

---

## Performance Optimization

### For Large Trips

```tsx
import { simplifyRoute } from '../utils/routeVisualizer';

function MainApp() {
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    async function loadAndOptimize() {
      const loadedTrip = await tripSessionManager.getTrip(tripId);
      
      // Simplify if too many points
      if (loadedTrip.coordinates.length > 1000) {
        loadedTrip.coordinates = simplifyRoute(
          loadedTrip.coordinates,
          0.0001
        );
      }
      
      setTrip(loadedTrip);
    }
    loadAndOptimize();
  }, []);

  return (
    <MapContainer>
      <TileLayer />
      {trip && <TripRouteVisualizer trip={trip} />}
    </MapContainer>
  );
}
```

---

## Error Handling

```tsx
import { validateRoutePoints } from '../utils/routeVisualizer';

function MainApp() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrip() {
      try {
        const loadedTrip = await tripSessionManager.getTrip(tripId);
        
        // Validate before rendering
        const validation = validateRoutePoints(loadedTrip.coordinates);
        if (!validation.valid) {
          setError(validation.errors.join(', '));
          return;
        }
        
        setTrip(loadedTrip);
      } catch (err) {
        setError('Failed to load trip');
      }
    }
    loadTrip();
  }, []);

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <MapContainer>
      <TileLayer />
      {trip && <TripRouteVisualizer trip={trip} />}
    </MapContainer>
  );
}
```

---

## Styling

### Custom CSS

Add to your stylesheet:

```css
/* Custom marker colors */
.route-marker-start {
  background-color: #0066ff !important;
}

.route-marker-end {
  background-color: #ff6600 !important;
}

/* Custom popup styling */
.route-marker-popup h3 {
  color: #0066ff;
  font-size: 16px;
}

/* Disable animations */
.route-marker {
  animation: none !important;
}
```

---

## TypeScript Types

```typescript
import { Trip, GPSPoint } from './utils/indexedDB';
import {
  RouteVisualizationOptions,
  ColorGradient
} from './utils/routeVisualizer';

// Type-safe options
const options: RouteVisualizationOptions = {
  gradient: {
    start: '#00ff00',
    end: '#ff0000',
    steps: 100
  },
  weight: 4,
  opacity: 0.8
};

// Type-safe trip
const trip: Trip = {
  id: '123',
  name: 'My Trip',
  startTime: Date.now(),
  endTime: Date.now() + 3600000,
  coordinates: [],
  isActive: false
};
```

---

## Testing

### Manual Test

```tsx
// Create test trip
const testTrip: Trip = {
  id: 'test-1',
  name: 'Test Route',
  startTime: Date.now(),
  endTime: Date.now() + 3600000,
  isActive: false,
  coordinates: [
    { latitude: 13.4, longitude: 121.2, timestamp: Date.now() },
    { latitude: 13.41, longitude: 121.21, timestamp: Date.now() + 1000 },
    { latitude: 13.42, longitude: 121.22, timestamp: Date.now() + 2000 }
  ]
};

<TripRouteVisualizer trip={testTrip} />
```

---

## Common Issues

### Route not visible

**Problem**: Trip has < 2 points  
**Solution**: Check `trip.coordinates.length >= 2`

### Markers not showing

**Problem**: Options disabled markers  
**Solution**: Set `showStartMarker: true, showEndMarker: true`

### Map not fitting bounds

**Problem**: `fitBounds` disabled  
**Solution**: Set `fitBounds: true` in options

### Performance slow

**Problem**: Too many points (>1000)  
**Solution**: Use `simplifyRoute()` utility

---

## Next Steps

1. **Test**: Load a trip and verify visualization
2. **Customize**: Adjust colors and styling
3. **Integrate**: Connect with your UI components
4. **Optimize**: Simplify large routes if needed
5. **Phase 4**: Prepare for replay animation

---

## Resources

- **Full Documentation**: `PHASE_3_ROUTE_VISUALIZATION.md`
- **API Reference**: `PHASE_3_API_DOCUMENTATION.md`
- **Quick Reference**: `PHASE_3_QUICK_REFERENCE.md`
- **Examples**: `frontend/src/examples/TripRouteVisualizerExample.tsx`

---

**Version**: 3.0.0  
**Date**: 2025-10-12  
**Status**: Production Ready
