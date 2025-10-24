# Phase 5 - API Documentation

## Playback Controls API Reference

**Version**: 5.0.0  
**Date**: October 12, 2025

---

## Table of Contents

1. [TripReplayController Component](#tripreplaycontroller-component)
2. [Props Interface](#props-interface)
3. [Event Handlers](#event-handlers)
4. [State Management](#state-management)
5. [Styling API](#styling-api)
6. [Accessibility API](#accessibility-api)

---

## TripReplayController Component

### Overview

The `TripReplayController` component provides a complete UI for controlling trip replay animations.

### Import

```typescript
import TripReplayController from './components/TripReplayController';
```

### Basic Usage

```tsx
<TripReplayController
  animator={animator}
  showTime={true}
  showSpeedControls={true}
  showProgressBar={true}
/>
```

---

## Props Interface

### TripReplayControllerProps

```typescript
interface TripReplayControllerProps {
  /** Animator instance to control (REQUIRED) */
  animator: TripReplayAnimator;
  
  /** Whether to show time display (default: true) */
  showTime?: boolean;
  
  /** Whether to show speed controls (default: true) */
  showSpeedControls?: boolean;
  
  /** Whether to show progress bar (default: true) */
  showProgressBar?: boolean;
  
  /** Custom class name for styling */
  className?: string;
  
  /** Callback when animation state changes */
  onStateChange?: (state: AnimationState) => void;
  
  /** Callback when position updates */
  onPositionUpdate?: (position: AnimationPosition) => void;
}
```

### Prop Details

#### `animator` (Required)

**Type**: `TripReplayAnimator`

The animator instance that controls the animation. Must be created using `createTripReplayAnimator()`.

**Example:**
```typescript
const animator = createTripReplayAnimator(trip.coordinates);

<TripReplayController animator={animator} />
```

#### `showTime` (Optional)

**Type**: `boolean`  
**Default**: `true`

Controls visibility of the time display showing current and total duration.

**Example:**
```tsx
<TripReplayController 
  animator={animator}
  showTime={false}  // Hide time display
/>
```

#### `showSpeedControls` (Optional)

**Type**: `boolean`  
**Default**: `true`

Controls visibility of speed adjustment buttons (1x, 1.5x, 2x, 3x, 4x).

**Example:**
```tsx
<TripReplayController 
  animator={animator}
  showSpeedControls={false}  // Hide speed controls
/>
```

#### `showProgressBar` (Optional)

**Type**: `boolean`  
**Default**: `true`

Controls visibility of the progress bar with scrubbing capability.

**Example:**
```tsx
<TripReplayController 
  animator={animator}
  showProgressBar={false}  // Hide progress bar
/>
```

#### `className` (Optional)

**Type**: `string`  
**Default**: `''`

Custom CSS class name for additional styling.

**Example:**
```tsx
<TripReplayController 
  animator={animator}
  className="my-custom-controls"
/>
```

#### `onStateChange` (Optional)

**Type**: `(state: AnimationState) => void`

Callback function invoked when animation state changes.

**Parameters:**
- `state`: `'idle' | 'playing' | 'paused' | 'completed'`

**Example:**
```tsx
<TripReplayController 
  animator={animator}
  onStateChange={(state) => {
    console.log('Animation state:', state);
    if (state === 'completed') {
      alert('Replay finished!');
    }
  }}
/>
```

#### `onPositionUpdate` (Optional)

**Type**: `(position: AnimationPosition) => void`

Callback function invoked on every animation frame update.

**Parameters:**
- `position`: `AnimationPosition` object

**Example:**
```tsx
<TripReplayController 
  animator={animator}
  onPositionUpdate={(position) => {
    console.log('Progress:', (position.progress * 100).toFixed(1) + '%');
    console.log('Location:', position.latitude, position.longitude);
  }}
/>
```

---

## Event Handlers

### Internal Event Handlers

These handlers are used internally by the component. Understanding them helps with customization.

#### `handlePlayPause()`

Toggles between play and pause states.

**Logic:**
```typescript
if (state === 'playing') {
  animator.pause();
} else if (state === 'completed') {
  animator.restart();
} else {
  animator.play();
}
```

#### `handleRestart()`

Restarts animation from the beginning.

**Logic:**
```typescript
animator.restart();
```

#### `handleSpeedChange(newSpeed: PlaybackSpeed)`

Changes playback speed.

**Parameters:**
- `newSpeed`: `1 | 1.5 | 2 | 3 | 4`

**Logic:**
```typescript
animator.setSpeed(newSpeed);
setSpeed(newSpeed);
```

#### `handleProgressChange(event)`

Handles progress bar click/drag for seeking.

**Parameters:**
- `event`: `React.MouseEvent | React.TouchEvent`

**Logic:**
```typescript
const rect = target.getBoundingClientRect();
const x = clientX - rect.left;
const newProgress = x / rect.width;
animator.seek(newProgress);
```

---

## State Management

### Component State

The component maintains the following state:

```typescript
const [state, setState] = useState<AnimationState>('idle');
const [progress, setProgress] = useState<number>(0);
const [speed, setSpeed] = useState<PlaybackSpeed>(1);
const [currentPosition, setCurrentPosition] = useState<AnimationPosition | null>(null);
const [isDragging, setIsDragging] = useState(false);
```

### State Types

#### AnimationState

```typescript
type AnimationState = 'idle' | 'playing' | 'paused' | 'completed';
```

**States:**
- `idle`: Ready to start, not yet played
- `playing`: Animation in progress
- `paused`: Animation paused, can resume
- `completed`: Animation finished

#### PlaybackSpeed

```typescript
type PlaybackSpeed = 1 | 1.5 | 2 | 3 | 4;
```

**Speeds:**
- `1`: Real-time (1x)
- `1.5`: 50% faster
- `2`: Double speed
- `3`: Triple speed
- `4`: Quadruple speed

#### AnimationPosition

```typescript
interface AnimationPosition {
  latitude: number;           // Current latitude
  longitude: number;          // Current longitude
  timestamp: number;          // Current timestamp (ms)
  progress: number;           // 0.0 to 1.0
  segmentIndex: number;       // Current segment index
  heading?: number;           // Direction (0-360 degrees)
  speed?: number;             // Speed (m/s)
}
```

---

## Styling API

### CSS Classes

The component uses the following CSS classes:

#### Container Classes

```css
.trip-replay-controller          /* Main container */
.trip-replay-controls-container  /* Wrapper with positioning */
```

#### Progress Bar Classes

```css
.replay-progress-container       /* Progress section wrapper */
.replay-progress-bar             /* Progress bar track */
.replay-progress-fill            /* Filled portion */
.replay-progress-handle          /* Draggable handle */
```

#### Time Display Classes

```css
.replay-time-display             /* Time container */
.replay-current-time             /* Current time */
.replay-time-separator           /* "/" separator */
.replay-total-time               /* Total duration */
```

#### Button Classes

```css
.replay-controls                 /* Buttons container */
.replay-btn                      /* Base button class */
.replay-btn-restart              /* Restart button */
.replay-btn-play-pause           /* Play/Pause button */
.replay-btn-play-pause.playing   /* Playing state */
```

#### Speed Control Classes

```css
.replay-speed-controls           /* Speed section wrapper */
.replay-speed-label              /* "Speed:" label */
.replay-speed-buttons            /* Speed buttons container */
.replay-speed-btn                /* Individual speed button */
.replay-speed-btn.active         /* Active speed button */
```

#### State Indicator Classes

```css
.replay-state-indicator          /* State indicator */
.replay-state-idle               /* Idle state */
.replay-state-playing            /* Playing state */
.replay-state-paused             /* Paused state */
.replay-state-completed          /* Completed state */
```

### CSS Custom Properties

Override these for theming:

```css
.trip-replay-controller {
  /* Colors */
  --primary-color: #2196F3;
  --playing-color: #FF9800;
  --success-color: #4CAF50;
  --text-color: #424242;
  --bg-color: rgba(255, 255, 255, 0.98);
  
  /* Sizes */
  --play-btn-size: 56px;
  --restart-btn-size: 40px;
  --progress-height: 8px;
  --handle-size: 16px;
  
  /* Spacing */
  --gap: 12px;
  --padding: 16px 20px;
  
  /* Borders */
  --border-radius: 12px;
  --btn-radius: 50%;
}
```

### Custom Styling Example

```css
/* Custom blue theme */
.my-custom-controls {
  --primary-color: #0066ff;
  --playing-color: #00cc66;
  --bg-color: rgba(0, 0, 0, 0.9);
  --text-color: white;
}

/* Larger buttons for accessibility */
.my-custom-controls .replay-btn-play-pause {
  width: 72px;
  height: 72px;
}

/* Custom progress bar */
.my-custom-controls .replay-progress-bar {
  height: 12px;
}
```

---

## Accessibility API

### ARIA Attributes

The component includes comprehensive ARIA attributes:

#### Buttons

```html
<button
  aria-label="Play animation"
  role="button"
  tabindex="0"
>
  ▶
</button>

<button
  aria-label="Pause animation"
  role="button"
  tabindex="0"
>
  ⏸
</button>

<button
  aria-label="Restart animation"
  role="button"
  tabindex="0"
>
  ↻
</button>

<button
  aria-label="Set playback speed to 2x"
  role="button"
  tabindex="0"
>
  2x
</button>
```

#### Progress Bar

```html
<div
  role="slider"
  aria-label="Animation progress"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow="45"
  aria-valuetext="45% complete"
  tabindex="0"
>
```

#### State Indicator

```html
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  ▶ Playing
</div>
```

### Keyboard Navigation

**Supported Keys:**

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `Enter` | Activate focused button |
| `R` | Restart |
| `1` | Set speed to 1x |
| `2` | Set speed to 2x |
| `3` | Set speed to 3x |
| `4` | Set speed to 4x |
| `Tab` | Navigate controls |
| `Shift+Tab` | Navigate backwards |
| `Left Arrow` | Seek backward 5s |
| `Right Arrow` | Seek forward 5s |

### Focus Management

```typescript
// Focus indicators
.replay-btn:focus-visible {
  outline: 3px solid #2196F3;
  outline-offset: 2px;
}

// Skip to main content
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

---

## Helper Functions

### Time Formatting

```typescript
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

**Examples:**
- `formatTime(45000)` → `"0:45"`
- `formatTime(125000)` → `"2:05"`
- `formatTime(3725000)` → `"1:02:05"`

---

## Usage Examples

### Example 1: Basic Controller

```tsx
import TripReplayController from './components/TripReplayController';
import { createTripReplayAnimator } from './utils/tripReplayAnimator';

function MyComponent() {
  const animator = createTripReplayAnimator(trip.coordinates);
  
  return (
    <TripReplayController animator={animator} />
  );
}
```

### Example 2: Minimal Controller

```tsx
<TripReplayController
  animator={animator}
  showTime={false}
  showSpeedControls={false}
  showProgressBar={true}
/>
```

### Example 3: With Callbacks

```tsx
<TripReplayController
  animator={animator}
  onStateChange={(state) => {
    if (state === 'completed') {
      console.log('Replay finished!');
      loadNextTrip();
    }
  }}
  onPositionUpdate={(position) => {
    updateMapCenter(position.latitude, position.longitude);
    updateStats(position);
  }}
/>
```

### Example 4: Custom Styled

```tsx
<TripReplayController
  animator={animator}
  className="dark-theme-controls"
  showTime={true}
  showSpeedControls={true}
  showProgressBar={true}
/>
```

```css
.dark-theme-controls {
  --bg-color: rgba(0, 0, 0, 0.95);
  --text-color: white;
  --primary-color: #00ffff;
}
```

### Example 5: Programmatic Control

```tsx
function AdvancedController() {
  const animatorRef = useRef<TripReplayAnimator | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    animatorRef.current = createTripReplayAnimator(trip.coordinates);
  }, [trip]);
  
  const handleCustomPlay = () => {
    animatorRef.current?.play();
    setIsPlaying(true);
  };
  
  return (
    <div>
      <button onClick={handleCustomPlay}>Custom Play</button>
      <TripReplayController 
        animator={animatorRef.current!}
        onStateChange={(state) => {
          setIsPlaying(state === 'playing');
        }}
      />
    </div>
  );
}
```

---

## TypeScript Definitions

### Complete Type Definitions

```typescript
// Animation State
type AnimationState = 'idle' | 'playing' | 'paused' | 'completed';

// Playback Speed
type PlaybackSpeed = 1 | 1.5 | 2 | 3 | 4;

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

// Component Props
interface TripReplayControllerProps {
  animator: TripReplayAnimator;
  showTime?: boolean;
  showSpeedControls?: boolean;
  showProgressBar?: boolean;
  className?: string;
  onStateChange?: (state: AnimationState) => void;
  onPositionUpdate?: (position: AnimationPosition) => void;
}

// Animator Interface
interface TripReplayAnimator {
  play(): void;
  pause(): void;
  stop(): void;
  restart(): void;
  seek(progress: number): void;
  setSpeed(speed: PlaybackSpeed): void;
  getSpeed(): PlaybackSpeed;
  getState(): AnimationState;
  getCurrentProgress(): number;
  getCurrentAnimationPosition(): AnimationPosition | null;
  getTotalDuration(): number;
  subscribe(listener: AnimationListener): () => void;
  dispose(): void;
}

// Animation Listener
type AnimationListener = (
  position: AnimationPosition,
  state: AnimationState
) => void;
```

---

## Error Handling

### Common Errors

#### Missing Animator

```typescript
if (!animator) {
  throw new Error('TripReplayController: animator prop is required');
}
```

#### Invalid Trip Data

```typescript
if (trip.coordinates.length < 2) {
  console.error('Trip must have at least 2 GPS points');
  return <ErrorMessage />;
}
```

#### Subscription Errors

```typescript
try {
  animator.subscribe((position, state) => {
    // Handle update
  });
} catch (error) {
  console.error('Failed to subscribe to animator:', error);
}
```

---

## Performance Considerations

### Optimization Tips

1. **Memoize Callbacks**
```typescript
const handlePlay = useCallback(() => {
  animator.play();
}, [animator]);
```

2. **Throttle Updates**
```typescript
const throttledUpdate = useCallback(
  throttle((position) => {
    updateUI(position);
  }, 100),
  []
);
```

3. **Cleanup Subscriptions**
```typescript
useEffect(() => {
  const unsubscribe = animator.subscribe(handleUpdate);
  return () => unsubscribe();
}, [animator]);
```

4. **Avoid Unnecessary Re-renders**
```typescript
const MemoizedController = React.memo(TripReplayController);
```

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile Safari | iOS 14+ | ✅ Full |
| Chrome Mobile | Latest | ✅ Full |

---

## Related Documentation

- **Phase 5 Overview**: `PHASE_5_PLAYBACK_CONTROLS.md`
- **Quick Reference**: `PHASE_5_QUICK_REFERENCE.md`
- **Integration Guide**: `PHASE_5_INTEGRATION_GUIDE.md`
- **Phase 4 Animator**: `PHASE_4_API_DOCUMENTATION.md`

---

**Last Updated**: October 12, 2025  
**Version**: 5.0.0  
**Status**: Production Ready
