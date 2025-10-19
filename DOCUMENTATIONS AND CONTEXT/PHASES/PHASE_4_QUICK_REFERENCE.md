# Phase 4 - Quick Reference Guide

## Trip Replay Animation - Quick Start

**Version**: 4.0.0  
**For**: Developers integrating trip replay animation

---

## 🚀 Quick Start (30 seconds)

### 1. Import Components

```typescript
import TripReplayVisualizer from './components/TripReplayVisualizer';
import './styles/TripReplayVisualizer.css';
```

### 2. Add to Map

```tsx
<MapContainer center={[13.4, 121.2]} zoom={10}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <TripReplayVisualizer trip={myTrip} />
</MapContainer>
```

### 3. Done! 🎉

The component includes controls, animation, and styling by default.

---

## 📋 Common Patterns

### Basic Replay

```tsx
<TripReplayVisualizer
  trip={trip}
  showControls={true}
/>
```

### Fast Replay (2x Speed)

```tsx
<TripReplayVisualizer
  trip={trip}
  animationConfig={{ speed: 2 }}
/>
```

### Auto-Follow Camera

```tsx
<TripReplayVisualizer
  trip={trip}
  autoFollow={true}
/>
```

### Custom Vehicle Icon

```tsx
<TripReplayVisualizer
  trip={trip}
  vehicleIconHtml={`<div style="font-size: 40px;">🚗</div>`}
  vehicleIconSize={50}
/>
```

### Minimal (No Controls)

```tsx
<TripReplayVisualizer
  trip={trip}
  showControls={false}
  showRoute={false}
/>
```

---

## 🎮 Programmatic Control

### Create Animator

```typescript
import { createTripReplayAnimator } from './utils/tripReplayAnimator';

const animator = createTripReplayAnimator(trip.coordinates);
```

### Control Playback

```typescript
animator.play();        // Start
animator.pause();       // Pause
animator.restart();     // Restart
animator.stop();        // Stop & reset
animator.seek(0.5);     // Jump to 50%
animator.setSpeed(2);   // 2x speed
```

### Listen to Updates

```typescript
animator.subscribe((position, state) => {
  console.log(`Progress: ${(position.progress * 100).toFixed(1)}%`);
  console.log(`State: ${state}`);
});
```

### Cleanup

```typescript
animator.dispose();
```

---

## ⚙️ Configuration Options

### Animation Config

```typescript
animationConfig={{
  speed: 2,                    // 1, 1.5, 2, 3, or 4
  interpolate: true,           // Smooth animation
  interpolationSteps: 10,      // Points between GPS coords
  loop: false,                 // Loop when complete
  minFrameInterval: 16         // ~60fps
}}
```

### Route Options

```typescript
routeOptions={{
  gradient: { 
    start: '#00ff00', 
    end: '#ff0000' 
  },
  weight: 5,
  opacity: 0.8,
  showStartMarker: true,
  showEndMarker: true
}}
```

---

## 🎨 Customization

### Custom Colors

```typescript
routeOptions={{
  gradient: { 
    start: '#0066ff',  // Blue
    end: '#ff6600'     // Orange
  }
}}
```

### Custom Vehicle

```typescript
const customIcon = `
  <div style="
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <span style="font-size: 30px;">🚙</span>
  </div>
`;

<TripReplayVisualizer
  vehicleIconHtml={customIcon}
  vehicleIconSize={50}
/>
```

---

## 📱 Mobile Optimization

### Touch-Friendly

```tsx
<TripReplayVisualizer
  trip={trip}
  showControls={true}  // Touch-optimized controls
/>
```

### Reduce Performance Load

```typescript
animationConfig={{
  interpolationSteps: 5,      // Fewer points
  minFrameInterval: 33        // 30fps instead of 60fps
}}
```

---

## 🐛 Troubleshooting

### Animation Not Starting

**Problem:** Nothing happens when clicking play.

**Solution:** Check trip has at least 2 GPS points.

```typescript
if (trip.coordinates.length < 2) {
  console.error('Need at least 2 GPS points');
}
```

### Jerky Animation

**Problem:** Animation is not smooth.

**Solution:** Enable interpolation.

```typescript
animationConfig={{
  interpolate: true,
  interpolationSteps: 10
}}
```

### Controls Not Visible

**Problem:** Can't see playback controls.

**Solution:** Import CSS file.

```typescript
import './styles/TripReplayVisualizer.css';
```

### Marker Not Rotating

**Problem:** Vehicle marker doesn't face direction.

**Solution:** Ensure GPS points have heading data or let animator calculate it.

```typescript
// Animator automatically calculates heading between points
```

### Performance Issues

**Problem:** Animation is laggy on mobile.

**Solution:** Reduce interpolation and frame rate.

```typescript
animationConfig={{
  interpolationSteps: 5,
  minFrameInterval: 33  // 30fps
}}
```

---

## 💡 Tips & Tricks

### 1. Combine with Route Visualizer

Show multiple static routes + one animated:

```tsx
<TripRouteVisualizer trip={trip1} />
<TripRouteVisualizer trip={trip2} />
<TripReplayVisualizer trip={selectedTrip} />
```

### 2. Custom Event Handlers

```tsx
<TripReplayVisualizer
  trip={trip}
  onStateChange={(state) => {
    if (state === 'completed') {
      alert('Trip replay finished!');
    }
  }}
  onPositionUpdate={(position) => {
    updateUI(position);
  }}
/>
```

### 3. Dynamic Speed Control

```typescript
const [speed, setSpeed] = useState<PlaybackSpeed>(1);

<TripReplayVisualizer
  trip={trip}
  animationConfig={{ speed }}
/>

<button onClick={() => setSpeed(2)}>2x Speed</button>
```

### 4. Progress Tracking

```typescript
<TripReplayVisualizer
  trip={trip}
  onPositionUpdate={(position) => {
    const percent = (position.progress * 100).toFixed(1);
    document.title = `${percent}% - Trip Replay`;
  }}
/>
```

### 5. Auto-Restart on Complete

```typescript
<TripReplayVisualizer
  trip={trip}
  animationConfig={{ loop: true }}
/>
```

---

## 🔗 Integration with Other Phases

### Phase 1: Recording

```typescript
// Record trip
locationRecorder.startRecording('My Trip');
// ... user moves around ...
const trip = await locationRecorder.stopRecording();
```

### Phase 2: Management

```typescript
// Get trip from storage
const trip = await tripSessionManager.getTrip(tripId);
```

### Phase 3: Visualization

```typescript
// Show static route
<TripRouteVisualizer trip={trip} />
```

### Phase 4: Animation

```typescript
// Animate replay
<TripReplayVisualizer trip={trip} />
```

---

## 📊 Performance Guidelines

| Trip Size | Interpolation | Frame Rate | Performance |
|-----------|---------------|------------|-------------|
| < 50 pts | 10 steps | 60fps | Excellent |
| 50-100 pts | 10 steps | 60fps | Good |
| 100-200 pts | 5 steps | 60fps | Good |
| > 200 pts | 5 steps | 30fps | Acceptable |

---

## 🎯 Use Cases

### 1. Trip Review

```tsx
<TripReplayVisualizer
  trip={trip}
  autoFollow={true}
  showControls={true}
/>
```

### 2. Trip Comparison

```tsx
{trips.map(trip => (
  <TripRouteVisualizer key={trip.id} trip={trip} />
))}
<TripReplayVisualizer trip={selectedTrip} />
```

### 3. Presentation Mode

```tsx
<TripReplayVisualizer
  trip={trip}
  animationConfig={{ speed: 3, loop: true }}
  autoFollow={true}
  showControls={false}
/>
```

### 4. Tutorial/Demo

```tsx
<TripReplayVisualizer
  trip={demoTrip}
  animationConfig={{ speed: 1.5 }}
  vehicleIconHtml={`<div>📍</div>`}
  onStateChange={(state) => {
    if (state === 'completed') {
      showNextTutorialStep();
    }
  }}
/>
```

---

## 📚 Further Reading

- **Complete API**: `PHASE_4_API_DOCUMENTATION.md`
- **Integration Guide**: `PHASE_4_INTEGRATION_GUIDE.md`
- **Feature Details**: `PHASE_4_REPLAY_ANIMATION.md`
- **Examples**: `frontend/src/examples/TripReplayVisualizerExample.tsx`

---

## 🆘 Quick Help

### Get Current State

```typescript
const state = animator.getState();
// 'idle' | 'playing' | 'paused' | 'completed'
```

### Get Progress

```typescript
const progress = animator.getCurrentProgress();
// 0.0 to 1.0
```

### Get Position

```typescript
const position = animator.getCurrentAnimationPosition();
// { latitude, longitude, progress, heading, ... }
```

### Change Speed Mid-Animation

```typescript
animator.setSpeed(3); // Continues from current position
```

---

## ✅ Checklist

Before deploying:

- [ ] Import CSS file
- [ ] Validate trip has ≥2 GPS points
- [ ] Test on mobile devices
- [ ] Test different playback speeds
- [ ] Verify cleanup on unmount
- [ ] Check performance with large trips
- [ ] Test touch controls
- [ ] Verify accessibility

---

**Last Updated**: October 12, 2025  
**Version**: 4.0.0  
**Status**: Production Ready

**Need more help?** Check the full API documentation or examples!
