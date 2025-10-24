# Trip Recorder Feature - Phase 1: Core Data Capture

## Overview

The Trip Recorder feature enables real-time GPS tracking during driving sessions, capturing location data that can be used for trip replay, analytics, and route visualization. This is **Phase 1** of the Trip Replay Feature as outlined in the `Replay_Feature_Guide.md`.

## Architecture

### Components

1. **IndexedDB Storage (`utils/indexedDB.ts`)**
   - Persistent browser storage for trip data
   - Handles CRUD operations for trips
   - Stores GPS coordinates with metadata

2. **Location Recorder Service (`utils/locationRecorder.ts`)**
   - Real-time GPS tracking using `navigator.geolocation.watchPosition()`
   - Battery-efficient with configurable update intervals
   - Automatic error handling and fallback logic

3. **Trip Recorder UI Component (`components/TripRecorder.tsx`)**
   - Manual Start/Stop controls
   - Real-time statistics display
   - Pause/Resume functionality
   - Responsive design for mobile and desktop

## Features

### ✅ Implemented

- **Real-time Location Tracking**
  - Uses `navigator.geolocation.watchPosition()` for continuous tracking
  - Updates every 3 seconds by default (configurable)
  - High accuracy mode enabled

- **Battery Optimization**
  - Configurable update intervals
  - Accuracy filtering (skips readings > 50m accuracy)
  - Throttled updates to prevent excessive battery drain

- **Data Persistence**
  - IndexedDB for offline-capable storage
  - Survives page refreshes and browser restarts
  - Efficient storage with indexed queries

- **User Controls**
  - Start/Stop recording with optional trip naming
  - Pause/Resume functionality
  - Real-time statistics (duration, points, accuracy, speed)
  - Visual status indicators

- **Error Handling**
  - Permission denied handling
  - GPS unavailable fallback
  - Timeout management
  - User-friendly error messages

## Data Structure

### GPS Point
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

## Configuration

### Location Recorder Settings

```typescript
const config = {
  updateInterval: 3000,      // 3 seconds between updates
  highAccuracy: true,        // Use GPS for high accuracy
  maximumAge: 5000,          // Max age of cached position (ms)
  timeout: 10000,            // Timeout for position request (ms)
  minAccuracy: 50,           // Minimum accuracy threshold (meters)
};
```

### Customization

You can adjust these settings in `locationRecorder.ts`:

```typescript
export const locationRecorder = new LocationRecorder({
  updateInterval: 5000,      // Update every 5 seconds
  highAccuracy: false,       // Use network-based location (battery saving)
  minAccuracy: 100,          // Accept lower accuracy readings
});
```

## Usage

### Basic Integration

The Trip Recorder is already integrated into the `MainApp` component:

```tsx
<TripRecorder
  onTripComplete={(trip: Trip) => {
    console.log('Trip completed:', trip);
    // Handle completed trip
  }}
  onRecordingStateChange={(isRecording: boolean) => {
    console.log('Recording state:', isRecording);
    // Handle recording state changes
  }}
/>
```

### Programmatic Control

```typescript
import { locationRecorder } from '../utils/locationRecorder';

// Start recording
await locationRecorder.startRecording('My Trip');

// Get current state
const state = locationRecorder.getState();
console.log(state.pointsRecorded);

// Stop recording
const trip = await locationRecorder.stopRecording();
```

### Accessing Trip Data

```typescript
import { tripDB } from '../utils/indexedDB';

// Get all trips
const trips = await tripDB.getAllTrips();

// Get specific trip
const trip = await tripDB.getTrip(tripId);

// Get active trip
const activeTrip = await tripDB.getActiveTrip();

// Delete trip
await tripDB.deleteTrip(tripId);
```

## UI Features

### Compact Mode
- Minimal floating widget in bottom-right corner
- Shows recording status with color-coded indicator
- Displays point count during recording
- Click to expand

### Expanded Mode
- **Start Section**: Trip name input and start button
- **Recording Section**: 
  - Real-time statistics (duration, points, accuracy, speed)
  - Last GPS coordinates and timestamp
  - Pause/Resume and Stop controls
- **Error Section**: User-friendly error messages with retry option

### Status Indicators
- 🟢 **Green**: Recording active
- 🟠 **Orange**: Paused
- 🔴 **Red**: Error
- 🔵 **Blue**: Ready/Idle

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge (v50+)
- ✅ Firefox (v55+)
- ✅ Safari (v11+)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Required APIs
- `navigator.geolocation.watchPosition()`
- `IndexedDB`
- `Promise` support

## Performance Considerations

### Battery Life
- Default 3-second update interval balances accuracy and battery
- High accuracy mode uses GPS (more battery drain)
- Consider using network-based location for longer trips

### Storage
- Each GPS point: ~200 bytes
- 1-hour trip (1200 points): ~240 KB
- IndexedDB limit: Typically 50-100 MB per origin

### Optimization Tips
1. Increase `updateInterval` for longer trips (e.g., 5-10 seconds)
2. Set `highAccuracy: false` for battery saving
3. Increase `minAccuracy` threshold to filter more points
4. Periodically export and delete old trips

## Security & Privacy

### Permissions
- Requires user permission for geolocation access
- Permission prompt shown on first use
- Can be revoked in browser settings

### Data Storage
- All data stored locally in browser (IndexedDB)
- No automatic server uploads
- User has full control over data

### Best Practices
- Always inform users before starting recording
- Provide clear indication when recording is active
- Allow users to delete their trip data
- Consider implementing data export for user backup

## Testing

### Manual Testing Checklist
- [ ] Start recording with custom name
- [ ] Start recording with auto-generated name
- [ ] Pause and resume recording
- [ ] Stop recording and verify data saved
- [ ] Test with location permission denied
- [ ] Test with GPS disabled
- [ ] Test page refresh during recording
- [ ] Test on mobile device
- [ ] Verify battery usage over 30 minutes

### Simulating GPS Movement
For development/testing, you can use browser DevTools:
1. Open Chrome DevTools
2. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
3. Type "Sensors" and select "Show Sensors"
4. Use "Location" override to simulate movement

## Next Steps (Future Phases)

### Phase 2: Trip Session Management
- Trip list view
- Rename trips
- Delete trips
- Trip metadata (distance, duration)

### Phase 3: Route Visualization
- Display trip route on map
- Color-coded polylines
- Start/End markers
- Fit bounds to route

### Phase 4: Replay Animation
- Animate marker along route
- Adjustable playback speed
- Progress indicator

### Phase 5: Playback Controls
- Play/Pause/Restart
- Speed controls (1x, 2x, 4x)
- Timeline scrubbing

### Phase 6: Trip Analytics
- Total distance calculation
- Average speed
- Fuel cost estimation
- Elevation profile

### Phase 7: Optimization & Polish
- Route simplification
- Performance optimization
- Export to GeoJSON/GPX
- Sharing functionality

## Troubleshooting

### Common Issues

**Issue**: "Location permission denied"
- **Solution**: Grant location permission in browser settings
- Chrome: Settings → Privacy → Site Settings → Location

**Issue**: "Location information unavailable"
- **Solution**: Enable GPS/location services on device
- Check if GPS is enabled in system settings

**Issue**: "Location request timed out"
- **Solution**: 
  - Move to area with better GPS signal
  - Increase `timeout` configuration
  - Try network-based location (`highAccuracy: false`)

**Issue**: Recording stops after page refresh
- **Solution**: This is expected behavior. Trip data is saved, but recording stops. User must manually restart.

**Issue**: Low accuracy readings
- **Solution**:
  - Move to open area (away from buildings)
  - Enable high accuracy mode
  - Wait for GPS to acquire satellites

## API Reference

### LocationRecorder

#### Methods
- `startRecording(tripName?: string): Promise<boolean>`
- `stopRecording(): Promise<Trip | null>`
- `pauseRecording(): void`
- `resumeRecording(): void`
- `getState(): RecorderState`
- `subscribe(listener: (state: RecorderState) => void): () => void`
- `isSupported(): boolean`
- `requestPermission(): Promise<boolean>`

### TripDB

#### Methods
- `createTrip(name?: string): Promise<Trip>`
- `getTrip(id: string): Promise<Trip | null>`
- `getAllTrips(): Promise<Trip[]>`
- `getActiveTrip(): Promise<Trip | null>`
- `addGPSPoint(tripId: string, point: GPSPoint): Promise<void>`
- `endTrip(tripId: string): Promise<void>`
- `deleteTrip(tripId: string): Promise<void>`
- `updateTripName(tripId: string, name: string): Promise<void>`
- `clearAllTrips(): Promise<void>`

## Contributing

When extending this feature:
1. Maintain backward compatibility with existing trip data
2. Follow the established TypeScript patterns
3. Update this documentation
4. Add appropriate error handling
5. Test on multiple devices/browsers

## License

Part of the Fuel Finder project. See main project LICENSE file.

## Credits

Developed as part of the BSCS thesis project:
**"Fuel Finder: An Online Fuel Station Locator and Navigation Web-App using OSRM A*-based Routing and OpenStreetMap"**

Location: Oriental Mindoro, Philippines
