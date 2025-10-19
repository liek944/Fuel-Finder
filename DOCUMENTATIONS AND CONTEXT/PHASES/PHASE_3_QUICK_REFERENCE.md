# Phase 3 - Route Visualization Quick Reference

## Installation

No additional dependencies required. Uses existing Leaflet and React setup.

---

## Basic Usage

### 1. Import Components

```typescript
import TripRouteVisualizer from './components/TripRouteVisualizer';
import MultiTripVisualizer from './components/MultiTripVisualizer';
import { COLOR_GRADIENTS } from './utils/routeVisualizer';
import './styles/TripRouteVisualizer.css';
```

### 2. Single Trip

```tsx
<MapContainer center={[13.4, 121.2]} zoom={10}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <TripRouteVisualizer trip={myTrip} />
</MapContainer>
```

### 3. Multiple Trips

```tsx
<MapContainer center={[13.4, 121.2]} zoom={10}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <MultiTripVisualizer trips={[trip1, trip2, trip3]} />
</MapContainer>
```

---

## Common Options

### Default Configuration

```typescript
{
  gradient: { start: '#00ff00', end: '#ff0000', steps: 100 },
  weight: 4,
  opacity: 0.8,
  smoothFactor: 1.5,
  showStartMarker: true,
  showEndMarker: true,
  fitBounds: true,
  fitBoundsPadding: [50, 50]
}
```

### Custom Colors

```tsx
<TripRouteVisualizer
  trip={trip}
  options={{
    gradient: COLOR_GRADIENTS.BLUE_ORANGE
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

---

## Preset Gradients

```typescript
COLOR_GRADIENTS.DEFAULT        // Green → Red
COLOR_GRADIENTS.BLUE_ORANGE    // Blue → Orange
COLOR_GRADIENTS.PURPLE_YELLOW  // Purple → Yellow
COLOR_GRADIENTS.CYAN_MAGENTA   // Cyan → Magenta
COLOR_GRADIENTS.BLUE_GRADIENT  // Dark Blue → Light Blue
COLOR_GRADIENTS.BLUE_SOLID     // Solid Blue (no gradient)
```

---

## Event Handlers

### Click Handler

```tsx
const handleClick = (trip: Trip) => {
  console.log('Clicked:', trip.name);
};

<TripRouteVisualizer
  trip={trip}
  onRouteClick={handleClick}
/>
```

---

## Utility Functions

### Load and Display Trip

```typescript
import { tripSessionManager } from './utils/tripSessionManager';

// Load trip
const trip = await tripSessionManager.getTrip(tripId);

// Validate
const validation = validateRoutePoints(trip.coordinates);
if (!validation.valid) {
  console.error('Invalid trip:', validation.errors);
  return;
}

// Display
<TripRouteVisualizer trip={trip} />
```

### Simplify Large Routes

```typescript
import { simplifyRoute } from './utils/routeVisualizer';

if (trip.coordinates.length > 1000) {
  trip.coordinates = simplifyRoute(trip.coordinates, 0.0001);
}
```

### Calculate Statistics

```typescript
import { calculateRouteStats } from './utils/routeVisualizer';

const stats = calculateRouteStats(trip.coordinates);
console.log('Duration:', stats.duration);
console.log('Points:', stats.totalPoints);
```

---

## Complete Example

```tsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import TripRouteVisualizer from './components/TripRouteVisualizer';
import { tripSessionManager } from './utils/tripSessionManager';
import { Trip } from './utils/indexedDB';
import './styles/TripRouteVisualizer.css';

function TripViewer() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrip();
  }, []);

  const loadTrip = async () => {
    try {
      const trips = await tripSessionManager.getAllTrips();
      if (trips.length > 0) {
        setTrip(trips[0]);
      }
    } catch (error) {
      console.error('Failed to load trip:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!trip) return <div>No trips found</div>;

  return (
    <MapContainer
      center={[13.4, 121.2]}
      zoom={10}
      style={{ height: '600px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <TripRouteVisualizer
        trip={trip}
        options={{
          gradient: { start: '#00ff00', end: '#ff0000' },
          showStartMarker: true,
          showEndMarker: true,
          fitBounds: true
        }}
        showPopup={true}
      />
    </MapContainer>
  );
}

export default TripViewer;
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Route not visible | Check trip has ≥2 points |
| Markers missing | Set `showStartMarker: true` |
| No gradient | Increase `gradient.steps` |
| Slow rendering | Use `simplifyRoute()` |
| Map not fitting | Enable `fitBounds: true` |

---

## Performance Tips

1. **Simplify large routes**: Use `simplifyRoute()` for >1000 points
2. **Reduce gradient steps**: Use 50 steps instead of 100 for faster render
3. **Disable markers**: For overview maps, hide markers
4. **Lazy load**: Only render visible trips

---

## TypeScript Types

```typescript
interface Trip {
  id: string;
  name: string;
  startTime: number;
  endTime: number | null;
  coordinates: GPSPoint[];
  isActive: boolean;
}

interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

interface RouteVisualizationOptions {
  gradient?: ColorGradient;
  weight?: number;
  opacity?: number;
  smoothFactor?: number;
  showStartMarker?: boolean;
  showEndMarker?: boolean;
  fitBounds?: boolean;
  fitBoundsPadding?: [number, number];
}
```

---

## Files Reference

- **Component**: `frontend/src/components/TripRouteVisualizer.tsx`
- **Multi-Trip**: `frontend/src/components/MultiTripVisualizer.tsx`
- **Utilities**: `frontend/src/utils/routeVisualizer.ts`
- **Styles**: `frontend/src/styles/TripRouteVisualizer.css`
- **Examples**: `frontend/src/examples/TripRouteVisualizerExample.tsx`

---

**Version**: 3.0.0  
**Date**: 2025-10-12  
**Status**: Production Ready
