# Phase 3 - Route Visualization API Documentation

Complete API reference for the Trip Route Visualization module.

**Version**: 3.0.0  
**Date**: 2025-10-12

---

## Table of Contents

1. [Components](#components)
2. [Utility Functions](#utility-functions)
3. [Type Definitions](#type-definitions)
4. [Constants](#constants)
5. [Hooks](#hooks)

---

## Components

### TripRouteVisualizer

Main component for visualizing a single trip route on a Leaflet map.

#### Props

```typescript
interface TripRouteVisualizerProps {
  trip: Trip;
  options?: RouteVisualizationOptions;
  onRouteClick?: (trip: Trip) => void;
  showPopup?: boolean;
  className?: string;
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `trip` | `Trip` | Yes | - | Trip data containing coordinates |
| `options` | `RouteVisualizationOptions` | No | `DEFAULT_ROUTE_OPTIONS` | Visualization configuration |
| `onRouteClick` | `(trip: Trip) => void` | No | `undefined` | Callback when route is clicked |
| `showPopup` | `boolean` | No | `true` | Show popups on start/end markers |
| `className` | `string` | No | `''` | Custom CSS class |

#### Usage

```tsx
<TripRouteVisualizer
  trip={myTrip}
  options={{
    gradient: { start: '#00ff00', end: '#ff0000' },
    weight: 4,
    showStartMarker: true
  }}
  onRouteClick={(trip) => console.log('Clicked:', trip.name)}
  showPopup={true}
/>
```

---

### MultiTripVisualizer

Component for visualizing multiple trips simultaneously with distinct colors.

#### Props

```typescript
interface MultiTripVisualizerProps {
  trips: Trip[];
  baseOptions?: RouteVisualizationOptions;
  useDistinctColors?: boolean;
  onRouteClick?: (trip: Trip) => void;
  showPopups?: boolean;
  fitAllTrips?: boolean;
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `trips` | `Trip[]` | Yes | - | Array of trips to visualize |
| `baseOptions` | `RouteVisualizationOptions` | No | `{}` | Base options for all trips |
| `useDistinctColors` | `boolean` | No | `true` | Use different colors per trip |
| `onRouteClick` | `(trip: Trip) => void` | No | `undefined` | Click handler |
| `showPopups` | `boolean` | No | `true` | Show marker popups |
| `fitAllTrips` | `boolean` | No | `false` | Fit bounds to all trips |

#### Usage

```tsx
<MultiTripVisualizer
  trips={[trip1, trip2, trip3]}
  useDistinctColors={true}
  fitAllTrips={true}
  onRouteClick={(trip) => console.log(trip.name)}
/>
```

---

## Utility Functions

### gpsPointsToLatLngs

Converts GPS points to Leaflet LatLng coordinate format.

```typescript
function gpsPointsToLatLngs(points: GPSPoint[]): [number, number][]
```

**Parameters:**
- `points`: Array of GPS points

**Returns:** Array of `[latitude, longitude]` tuples

**Example:**
```typescript
const coords = gpsPointsToLatLngs(trip.coordinates);
// [[13.4, 121.2], [13.41, 121.21], ...]
```

---

### calculateBounds

Calculates the bounding box for a set of GPS points.

```typescript
function calculateBounds(points: GPSPoint[]): L.LatLngBounds | null
```

**Parameters:**
- `points`: Array of GPS points

**Returns:** Leaflet LatLngBounds object or null if no points

**Example:**
```typescript
const bounds = calculateBounds(trip.coordinates);
if (bounds) {
  map.fitBounds(bounds);
}
```

---

### interpolateColor

Interpolates between two hex colors.

```typescript
function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string
```

**Parameters:**
- `color1`: Start color (hex format, e.g., '#00ff00')
- `color2`: End color (hex format)
- `factor`: Interpolation factor (0-1)

**Returns:** Interpolated color in hex format

**Example:**
```typescript
const midColor = interpolateColor('#00ff00', '#ff0000', 0.5);
// Returns: '#7f7f00' (yellow-ish)
```

---

### generateColorGradient

Generates an array of interpolated colors.

```typescript
function generateColorGradient(gradient: ColorGradient): string[]
```

**Parameters:**
- `gradient`: Color gradient configuration

**Returns:** Array of color strings

**Example:**
```typescript
const colors = generateColorGradient({
  start: '#00ff00',
  end: '#ff0000',
  steps: 10
});
// ['#00ff00', '#19e600', '#33cc00', ..., '#ff0000']
```

---

### splitIntoSegments

Splits GPS points into segments for gradient coloring.

```typescript
function splitIntoSegments(
  points: GPSPoint[],
  segments: number
): GPSPoint[][]
```

**Parameters:**
- `points`: Array of GPS points
- `segments`: Number of segments to create

**Returns:** Array of point segments

**Example:**
```typescript
const segments = splitIntoSegments(trip.coordinates, 100);
// [[point1, point2], [point2, point3], ...]
```

---

### createGradientSegments

Creates route segments with corresponding colors for gradient visualization.

```typescript
function createGradientSegments(
  points: GPSPoint[],
  gradient?: ColorGradient
): Array<{ coordinates: [number, number][]; color: string }>
```

**Parameters:**
- `points`: Array of GPS points
- `gradient`: Optional color gradient (uses default if not provided)

**Returns:** Array of segment objects with coordinates and color

**Example:**
```typescript
const segments = createGradientSegments(trip.coordinates, {
  start: '#0066ff',
  end: '#ff6600',
  steps: 50
});

segments.forEach(segment => {
  console.log(segment.color); // '#0066ff', '#0d69fc', ...
  console.log(segment.coordinates); // [[lat, lng], ...]
});
```

---

### createRouteMarkerIcon

Creates a custom Leaflet DivIcon for start/end markers.

```typescript
function createRouteMarkerIcon(
  type: 'start' | 'end',
  size?: number
): L.DivIcon
```

**Parameters:**
- `type`: Marker type ('start' or 'end')
- `size`: Icon size in pixels (default: 40)

**Returns:** Leaflet DivIcon

**Example:**
```typescript
const startIcon = createRouteMarkerIcon('start', 50);
const endIcon = createRouteMarkerIcon('end', 50);

<Marker position={[lat, lng]} icon={startIcon} />
```

---

### simplifyRoute

Simplifies route coordinates using Douglas-Peucker algorithm.

```typescript
function simplifyRoute(
  points: GPSPoint[],
  tolerance?: number
): GPSPoint[]
```

**Parameters:**
- `points`: Array of GPS points
- `tolerance`: Simplification tolerance (default: 0.0001)

**Returns:** Simplified array of GPS points

**Example:**
```typescript
// Original: 2000 points
const simplified = simplifyRoute(trip.coordinates, 0.0001);
// Simplified: ~500 points (maintains route shape)
```

**Tolerance Guide:**
- `0.00001`: Very high detail (minimal simplification)
- `0.0001`: High detail (recommended)
- `0.001`: Medium detail
- `0.01`: Low detail (aggressive simplification)

---

### calculateRouteStats

Calculates statistics for a route.

```typescript
function calculateRouteStats(points: GPSPoint[]): {
  totalPoints: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  bounds: L.LatLngBounds | null;
}
```

**Parameters:**
- `points`: Array of GPS points

**Returns:** Route statistics object

**Example:**
```typescript
const stats = calculateRouteStats(trip.coordinates);

console.log('Points:', stats.totalPoints);
console.log('Duration:', stats.duration / 1000, 'seconds');
console.log('Start:', stats.startTime.toLocaleString());
console.log('End:', stats.endTime.toLocaleString());
```

---

### validateRoutePoints

Validates GPS points for route visualization.

```typescript
function validateRoutePoints(points: GPSPoint[]): {
  valid: boolean;
  errors: string[];
}
```

**Parameters:**
- `points`: Array of GPS points

**Returns:** Validation result with errors if any

**Example:**
```typescript
const validation = validateRoutePoints(trip.coordinates);

if (!validation.valid) {
  console.error('Validation failed:');
  validation.errors.forEach(error => console.error('- ', error));
  return;
}

// Proceed with visualization
```

**Validation Checks:**
- Points array is not empty
- At least 2 points present
- Valid latitude (-90 to 90)
- Valid longitude (-180 to 180)
- Coordinates are numbers

---

## Type Definitions

### RouteVisualizationOptions

```typescript
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

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `gradient` | `ColorGradient` | `{start: '#00ff00', end: '#ff0000', steps: 100}` | Color gradient config |
| `weight` | `number` | `4` | Line thickness in pixels |
| `opacity` | `number` | `0.8` | Line opacity (0-1) |
| `smoothFactor` | `number` | `1.5` | Polyline smoothing factor |
| `showStartMarker` | `boolean` | `true` | Show start marker |
| `showEndMarker` | `boolean` | `true` | Show end marker |
| `fitBounds` | `boolean` | `true` | Auto-fit map bounds |
| `fitBoundsPadding` | `[number, number]` | `[50, 50]` | Padding in pixels |

---

### ColorGradient

```typescript
interface ColorGradient {
  start: string;
  end: string;
  steps?: number;
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `start` | `string` | - | Start color (hex format) |
| `end` | `string` | - | End color (hex format) |
| `steps` | `number` | `100` | Number of gradient steps |

---

### GPSPoint

```typescript
interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}
```

---

### Trip

```typescript
interface Trip {
  id: string;
  name: string;
  startTime: number;
  endTime: number | null;
  coordinates: GPSPoint[];
  isActive: boolean;
}
```

---

## Constants

### DEFAULT_ROUTE_OPTIONS

Default visualization options applied when none specified.

```typescript
const DEFAULT_ROUTE_OPTIONS: Required<RouteVisualizationOptions> = {
  gradient: {
    start: '#00ff00',
    end: '#ff0000',
    steps: 100
  },
  weight: 4,
  opacity: 0.8,
  smoothFactor: 1.5,
  showStartMarker: true,
  showEndMarker: true,
  fitBounds: true,
  fitBoundsPadding: [50, 50]
};
```

---

### COLOR_GRADIENTS

Preset color gradients for common use cases.

```typescript
const COLOR_GRADIENTS = {
  DEFAULT: {
    start: '#00ff00',
    end: '#ff0000',
    steps: 100
  },
  BLUE_ORANGE: {
    start: '#0066ff',
    end: '#ff6600',
    steps: 100
  },
  PURPLE_YELLOW: {
    start: '#9900ff',
    end: '#ffff00',
    steps: 100
  },
  CYAN_MAGENTA: {
    start: '#00ffff',
    end: '#ff00ff',
    steps: 100
  },
  BLUE_GRADIENT: {
    start: '#003366',
    end: '#66ccff',
    steps: 100
  },
  BLUE_SOLID: {
    start: '#0066ff',
    end: '#0066ff',
    steps: 1
  }
};
```

**Usage:**
```typescript
import { COLOR_GRADIENTS } from './utils/routeVisualizer';

<TripRouteVisualizer
  trip={trip}
  options={{ gradient: COLOR_GRADIENTS.BLUE_ORANGE }}
/>
```

---

## Hooks

### useFitBounds

Internal hook for auto-fitting map bounds to route.

```typescript
function useFitBounds(
  coordinates: GPSPoint[],
  enabled: boolean,
  padding: [number, number]
): void
```

**Parameters:**
- `coordinates`: GPS points to fit
- `enabled`: Whether to fit bounds
- `padding`: Padding in pixels

**Behavior:**
- Fits bounds only once per coordinate set
- Resets when coordinates change
- Animates transition
- Max zoom level: 16

**Note:** This is an internal hook used by TripRouteVisualizer. Not exported for external use.

---

## Error Handling

### Common Errors

#### Invalid Route Points

```typescript
// Error: No GPS points provided
const validation = validateRoutePoints([]);
// { valid: false, errors: ['No GPS points provided'] }

// Error: Insufficient points
const validation = validateRoutePoints([point1]);
// { valid: false, errors: ['At least 2 GPS points required'] }

// Error: Invalid coordinates
const badPoint = { latitude: 100, longitude: 200, timestamp: Date.now() };
const validation = validateRoutePoints([badPoint, point2]);
// { valid: false, errors: ['Invalid latitude at point 0: 100'] }
```

#### Null Bounds

```typescript
const bounds = calculateBounds([]);
// Returns: null

if (!bounds) {
  console.error('Cannot calculate bounds for empty route');
}
```

---

## Performance Considerations

### Large Routes

For routes with >1000 points, consider simplification:

```typescript
let coordinates = trip.coordinates;

if (coordinates.length > 1000) {
  coordinates = simplifyRoute(coordinates, 0.0001);
  console.log(`Simplified from ${trip.coordinates.length} to ${coordinates.length} points`);
}

<TripRouteVisualizer trip={{ ...trip, coordinates }} />
```

### Gradient Steps

Reduce gradient steps for better performance:

```typescript
const steps = Math.min(100, Math.max(10, trip.coordinates.length / 10));

<TripRouteVisualizer
  trip={trip}
  options={{
    gradient: { ...COLOR_GRADIENTS.DEFAULT, steps }
  }}
/>
```

### Multiple Trips

Limit number of simultaneous trips:

```typescript
const maxTrips = 5;
const visibleTrips = trips.slice(0, maxTrips);

<MultiTripVisualizer trips={visibleTrips} />
```

---

## Browser Compatibility

All functions and components are compatible with:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS 14+, Android Chrome)

---

## TypeScript Support

Full TypeScript support with strict type checking:

```typescript
import {
  TripRouteVisualizer,
  RouteVisualizationOptions,
  ColorGradient
} from './components/TripRouteVisualizer';

const options: RouteVisualizationOptions = {
  gradient: {
    start: '#00ff00',
    end: '#ff0000',
    steps: 100
  },
  weight: 4
};

// Type-safe usage
<TripRouteVisualizer trip={trip} options={options} />
```

---

## Examples

See `frontend/src/examples/TripRouteVisualizerExample.tsx` for complete working examples:

1. Single Trip Visualization
2. Custom Color Gradient
3. Multiple Trips Comparison
4. Interactive Trip Selector
5. Clickable Route with Handler
6. Minimal Route (No Markers)

---

**API Version**: 3.0.0  
**Last Updated**: 2025-10-12  
**Status**: Stable
