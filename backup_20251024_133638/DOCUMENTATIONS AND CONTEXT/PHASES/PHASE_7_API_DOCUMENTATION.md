# Phase 7 - API Documentation

## Optimization & Polish API Reference

**Version**: 7.0.0  
**Date**: October 12, 2025  
**Phase**: Optimization & Polish

---

## Table of Contents

1. [Geometry Optimizer API](#geometry-optimizer-api)
2. [Performance Utils API](#performance-utils-api)
3. [TripReplayOverlay API](#tripreplayoverlay-api)
4. [Enhanced TripReplayVisualizer API](#enhanced-tripreplayvisualizer-api)

---

## Geometry Optimizer API

### `simplifyCoordinates()`

Simplify GPS coordinates using Turf.js Douglas-Peucker algorithm.

**Signature:**
```typescript
function simplifyCoordinates(
  coordinates: GPSPoint[],
  config?: Partial<SimplificationConfig>
): SimplificationResult
```

**Parameters:**
- `coordinates` - Array of GPS points to simplify
- `config` - Optional simplification configuration

**Returns:** `SimplificationResult`
```typescript
interface SimplificationResult {
  simplified: GPSPoint[];
  originalCount: number;
  simplifiedCount: number;
  reductionPercent: number;
  processingTime: number;
}
```

**Example:**
```typescript
const result = simplifyCoordinates(trip.coordinates, {
  tolerance: 0.002,
  highQuality: true,
  minPoints: 10,
  maxPoints: 500
});

console.log(`Reduced from ${result.originalCount} to ${result.simplifiedCount}`);
console.log(`${result.reductionPercent.toFixed(1)}% reduction`);
```

---

### `autoSimplifyCoordinates()`

Automatically simplify coordinates with adaptive tolerance.

**Signature:**
```typescript
function autoSimplifyCoordinates(
  coordinates: GPSPoint[]
): SimplificationResult
```

**Parameters:**
- `coordinates` - Array of GPS points to simplify

**Returns:** `SimplificationResult`

**Example:**
```typescript
const result = autoSimplifyCoordinates(trip.coordinates);
// Automatically determines optimal simplification
```

---

### `calculateAdaptiveTolerance()`

Calculate optimal tolerance based on trip characteristics.

**Signature:**
```typescript
function calculateAdaptiveTolerance(
  coordinates: GPSPoint[],
  targetPoints?: number
): number
```

**Parameters:**
- `coordinates` - GPS points to analyze
- `targetPoints` - Optional target point count

**Returns:** Tolerance value in kilometers

**Example:**
```typescript
const tolerance = calculateAdaptiveTolerance(trip.coordinates);
// Returns 0.001 for medium trips, 0.005 for very long trips
```

---

### `calculateDistancePreservation()`

Calculate how well simplification preserves route distance.

**Signature:**
```typescript
function calculateDistancePreservation(
  original: GPSPoint[],
  simplified: GPSPoint[]
): {
  originalDistance: number;
  simplifiedDistance: number;
  preservationPercent: number;
}
```

**Parameters:**
- `original` - Original GPS points
- `simplified` - Simplified GPS points

**Returns:** Distance preservation metrics

**Example:**
```typescript
const metrics = calculateDistancePreservation(
  trip.coordinates,
  result.simplified
);

console.log(`Preserved ${metrics.preservationPercent.toFixed(1)}% of distance`);
```

---

### `batchSimplifyTrips()`

Simplify multiple trips in batch.

**Signature:**
```typescript
function batchSimplifyTrips(
  trips: { id: string; coordinates: GPSPoint[] }[],
  config?: Partial<SimplificationConfig>
): Map<string, SimplificationResult>
```

**Parameters:**
- `trips` - Array of trips with IDs and coordinates
- `config` - Optional simplification configuration

**Returns:** Map of trip IDs to simplification results

**Example:**
```typescript
const results = batchSimplifyTrips(allTrips, {
  tolerance: 0.002,
  maxPoints: 500
});

results.forEach((result, tripId) => {
  console.log(`Trip ${tripId}: ${result.reductionPercent}% reduction`);
});
```

---

### `getSimplificationRecommendation()`

Get simplification recommendation based on trip size.

**Signature:**
```typescript
function getSimplificationRecommendation(
  coordinates: GPSPoint[]
): {
  shouldSimplify: boolean;
  recommendedTolerance: number;
  estimatedReduction: number;
  reason: string;
}
```

**Parameters:**
- `coordinates` - GPS points to analyze

**Returns:** Simplification recommendation

**Example:**
```typescript
const recommendation = getSimplificationRecommendation(trip.coordinates);

if (recommendation.shouldSimplify) {
  console.log(recommendation.reason);
  console.log(`Recommended tolerance: ${recommendation.recommendedTolerance}`);
}
```

---

### Configuration Interfaces

#### `SimplificationConfig`

```typescript
interface SimplificationConfig {
  tolerance: number;        // Tolerance in kilometers
  highQuality: boolean;     // Preserve topology
  minPoints: number;        // Minimum points to keep
  maxPoints: number;        // Maximum points allowed
}
```

**Default Configuration:**
```typescript
const DEFAULT_SIMPLIFICATION_CONFIG: SimplificationConfig = {
  tolerance: 0.001,    // ~1 meter
  highQuality: true,
  minPoints: 10,
  maxPoints: 1000
};
```

---

## Performance Utils API

### `throttle()`

Throttle function execution to maximum rate.

**Signature:**
```typescript
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void
```

**Parameters:**
- `func` - Function to throttle
- `limit` - Minimum milliseconds between calls

**Returns:** Throttled function

**Example:**
```typescript
const throttledUpdate = throttle((position) => {
  map.panTo(position);
}, 100); // Max once per 100ms

// Call as often as needed, executes at most every 100ms
throttledUpdate(newPosition);
```

---

### `debounce()`

Debounce function execution.

**Signature:**
```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void
```

**Parameters:**
- `func` - Function to debounce
- `delay` - Delay in milliseconds

**Returns:** Debounced function

**Example:**
```typescript
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);

// Only executes after 300ms of no calls
debouncedSearch('fuel');
```

---

### `rafThrottle()`

Throttle to one call per animation frame.

**Signature:**
```typescript
function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void
```

**Parameters:**
- `func` - Function to throttle

**Returns:** RAF-throttled function

**Example:**
```typescript
const rafUpdate = rafThrottle((position) => {
  updateMarker(position);
});

// Executes at most once per frame (~60 FPS)
rafUpdate(newPosition);
```

---

### `adaptiveThrottle()`

Adaptive throttle based on performance.

**Signature:**
```typescript
function adaptiveThrottle<T extends (...args: any[]) => any>(
  func: T,
  targetFPS?: number
): (...args: Parameters<T>) => void
```

**Parameters:**
- `func` - Function to throttle
- `targetFPS` - Target frames per second (default: 60)

**Returns:** Adaptive throttled function

**Example:**
```typescript
const adaptiveUpdate = adaptiveThrottle((position) => {
  map.panTo(position);
}, 60);

// Automatically adjusts throttle based on performance
adaptiveUpdate(newPosition);
```

---

### `PerformanceMonitor`

Monitor animation performance.

**Class:**
```typescript
class PerformanceMonitor {
  recordFrame(): void
  getFPS(): number
  getAverageFrameTime(): number
  isPerformanceGood(): boolean
  reset(): void
}
```

**Example:**
```typescript
const monitor = new PerformanceMonitor();

// In animation loop
function animate() {
  monitor.recordFrame();
  
  // Your animation code
  
  if (!monitor.isPerformanceGood()) {
    console.warn(`Low FPS: ${monitor.getFPS()}`);
  }
}
```

**Methods:**

#### `recordFrame()`
Record a frame for performance tracking.

#### `getFPS()`
Get current frames per second.
- Returns: `number` - Current FPS

#### `getAverageFrameTime()`
Get average frame time in milliseconds.
- Returns: `number` - Average frame time

#### `isPerformanceGood()`
Check if performance is acceptable (>= 50 FPS).
- Returns: `boolean` - True if performance is good

#### `reset()`
Reset performance monitoring.

---

### Utility Functions

#### `measurePerformance()`

Measure function execution time.

**Signature:**
```typescript
function measurePerformance<T extends (...args: any[]) => any>(
  func: T,
  label?: string
): (...args: Parameters<T>) => ReturnType<T>
```

**Example:**
```typescript
const measured = measurePerformance(
  simplifyCoordinates,
  'Simplification'
);

const result = measured(coordinates, config);
// Logs: [Performance] Simplification: 45.23ms
```

---

#### `getOptimalUpdateInterval()`

Get optimal update interval based on device.

**Signature:**
```typescript
function getOptimalUpdateInterval(): number
```

**Returns:** Optimal interval in milliseconds

**Example:**
```typescript
const interval = getOptimalUpdateInterval();
// Returns 16ms for desktop, 50ms for mobile
```

---

#### `supportsHardwareAcceleration()`

Check if browser supports hardware acceleration.

**Signature:**
```typescript
function supportsHardwareAcceleration(): boolean
```

**Returns:** True if WebGL is available

**Example:**
```typescript
if (supportsHardwareAcceleration()) {
  enableAdvancedGraphics();
}
```

---

## TripReplayOverlay API

### Component Props

```typescript
interface TripReplayOverlayProps {
  trip: Trip;
  position: AnimationPosition | null;
  showTitle?: boolean;
  showSpeed?: boolean;
  showTimestamp?: boolean;
  showProgress?: boolean;
  showDistance?: boolean;
  className?: string;
  position_style?: 'top-left' | 'top-right' | 'bottom-left' | 
                   'bottom-right' | 'top-center';
}
```

### Props Reference

#### `trip` (required)
- Type: `Trip`
- Description: Trip data to display

#### `position` (required)
- Type: `AnimationPosition | null`
- Description: Current animation position

#### `showTitle`
- Type: `boolean`
- Default: `true`
- Description: Show trip title and date

#### `showSpeed`
- Type: `boolean`
- Default: `true`
- Description: Show current speed indicator

#### `showTimestamp`
- Type: `boolean`
- Default: `true`
- Description: Show current timestamp

#### `showProgress`
- Type: `boolean`
- Default: `true`
- Description: Show progress percentage

#### `showDistance`
- Type: `boolean`
- Default: `false`
- Description: Show distance traveled

#### `className`
- Type: `string`
- Default: `''`
- Description: Custom CSS class

#### `position_style`
- Type: `'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center'`
- Default: `'top-left'`
- Description: Overlay position on map

---

### Usage Examples

#### Basic Overlay

```typescript
<TripReplayOverlay
  trip={myTrip}
  position={currentPosition}
/>
```

#### Custom Position

```typescript
<TripReplayOverlay
  trip={myTrip}
  position={currentPosition}
  position_style="top-right"
/>
```

#### Minimal Overlay

```typescript
<TripReplayOverlay
  trip={myTrip}
  position={currentPosition}
  showTitle={false}
  showDistance={false}
  showProgress={false}
/>
```

#### Full Featured

```typescript
<TripReplayOverlay
  trip={myTrip}
  position={currentPosition}
  showTitle={true}
  showSpeed={true}
  showTimestamp={true}
  showProgress={true}
  showDistance={true}
  position_style="bottom-right"
  className="compact"
/>
```

---

## Enhanced TripReplayVisualizer API

### New Phase 7 Props

```typescript
interface TripReplayVisualizerProps {
  // ... existing Phase 6 props ...
  
  // Phase 7 additions
  enableSimplification?: boolean;
  simplificationConfig?: Partial<SimplificationConfig>;
  showOverlay?: boolean;
  overlayPosition?: 'top-left' | 'top-right' | 'bottom-left' | 
                    'bottom-right' | 'top-center';
  throttleMapUpdates?: boolean;
}
```

### Phase 7 Props Reference

#### `enableSimplification`
- Type: `boolean`
- Default: `true`
- Description: Enable geometry simplification for performance

#### `simplificationConfig`
- Type: `Partial<SimplificationConfig>`
- Default: Auto-calculated
- Description: Custom simplification configuration

#### `showOverlay`
- Type: `boolean`
- Default: `true`
- Description: Show real-time information overlay

#### `overlayPosition`
- Type: `'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center'`
- Default: `'top-left'`
- Description: Position of information overlay

#### `throttleMapUpdates`
- Type: `boolean`
- Default: `true`
- Description: Throttle map pan updates for performance

---

### Usage Examples

#### Basic Optimized Replay

```typescript
<TripReplayVisualizer
  trip={myTrip}
  enableSimplification={true}
  throttleMapUpdates={true}
  showOverlay={true}
/>
```

#### Custom Simplification

```typescript
<TripReplayVisualizer
  trip={myTrip}
  enableSimplification={true}
  simplificationConfig={{
    tolerance: 0.002,
    highQuality: true,
    minPoints: 50,
    maxPoints: 500
  }}
  showOverlay={true}
  overlayPosition="top-right"
/>
```

#### Performance-First Mode

```typescript
<TripReplayVisualizer
  trip={myTrip}
  enableSimplification={true}
  simplificationConfig={{
    tolerance: 0.005,
    maxPoints: 300
  }}
  throttleMapUpdates={true}
  showOverlay={true}
  showSummary={false}
  animationConfig={{
    speed: 3,
    interpolate: false,
    minFrameInterval: 33
  }}
/>
```

#### Full Featured with All Phases

```typescript
<TripReplayVisualizer
  trip={myTrip}
  // Phase 4: Animation
  animationConfig={{
    speed: 2,
    interpolate: true,
    loop: false
  }}
  // Phase 5: Controls
  showControls={true}
  autoFollow={true}
  // Phase 6: Analytics
  showSummary={true}
  showDetailedMetrics={true}
  allowConfigEdit={true}
  fuelConfig={{
    pricePerLiter: 65,
    fuelEfficiency: 12,
    currency: '₱'
  }}
  // Phase 7: Optimization
  enableSimplification={true}
  throttleMapUpdates={true}
  showOverlay={true}
  overlayPosition="top-left"
  // Callbacks
  onStateChange={(state) => console.log('State:', state)}
  onPositionUpdate={(pos) => console.log('Position:', pos)}
/>
```

---

## Type Definitions

### Core Types

```typescript
// GPS Point
interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

// Trip
interface Trip {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  coordinates: GPSPoint[];
  distance?: number;
  duration?: number;
}

// Animation Position
interface AnimationPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  progress: number;
  segmentIndex: number;
  heading?: number;
  speed?: number;
}

// Animation State
type AnimationState = 'idle' | 'playing' | 'paused' | 'completed';
```

---

## Performance Recommendations

### Simplification Guidelines

| Trip Size | Recommended Tolerance | Expected Reduction |
|-----------|----------------------|-------------------|
| < 100 pts | No simplification | 0% |
| 100-500 pts | 0.001 km (1m) | 20% |
| 500-2000 pts | 0.002 km (2m) | 40% |
| > 2000 pts | 0.005 km (5m) | 60% |

### Throttling Guidelines

| Device Type | Recommended Interval | Target FPS |
|-------------|---------------------|------------|
| High-end Desktop | 16ms | 60 |
| Mid-range Desktop | 16ms | 60 |
| High-end Mobile | 33ms | 30 |
| Mid-range Mobile | 50ms | 20 |
| Low-end Mobile | 100ms | 10 |

---

## Error Handling

### Simplification Errors

```typescript
try {
  const result = simplifyCoordinates(coordinates, config);
} catch (error) {
  console.error('Simplification failed:', error);
  // Falls back to uniform sampling
}
```

### Performance Monitoring

```typescript
const monitor = new PerformanceMonitor();

if (!monitor.isPerformanceGood()) {
  // Reduce quality or increase throttling
  setThrottleInterval(100);
}
```

---

## Best Practices

### 1. Always Enable Simplification for Long Trips

```typescript
const shouldSimplify = trip.coordinates.length > 100;

<TripReplayVisualizer
  trip={trip}
  enableSimplification={shouldSimplify}
/>
```

### 2. Use Adaptive Simplification

```typescript
// Let the system decide optimal settings
<TripReplayVisualizer
  trip={trip}
  enableSimplification={true}
  // No simplificationConfig = auto-adaptive
/>
```

### 3. Monitor Performance in Development

```typescript
{process.env.NODE_ENV === 'development' && (
  <PerformanceDisplay monitor={performanceMonitor} />
)}
```

### 4. Adjust for Device Capabilities

```typescript
const isMobile = /Mobile/.test(navigator.userAgent);

<TripReplayVisualizer
  trip={trip}
  enableSimplification={true}
  simplificationConfig={{
    maxPoints: isMobile ? 300 : 1000
  }}
  throttleMapUpdates={isMobile}
/>
```

---

## Migration from Phase 6

### Before (Phase 6)

```typescript
<TripReplayVisualizer
  trip={myTrip}
  showControls={true}
  showSummary={true}
/>
```

### After (Phase 7)

```typescript
<TripReplayVisualizer
  trip={myTrip}
  showControls={true}
  showSummary={true}
  // Add Phase 7 optimizations
  enableSimplification={true}
  throttleMapUpdates={true}
  showOverlay={true}
/>
```

**All Phase 6 props remain compatible!**

---

## Troubleshooting

### Issue: Simplification too aggressive

**Solution:**
```typescript
<TripReplayVisualizer
  simplificationConfig={{
    tolerance: 0.0005,  // Reduce tolerance
    minPoints: 100      // Increase minimum
  }}
/>
```

### Issue: Animation stuttering

**Solution:**
```typescript
<TripReplayVisualizer
  throttleMapUpdates={true}
  animationConfig={{
    minFrameInterval: 33  // Reduce to 30 FPS
  }}
/>
```

### Issue: Overlay overlapping controls

**Solution:**
```typescript
<TripReplayVisualizer
  overlayPosition="top-right"  // Move overlay
/>
```

---

**API Documentation Version**: 7.0.0  
**Last Updated**: October 12, 2025  
**Status**: Complete
