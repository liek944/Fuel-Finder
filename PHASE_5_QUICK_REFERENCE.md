# Phase 5 - Quick Reference Guide

## Playback Controls - Quick Start

**Version**: 5.0.0  
**For**: Developers using trip replay controls

---

## 🚀 Quick Start (30 seconds)

### 1. Import Component

```typescript
import TripReplayController from './components/TripReplayController';
import { createTripReplayAnimator } from './utils/tripReplayAnimator';
```

### 2. Create Animator

```typescript
const animator = createTripReplayAnimator(trip.coordinates);
```

### 3. Add Controller

```tsx
<TripReplayController animator={animator} />
```

### 4. Done! 🎉

You now have fully functional playback controls.

---

## 📋 Common Patterns

### Full Controls (Default)

```tsx
<TripReplayController
  animator={animator}
  showTime={true}
  showSpeedControls={true}
  showProgressBar={true}
/>
```

### Minimal Controls

```tsx
<TripReplayController
  animator={animator}
  showTime={false}
  showSpeedControls={false}
/>
```

### With Event Tracking

```tsx
<TripReplayController
  animator={animator}
  onStateChange={(state) => console.log('State:', state)}
  onPositionUpdate={(pos) => console.log('Progress:', pos.progress)}
/>
```

### Custom Styling

```tsx
<TripReplayController
  animator={animator}
  className="my-custom-theme"
/>
```

---

## 🎮 Control Actions

### Play/Pause

```typescript
animator.play();    // Start animation
animator.pause();   // Pause animation
```

### Restart

```typescript
animator.restart(); // Reset to beginning and play
```

### Speed Control

```typescript
animator.setSpeed(1);    // 1x (real-time)
animator.setSpeed(1.5);  // 1.5x
animator.setSpeed(2);    // 2x (recommended)
animator.setSpeed(3);    // 3x
animator.setSpeed(4);    // 4x (fast)
```

### Seek to Position

```typescript
animator.seek(0);      // Beginning
animator.seek(0.5);    // 50%
animator.seek(1);      // End
```

---

## ⚙️ Configuration

### Show/Hide Elements

```typescript
showTime={true}           // Show time display
showSpeedControls={true}  // Show speed buttons
showProgressBar={true}    // Show progress bar
```

### Custom Class

```typescript
className="dark-mode"     // Add custom CSS class
```

### Event Callbacks

```typescript
onStateChange={(state) => {
  // Called when state changes
  // state: 'idle' | 'playing' | 'paused' | 'completed'
}}

onPositionUpdate={(position) => {
  // Called every frame
  // position: { latitude, longitude, progress, ... }
}}
```

---

## 🎨 Styling

### CSS Classes

```css
.trip-replay-controller          /* Main container */
.replay-controls                 /* Buttons container */
.replay-btn-play-pause           /* Play/Pause button */
.replay-btn-restart              /* Restart button */
.replay-speed-btn                /* Speed buttons */
.replay-progress-bar             /* Progress bar */
.replay-state-indicator          /* State indicator */
```

### Custom Theme Example

```css
.dark-mode {
  --primary-color: #00ffff;
  --bg-color: rgba(0, 0, 0, 0.9);
  --text-color: white;
}
```

---

## 📱 Mobile Support

### Touch Optimized

- Large touch targets (48px+)
- Touch drag on progress bar
- Responsive layout
- Battery efficient

### Mobile-Specific Settings

```typescript
animationConfig={{
  minFrameInterval: 33  // 30fps for battery saving
}}
```

---

## ♿ Accessibility

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `R` | Restart |
| `1-4` | Set speed |
| `Tab` | Navigate |
| `←/→` | Seek ±5s |

### Screen Reader Support

All controls have ARIA labels and roles for screen reader compatibility.

---

## 🐛 Troubleshooting

### Controls Not Showing

**Problem**: Controls are invisible.

**Solution**: Import CSS file.

```typescript
import './styles/TripReplayVisualizer.css';
```

### Buttons Not Working

**Problem**: Clicks don't respond.

**Solution**: Ensure animator is initialized.

```typescript
if (!animator) {
  console.error('Animator not initialized');
}
```

### Progress Bar Not Updating

**Problem**: Bar stays at 0%.

**Solution**: Check subscription.

```typescript
useEffect(() => {
  const unsubscribe = animator.subscribe((position) => {
    // Update UI
  });
  return () => unsubscribe();
}, [animator]);
```

### Jerky Animation

**Problem**: Animation stutters.

**Solution**: Enable interpolation.

```typescript
const animator = createTripReplayAnimator(trip.coordinates, {
  interpolate: true,
  interpolationSteps: 10
});
```

---

## 💡 Tips & Tricks

### 1. Auto-Restart on Complete

```tsx
<TripReplayController
  animator={animator}
  onStateChange={(state) => {
    if (state === 'completed') {
      setTimeout(() => animator.restart(), 2000);
    }
  }}
/>
```

### 2. Progress Percentage Display

```tsx
<TripReplayController
  animator={animator}
  onPositionUpdate={(position) => {
    const percent = (position.progress * 100).toFixed(1);
    setProgressText(`${percent}%`);
  }}
/>
```

### 3. Speed Presets

```typescript
const SPEED_PRESETS = {
  slow: 1,
  normal: 2,
  fast: 4
};

animator.setSpeed(SPEED_PRESETS.fast);
```

### 4. Custom State Indicator

```tsx
{state === 'playing' && <div>▶ Playing</div>}
{state === 'paused' && <div>⏸ Paused</div>}
{state === 'completed' && <div>✓ Done</div>}
```

### 5. Sync Multiple Components

```tsx
const [sharedState, setSharedState] = useState('idle');

<TripReplayController
  animator={animator}
  onStateChange={setSharedState}
/>

<StatusDisplay state={sharedState} />
```

---

## 🔗 Integration Examples

### With TripReplayVisualizer

```tsx
<MapContainer>
  <TileLayer />
  <TripReplayVisualizer
    trip={trip}
    showControls={true}  // Built-in controller
  />
</MapContainer>
```

### Standalone Controller

```tsx
<div>
  <MapContainer>
    <TileLayer />
    <TripReplayVisualizer
      trip={trip}
      showControls={false}  // No built-in controls
    />
  </MapContainer>
  
  <TripReplayController
    animator={animator}
    className="external-controls"
  />
</div>
```

### Multiple Trips

```tsx
const [activeAnimator, setActiveAnimator] = useState(animator1);

<TripSelector onChange={setActiveAnimator} />
<TripReplayController animator={activeAnimator} />
```

---

## 📊 State Reference

### Animation States

```typescript
'idle'       // Ready to start
'playing'    // Animation running
'paused'     // Animation paused
'completed'  // Animation finished
```

### State Transitions

```
idle → playing      [play()]
playing → paused    [pause()]
paused → playing    [play()]
playing → completed [end reached]
completed → playing [restart()]
```

---

## 🎯 Use Cases

### 1. Trip Review

```tsx
<TripReplayController
  animator={animator}
  showTime={true}
  showSpeedControls={true}
/>
```

### 2. Presentation Mode

```tsx
<TripReplayController
  animator={animator}
  showTime={false}
  showSpeedControls={false}
/>
```

### 3. Debug Mode

```tsx
<TripReplayController
  animator={animator}
  onPositionUpdate={(pos) => {
    console.log('Lat:', pos.latitude);
    console.log('Lng:', pos.longitude);
    console.log('Progress:', pos.progress);
  }}
/>
```

### 4. Tutorial Mode

```tsx
<TripReplayController
  animator={animator}
  onStateChange={(state) => {
    if (state === 'completed') {
      showNextTutorialStep();
    }
  }}
/>
```

---

## 📈 Performance Tips

### 1. Memoize Callbacks

```typescript
const handleStateChange = useCallback((state) => {
  console.log(state);
}, []);
```

### 2. Throttle Updates

```typescript
const throttledUpdate = useCallback(
  throttle((position) => {
    updateUI(position);
  }, 100),
  []
);
```

### 3. Cleanup on Unmount

```typescript
useEffect(() => {
  return () => {
    animator.dispose();
  };
}, [animator]);
```

### 4. Reduce Frame Rate on Mobile

```typescript
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

const animator = createTripReplayAnimator(trip.coordinates, {
  minFrameInterval: isMobile ? 33 : 16  // 30fps vs 60fps
});
```

---

## 🔧 Customization

### Custom Speed Options

Modify in component:

```typescript
const speedOptions: PlaybackSpeed[] = [1, 2, 4]; // Only 3 speeds
```

### Custom Button Icons

Replace SVG in component:

```tsx
<button>
  <YourCustomIcon />
</button>
```

### Custom Progress Bar

```css
.replay-progress-bar {
  height: 12px;
  background: linear-gradient(90deg, #ff0000, #00ff00);
}
```

### Custom Time Format

```typescript
const formatTime = (ms: number) => {
  return new Date(ms).toISOString().substr(11, 8);
};
```

---

## 📚 Further Reading

- **Complete API**: `PHASE_5_API_DOCUMENTATION.md`
- **Feature Details**: `PHASE_5_PLAYBACK_CONTROLS.md`
- **Integration Guide**: `PHASE_5_INTEGRATION_GUIDE.md`
- **Phase 4 Animator**: `PHASE_4_API_DOCUMENTATION.md`

---

## ✅ Checklist

Before deploying:

- [ ] Import CSS file
- [ ] Initialize animator
- [ ] Test all buttons
- [ ] Test progress bar scrubbing
- [ ] Test speed controls
- [ ] Test on mobile
- [ ] Test keyboard navigation
- [ ] Verify cleanup on unmount

---

## 🆘 Quick Help

### Get Current State

```typescript
animator.getState()
// Returns: 'idle' | 'playing' | 'paused' | 'completed'
```

### Get Progress

```typescript
animator.getCurrentProgress()
// Returns: 0.0 to 1.0
```

### Get Speed

```typescript
animator.getSpeed()
// Returns: 1 | 1.5 | 2 | 3 | 4
```

### Get Duration

```typescript
animator.getTotalDuration()
// Returns: milliseconds
```

---

## 📞 Support

**Documentation:**
- API Reference: `PHASE_5_API_DOCUMENTATION.md`
- Integration Guide: `PHASE_5_INTEGRATION_GUIDE.md`

**Source Code:**
- Component: `frontend/src/components/TripReplayController.tsx`
- Styles: `frontend/src/styles/TripReplayVisualizer.css`

---

**Last Updated**: October 12, 2025  
**Version**: 5.0.0  
**Status**: Production Ready

**Need more help?** Check the full API documentation!
