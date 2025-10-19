# Phase 4 - API Documentation

## Complete API Reference for Trip Replay Animation

**Version**: 4.0.0  
**Date**: October 12, 2025  
**Status**: Production Ready

---

## Table of Contents

1. [TripReplayAnimator Class](#tripreplayanimator-class)
2. [TripReplayController Component](#tripreplaycontroller-component)
3. [TripReplayVisualizer Component](#tripreplayvisualizer-component)
4. [Type Definitions](#type-definitions)
5. [Utility Functions](#utility-functions)

---

## TripReplayAnimator Class

Core animation engine for trip replay.

### Constructor

```typescript
constructor(coordinates: GPSPoint[], config?: Partial<AnimationConfig>)
```

**Parameters:**
- `coordinates`: Array of GPS points to animate
- `config`: Optional animation configuration

**Example:**
```typescript
const animator = new TripReplayAnimator(trip.coordinates, {
  speed: 2,
  interpolate: true,
  interpolationSteps: 10
});
```

### Methods

#### play()

Start or resume animation.

```typescript
play(): void
```

**Example:**
```typescript
animator.play();
```

---

#### pause()

Pause animation at current position.

```typescript
pause(): void
```

**Example:**
```typescript
animator.pause();
```

---

#### stop()

Stop animation and reset to beginning.

```typescript
stop(): void
```

**Example:**
```typescript
animator.stop();
```

---

#### restart()

Restart animation from beginning.

```typescript
restart(): void
```

**Example:**
```typescript
animator.restart();
```

---

#### seek()

Jump to specific position in animation.

```typescript
seek(progress: number): void
```

**Parameters:**
- `progress`: Position to seek to (0-1)

**Example:**
```typescript
animator.seek(0.5); // Jump to 50%
```

---

#### setSpeed()

Change playback speed.

```typescript
setSpeed(speed: PlaybackSpeed): void
```

**Parameters:**
- `speed`: Playback speed multiplier (1, 1.5, 2, 3, or 4)

**Example:**
```typescript
animator.setSpeed(2); // 2x speed
```

---

#### getSpeed()

Get current playback speed.

```typescript
getSpeed(): PlaybackSpeed
```

**Returns:** Current speed multiplier

**Example:**
```typescript
const speed = animator.getSpeed(); // 1 | 1.5 | 2 | 3 | 4
```

---

#### getState()

Get current animation state.

```typescript
getState(): AnimationState
```

**Returns:** Current state ('idle' | 'playing' | 'paused' | 'completed')

**Example:**
```typescript
const state = animator.getState();
if (state === 'playing') {
  console.log('Animation is running');
}
```

---

#### getCurrentProgress()

Get current animation progress.

```typescript
getCurrentProgress(): number
```

**Returns:** Progress value (0-1)

**Example:**
```typescript
const progress = animator.getCurrentProgress();
console.log(`${(progress * 100).toFixed(1)}% complete`);
```

---

#### getCurrentAnimationPosition()

Get current position data.

```typescript
getCurrentAnimationPosition(): AnimationPosition | null
```

**Returns:** Current position object or null

**Example:**
```typescript
const position = animator.getCurrentAnimationPosition();
if (position) {
  console.log(`Lat: ${position.latitude}, Lng: ${position.longitude}`);
  console.log(`Heading: ${position.heading}°`);
}
```

---

#### subscribe()

Subscribe to animation updates.

```typescript
subscribe(listener: AnimationListener): () => void
```

**Parameters:**
- `listener`: Callback function receiving position and state updates

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = animator.subscribe((position, state) => {
  console.log('Progress:', position.progress);
  console.log('State:', state);
});

// Later...
unsubscribe();
```

---

#### updateConfig()

Update animation configuration.

```typescript
updateConfig(config: Partial<AnimationConfig>): void
```

**Parameters:**
- `config`: Configuration options to update

**Example:**
```typescript
animator.updateConfig({
  interpolationSteps: 20,
  loop: true
});
```

---

#### getTotalDuration()

Get total animation duration.

```typescript
getTotalDuration(): number
```

**Returns:** Duration in milliseconds

**Example:**
```typescript
const duration = animator.getTotalDuration();
console.log(`Trip duration: ${duration / 1000}s`);
```

---

#### getTotalPoints()

Get total number of points (including interpolated).

```typescript
getTotalPoints(): number
```

**Returns:** Total point count

**Example:**
```typescript
const points = animator.getTotalPoints();
console.log(`Animating ${points} points`);
```

---

#### dispose()

Cleanup and dispose of animator.

```typescript
dispose(): void
```

**Example:**
```typescript
animator.dispose();
```

---

## TripReplayController Component

React component for playback controls.

### Props

```typescript
interface TripReplayControllerProps {
  animator: TripReplayAnimator;
  showTime?: boolean;
  showSpeedControls?: boolean;
  showProgressBar?: boolean;
  className?: string;
  onStateChange?: (state: AnimationState) => void;
  onPositionUpdate?: (position: AnimationPosition) => void;
}
```

### Prop Details

#### animator (required)

TripReplayAnimator instance to control.

**Type:** `TripReplayAnimator`

---

#### showTime

Whether to show time display.

**Type:** `boolean`  
**Default:** `true`

---

#### showSpeedControls

Whether to show speed adjustment controls.

**Type:** `boolean`  
**Default:** `true`

---

#### showProgressBar

Whether to show progress bar.

**Type:** `boolean`  
**Default:** `true`

---

#### className

Custom CSS class name.

**Type:** `string`  
**Default:** `''`

---

#### onStateChange

Callback when animation state changes.

**Type:** `(state: AnimationState) => void`  
**Optional**

---

#### onPositionUpdate

Callback when position updates.

**Type:** `(position: AnimationPosition) => void`  
**Optional**

### Example

```typescript
<TripReplayController
  animator={animator}
  showTime={true}
  showSpeedControls={true}
  showProgressBar={true}
  onStateChange={(state) => console.log('State:', state)}
  onPositionUpdate={(pos) => console.log('Progress:', pos.progress)}
/>
```

---

## TripReplayVisualizer Component

React component integrating animation with Leaflet map.

### Props

```typescript
interface TripReplayVisualizerProps {
  trip: Trip;
  animationConfig?: Partial<AnimationConfig>;
  routeOptions?: RouteVisualizationOptions;
  showControls?: boolean;
  autoFollow?: boolean;
  vehicleIconHtml?: string;
  vehicleIconSize?: number;
  showRoute?: boolean;
  showTraveledPath?: boolean;
  className?: string;
  onStateChange?: (state: AnimationState) => void;
  onPositionUpdate?: (position: AnimationPosition) => void;
}
```

### Prop Details

#### trip (required)

Trip data to replay.

**Type:** `Trip`

---

#### animationConfig

Animation configuration options.

**Type:** `Partial<AnimationConfig>`  
**Optional**

**Example:**
```typescript
animationConfig={{
  speed: 2,
  interpolate: true,
  interpolationSteps: 15
}}
```

---

#### routeOptions

Route visualization options.

**Type:** `RouteVisualizationOptions`  
**Optional**

**Example:**
```typescript
routeOptions={{
  gradient: { start: '#00ff00', end: '#ff0000' },
  weight: 5,
  opacity: 0.8
}}
```

---

#### showControls

Whether to show playback controls.

**Type:** `boolean`  
**Default:** `true`

---

#### autoFollow

Whether to auto-follow the animated marker.

**Type:** `boolean`  
**Default:** `false`

---

#### vehicleIconHtml

Custom vehicle icon HTML.

**Type:** `string`  
**Optional**

**Example:**
```typescript
vehicleIconHtml={`
  <div style="font-size: 40px;">🚗</div>
`}
```

---

#### vehicleIconSize

Vehicle icon size in pixels.

**Type:** `number`  
**Default:** `40`

---

#### showRoute

Whether to show the full route.

**Type:** `boolean`  
**Default:** `true`

---

#### showTraveledPath

Whether to show traveled path (different color).

**Type:** `boolean`  
**Default:** `true`

---

#### className

Custom CSS class name.

**Type:** `string`  
**Default:** `''`

---

#### onStateChange

Callback when animation state changes.

**Type:** `(state: AnimationState) => void`  
**Optional**

---

#### onPositionUpdate

Callback when position updates.

**Type:** `(position: AnimationPosition) => void`  
**Optional**

### Example

```typescript
<MapContainer center={[13.4, 121.2]} zoom={10}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <TripReplayVisualizer
    trip={myTrip}
    animationConfig={{ speed: 2 }}
    autoFollow={true}
    showControls={true}
    showRoute={true}
    showTraveledPath={true}
    onStateChange={(state) => console.log(state)}
  />
</MapContainer>
```

---

## Type Definitions

### AnimationState

```typescript
type AnimationState = 'idle' | 'playing' | 'paused' | 'completed';
```

**Values:**
- `'idle'`: Not started or stopped
- `'playing'`: Currently animating
- `'paused'`: Paused at current position
- `'completed'`: Animation finished

---

### PlaybackSpeed

```typescript
type PlaybackSpeed = 1 | 1.5 | 2 | 3 | 4;
```

**Values:**
- `1`: Real-time speed
- `1.5`: 1.5x speed
- `2`: 2x speed
- `3`: 3x speed
- `4`: 4x speed

---

### AnimationPosition

```typescript
interface AnimationPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  progress: number; // 0-1
  segmentIndex: number;
  heading?: number;
  speed?: number;
}
```

**Properties:**
- `latitude`: Current latitude
- `longitude`: Current longitude
- `timestamp`: Current timestamp
- `progress`: Animation progress (0-1)
- `segmentIndex`: Current segment index
- `heading`: Direction in degrees (0-360)
- `speed`: Speed in m/s (optional)

---

### AnimationConfig

```typescript
interface AnimationConfig {
  speed: PlaybackSpeed;
  loop: boolean;
  minFrameInterval: number;
  interpolate: boolean;
  interpolationSteps: number;
}
```

**Properties:**
- `speed`: Playback speed multiplier
- `loop`: Whether to loop animation
- `minFrameInterval`: Minimum ms between frames
- `interpolate`: Whether to interpolate between points
- `interpolationSteps`: Number of interpolation steps

**Defaults:**
```typescript
{
  speed: 1,
  loop: false,
  minFrameInterval: 16, // ~60fps
  interpolate: true,
  interpolationSteps: 10
}
```

---

### AnimationListener

```typescript
type AnimationListener = (
  position: AnimationPosition,
  state: AnimationState
) => void;
```

Callback function for animation updates.

**Parameters:**
- `position`: Current animation position
- `state`: Current animation state

---

## Utility Functions

### createTripReplayAnimator()

Factory function to create animator instance.

```typescript
function createTripReplayAnimator(
  coordinates: GPSPoint[],
  config?: Partial<AnimationConfig>
): TripReplayAnimator
```

**Parameters:**
- `coordinates`: GPS points to animate
- `config`: Optional configuration

**Returns:** TripReplayAnimator instance

**Example:**
```typescript
const animator = createTripReplayAnimator(trip.coordinates, {
  speed: 2,
  interpolate: true
});
```

---

## Constants

### DEFAULT_ANIMATION_CONFIG

```typescript
const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  speed: 1,
  loop: false,
  minFrameInterval: 16,
  interpolate: true,
  interpolationSteps: 10
};
```

Default animation configuration.

---

## Error Handling

### Common Errors

#### Insufficient GPS Points

```typescript
// Error: Need at least 2 coordinates
const animator = new TripReplayAnimator([]);
// Console warning: "TripReplayAnimator: Need at least 2 coordinates"
```

**Solution:** Ensure trip has at least 2 GPS points.

---

#### Invalid Speed

```typescript
// TypeScript will prevent this
animator.setSpeed(5); // Error: Type '5' is not assignable
```

**Solution:** Use valid PlaybackSpeed values (1, 1.5, 2, 3, 4).

---

#### Invalid Progress

```typescript
animator.seek(1.5); // Will be clamped to 1.0
animator.seek(-0.5); // Will be clamped to 0.0
```

**Solution:** Progress is automatically clamped to 0-1 range.

---

## Performance Tips

### 1. Adjust Interpolation

For large trips, reduce interpolation steps:

```typescript
animationConfig={{
  interpolationSteps: 5 // Instead of 10
}}
```

### 2. Disable Route Visualization

For better performance:

```typescript
<TripReplayVisualizer
  trip={trip}
  showRoute={false} // Only show traveled path
/>
```

### 3. Throttle Frame Rate

For low-end devices:

```typescript
animationConfig={{
  minFrameInterval: 33 // ~30fps instead of 60fps
}}
```

### 4. Disable Auto-Follow

Reduce map updates:

```typescript
<TripReplayVisualizer
  trip={trip}
  autoFollow={false}
/>
```

---

## Best Practices

### 1. Cleanup on Unmount

```typescript
useEffect(() => {
  const animator = createTripReplayAnimator(trip.coordinates);
  
  return () => {
    animator.dispose(); // Important!
  };
}, [trip.coordinates]);
```

### 2. Handle State Changes

```typescript
<TripReplayVisualizer
  trip={trip}
  onStateChange={(state) => {
    if (state === 'completed') {
      console.log('Trip replay finished');
      // Show completion message, etc.
    }
  }}
/>
```

### 3. Monitor Progress

```typescript
<TripReplayVisualizer
  trip={trip}
  onPositionUpdate={(position) => {
    const percent = (position.progress * 100).toFixed(1);
    console.log(`${percent}% complete`);
  }}
/>
```

### 4. Validate Trip Data

```typescript
import { validateRoutePoints } from './utils/routeVisualizer';

const validation = validateRoutePoints(trip.coordinates);
if (!validation.valid) {
  console.error('Invalid trip data:', validation.errors);
  return;
}
```

---

## Migration Guide

### From Phase 3 to Phase 4

**Phase 3 (Static Visualization):**
```typescript
<TripRouteVisualizer trip={trip} />
```

**Phase 4 (Animated Replay):**
```typescript
<TripReplayVisualizer trip={trip} />
```

Both components can be used together:
```typescript
// Show multiple static routes
<TripRouteVisualizer trip={trip1} />
<TripRouteVisualizer trip={trip2} />

// Animate one trip
<TripReplayVisualizer trip={selectedTrip} />
```

---

## Version History

### 4.0.0 (October 12, 2025)
- Initial release
- requestAnimationFrame animation
- Adjustable playback speed (1x-4x)
- Auto-follow camera
- Custom vehicle icons
- Mobile optimization

---

## Support

For issues, questions, or feature requests:

1. Check `PHASE_4_QUICK_REFERENCE.md` for common solutions
2. Review `PHASE_4_INTEGRATION_GUIDE.md` for integration help
3. See examples in `TripReplayVisualizerExample.tsx`

---

**Last Updated**: October 12, 2025  
**Version**: 4.0.0  
**Status**: Production Ready
