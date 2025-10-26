# Auto-Refresh Timer Feature

## Overview

Implemented automatic periodic data refresh for the Fuel Finder map to ensure users always see the latest fuel prices and station information without manual page refresh.

## Feature Details

### Functionality
- **Auto-refresh interval:** 60 seconds (configurable)
- **Default state:** Enabled by default
- **Scope:** Refreshes both stations and POIs data
- **Silent operation:** Updates happen in background without loading indicators
- **User control:** Toggle button to enable/disable

### User Interface

**Auto-Refresh Control Panel:**
```
┌─────────────────────────────────┐
│ 🔄 Auto-refresh        [ON/OFF] │
│ Updates every 60s               │
│ Last: just now                  │
└─────────────────────────────────┐
```

**Visual States:**

**Enabled (Green):**
- Background: Light green (#e8f5e9)
- Border: Green (#4CAF50)
- Button: Green with "ON"
- Shows: Update interval and last refresh time

**Disabled (Gray):**
- Background: Light gray (#fafafa)
- Border: Gray (#ddd)
- Button: Gray with "OFF"
- Shows: "Enable to auto-update prices"

### Location in UI
- Positioned in search/filter panel
- Below results summary (stations/POIs count)
- Above "Route To Nearest POI" section
- Collapses with search panel

## Implementation Details

### State Variables (MainApp.tsx)

```typescript
// Auto-refresh states
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
const [lastDataRefresh, setLastDataRefresh] = useState<number>(Date.now());
const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds
```

### Auto-Refresh Effect Hook

```typescript
useEffect(() => {
  if (!autoRefreshEnabled || !position) return;

  const refreshData = async () => {
    try {
      // Fetch stations
      const stationsUrl = getApiUrl(
        `/api/stations/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}`,
      );
      const stationsResponse = await fetch(stationsUrl);
      const stationsData = await stationsResponse.json();
      setStations(Array.isArray(stationsData) ? stationsData : []);

      // Fetch POIs
      const poisUrl = getApiUrl(
        `/api/pois/nearby?lat=${position[0]}&lng=${position[1]}&radiusMeters=${radiusMeters}`,
      );
      const poisResponse = await fetch(poisUrl);
      const poisData = await poisResponse.json();
      setPois(Array.isArray(poisData) ? poisData : []);

      // Update last refresh timestamp
      setLastDataRefresh(Date.now());
      
      console.log("🔄 Auto-refresh: Data updated");
    } catch (error) {
      console.error("Auto-refresh failed:", error);
    }
  };

  // Set up interval for auto-refresh
  const intervalId = setInterval(refreshData, AUTO_REFRESH_INTERVAL);

  // Cleanup interval on unmount or when dependencies change
  return () => {
    clearInterval(intervalId);
  };
}, [autoRefreshEnabled, position, radiusMeters, AUTO_REFRESH_INTERVAL]);
```

### Time Display Helper

Uses existing `getTimeAgo()` function to show human-readable time:
- "just now" (< 10 seconds)
- "30s ago" (< 60 seconds)
- "2m ago" (< 60 minutes)
- "1h ago" (>= 60 minutes)

## Use Cases

### 1. Owner Updates Price
```
Owner verifies price report (iFuel Dangay)
       ↓
Database updated with new price
       ↓
Auto-refresh fetches updated data (60s max)
       ↓
User sees updated price on map with "(verified by owner)" label
```

### 2. Multiple Users Reporting
```
User A reports diesel price at 10:00 AM
       ↓
Admin verifies at 10:01 AM
       ↓
User B viewing map gets update at 10:02 AM (next auto-refresh)
       ↓
Shows "(community)" label with new price
```

### 3. Real-time Price Monitoring
```
User keeps map open while driving
       ↓
Auto-refresh every 60s ensures latest prices
       ↓
Can make informed decisions about where to refuel
```

### 4. Battery Conservation
```
User wants to save battery/data
       ↓
Disables auto-refresh
       ↓
Can manually refresh by changing radius or brand filter
```

## Benefits

### For Users
1. **Always current data** - No need to manually refresh page
2. **Seamless experience** - Updates happen in background
3. **Real-time prices** - See owner/community updates quickly
4. **User control** - Can disable to save battery/data

### For Station Owners
1. **Immediate feedback** - Price updates visible to users within 60s
2. **Encourages participation** - Owners see their verification work
3. **Trust building** - Users see official owner prices quickly

### For System
1. **Load distribution** - Spreads API calls over time (not on page load only)
2. **Better UX** - Users don't leave stale tabs open
3. **Analytics** - Can track active user engagement

## Performance Considerations

### Network Impact
- **Request frequency:** 1 request per 60 seconds per active user
- **Data size:** ~50 stations + POIs per request (~50KB)
- **Monthly bandwidth:** ~2MB per active user per hour

### Battery Impact
- **Minimal:** 1 background fetch every minute
- **User control:** Can disable if concerned
- **Smart:** Only fetches when position is available

### Server Load
- **Distributed:** Not synchronized across users
- **Existing infrastructure:** Uses same endpoints as manual refresh
- **Scalable:** No additional server complexity

## Configuration

### Adjust Refresh Interval

To change from 60 seconds:

```typescript
// frontend/src/components/MainApp.tsx
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
// or
const AUTO_REFRESH_INTERVAL = 120000; // 2 minutes
```

### Change Default State

To disable by default:

```typescript
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(false);
```

### Customize UI Text

```typescript
// Update interval display
Updates every {AUTO_REFRESH_INTERVAL / 1000}s

// Disabled message
"Enable to auto-update prices"
```

## Files Modified

### frontend/src/components/MainApp.tsx

**Changes:**
1. Added state variables (lines 759-762):
   - `autoRefreshEnabled`
   - `lastDataRefresh`
   - `AUTO_REFRESH_INTERVAL`

2. Added auto-refresh effect hook (lines 903-941):
   - Periodic data fetching
   - Error handling
   - Cleanup on unmount

3. Added UI control (lines 1684-1732):
   - Toggle button
   - Status display
   - Last refresh time

## Testing

### Test Auto-Refresh
1. Open MainApp in browser
2. Open browser console
3. Wait 60 seconds
4. Should see: "🔄 Auto-refresh: Data updated"
5. Check "Last refresh" time updates

### Test Toggle
1. Click "OFF" button → Auto-refresh stops
2. Console messages stop appearing
3. Click "ON" button → Auto-refresh resumes
4. Console messages resume every 60s

### Test Price Update Flow
1. Submit price report via MainApp
2. Verify price via Owner Dashboard
3. Wait max 60 seconds on MainApp
4. Price should update with "(verified by owner)" label

### Test Network Error Handling
1. Disable internet connection
2. Wait for auto-refresh
3. Check console: "Auto-refresh failed: [error]"
4. Re-enable internet → Auto-refresh resumes

## Future Enhancements

### Possible Improvements
1. **Configurable interval** - Let users choose 30s/60s/120s
2. **Smart refresh** - Only refresh if tab is active (Page Visibility API)
3. **Differential updates** - Only fetch changed stations
4. **WebSocket integration** - Real-time push instead of polling
5. **Refresh animation** - Visual feedback when updating
6. **Offline detection** - Pause when offline, resume when online
7. **Refresh on focus** - Immediate refresh when user returns to tab

### Analytics Tracking
```typescript
// Track auto-refresh usage
userTracking.trackEvent('auto_refresh_toggle', {
  enabled: autoRefreshEnabled,
  interval: AUTO_REFRESH_INTERVAL
});
```

### Advanced Features
- **Adaptive interval:** Longer when no activity, shorter when active
- **Price change notifications:** Alert user when nearby prices drop
- **Background sync:** Use Service Worker for offline-first approach

## Deployment

**Frontend only (no backend changes needed):**

```bash
cd /home/keil/fuel_finder/frontend
npm run build
# Deploy to Netlify
```

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (iOS 12+)
- ✅ Mobile browsers

**Requirements:**
- `setInterval()` support (all modern browsers)
- `fetch()` API (all modern browsers)
- React hooks (React 16.8+)

## Memory Management

**Cleanup handled automatically:**
```typescript
return () => {
  clearInterval(intervalId);
};
```

**Lifecycle:**
- Timer starts: When component mounts + auto-refresh enabled
- Timer stops: When component unmounts OR auto-refresh disabled OR position lost
- Memory leak: None (proper cleanup in effect dependencies)

## Troubleshooting

### Auto-refresh not working
- Check if toggle is "ON"
- Check if user position is available
- Check browser console for errors
- Verify network connectivity

### Refresh happening too often
- Verify `AUTO_REFRESH_INTERVAL` value
- Check for multiple intervals running (shouldn't happen)

### Price updates not appearing
- Wait full 60 seconds for next refresh
- Check if verification actually updated database
- Verify API is returning updated data
- Check browser cache (hard refresh)

## Related Features

- **Price Verification:** Backend updates covered in `PRICE_VERIFICATION_FIX.md`
- **Owner Labels:** Owner vs community labels in `OWNER_VERIFIED_LABELS.md`
- **User Tracking:** Activity tracking in user tracking system
