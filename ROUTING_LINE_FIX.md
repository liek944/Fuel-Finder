# Routing Line Missing - Root Cause & Fix

## Problem
The routing feature was broken - when clicking "Route" on a station marker, it showed "ROUTING" label but **no blue line with moving arrows** appeared on the map.

## Root Cause
The `/api/route` endpoint was **missing from the modular backend architecture**.

### What Happened:
1. The backend was migrated from monolithic `server_modular.js` to modular architecture (`app.js` + routes)
2. The OSRM routing endpoint existed in `server_modular.js` but was **never migrated** to the new route structure
3. Frontend was calling `/api/route` but getting 404 errors (endpoint not found)
4. The `routeData` state was not being populated, so the `<Polyline>` components never rendered

## Solution Implemented

### 1. Created Missing Route Module
**File:** `backend/routes/routeRoutes.js`

- Complete OSRM routing implementation
- In-memory caching (5-minute TTL)
- IPv4 DNS preference for reliability
- HTTPS with HTTP fallback for OSRM
- Proper error handling and logging
- Returns route data in correct format: `{coordinates: [[lat,lng],...], distance, duration}`

### 2. Registered Route in Route Aggregator
**File:** `backend/routes/index.js`

- Added `const routeRoutes = require("./routeRoutes");`
- Registered with `router.use("/route", routeRoutes);`
- Now available at `/api/route`

### 3. Added Frontend Debug Logging
**File:** `frontend/src/components/MainApp.tsx`

Added console logging to help diagnose issues:
- `getRoute()` function now logs:
  - API URL being called
  - Route data received
  - Coordinates count
  - Sample coordinates
- New `useEffect` to log `routeData` state changes

## How It Works Now

### Backend Flow:
```
GET /api/route?start=lat,lng&end=lat,lng
  ↓
1. Validate coordinates
2. Check cache (5min TTL)
3. If not cached, call OSRM API
4. Convert coordinates from [lng,lat] to [lat,lng] (Leaflet format)
5. Return: {coordinates, distance, duration, distance_km, duration_minutes}
6. Cache result
```

### Frontend Flow:
```
User clicks "Route" button
  ↓
1. getRoute(station) called
2. Store current position as routeStartPosition
3. Fetch /api/route with user position and station coordinates
4. Set routeData state with response
5. Map renders 3 Polyline layers:
   - Shadow layer (black, opacity 0.3, weight 9)
   - Main route (blue #1976D2, opacity 0.9, weight 6)
   - Animated overlay (light blue #42A5F5, dashed, with CSS animation)
6. Auto-monitor: If user moves >100m from routeStartPosition, auto-clear route
```

### Auto-Clear Behavior (NEW):
The route line will **automatically disappear** when:
- User moves more than **100 meters** from where they started the route
- Prevents outdated/confusing navigation lines
- Console logs: "🧭 Auto-clearing route - moved Xm from original start position"

Manual clear still available via "Cancel Route" button.

### Polyline Rendering Condition:
```tsx
{routeData && 
 routeData.coordinates && 
 routeData.coordinates.length > 0 && (
  <Polyline positions={routeData.coordinates} .../>
)}
```

## Files Modified

1. ✅ `backend/routes/routeRoutes.js` - **CREATED** (OSRM routing endpoint)
2. ✅ `backend/routes/index.js` - Added route registration
3. ✅ `frontend/src/components/MainApp.tsx` - Added:
   - Debug logging for route requests
   - Auto-clear route on significant movement (>100m)
   - routeStartPosition state tracking

## Deployment

### Manual Deployment:
```bash
# 1. Restart backend
cd backend
pkill -f "node.*server"
npm start

# 2. Rebuild frontend
cd ../frontend
npm run build

# 3. Deploy frontend build to hosting (Netlify/Vercel)
```

### Or use the deployment script:
```bash
./deploy-routing-fix.sh
```

## Testing

### 1. Open Browser Console (F12)

### 2. Click "Route" button on any station marker

### 3. Expected Console Output:
```
🗺️ Fetching route from: http://localhost:5000/api/route?start=13.123,121.456&end=13.234,121.567
📍 Route data received: {coordinates: Array(145), distance: 5234, duration: 456, ...}
📍 Coordinates count: 145
📍 Sample coordinates: [[13.123, 121.456], [13.124, 121.457], [13.125, 121.458]]
🔄 RouteData state changed: {hasRouteData: true, hasCoordinates: true, coordinatesLength: 145, ...}
```

### 4. Expected Visual Result:
- **Blue line** appears on map from user location to destination
- Line has **3 layers** (shadow, main, animated)
- **Moving dashed overlay** animates along the route
- Route info shows in popup: "🛣️ Route: 5.2km, 8 min"

### 5. Test Auto-Clear Feature:
- Start a route to any station
- Walk/drive more than 100 meters away
- Console should show: "🧭 Auto-clearing route - moved [X]m from original start position"
- Route line should **automatically disappear** from the map

## Troubleshooting

### If line still doesn't appear:

1. **Check backend is running:**
   ```bash
   curl http://localhost:5000/api/route?start=13.1,121.1&end=13.2,121.2
   ```
   Should return JSON with coordinates array.

2. **Check console for errors:**
   - Look for "Failed to get route:" errors
   - Look for "Route API error:" messages
   - Verify routeData state has coordinates

3. **Check OSRM connectivity:**
   Backend logs should show:
   ```
   🗺️ OSRM routing request: 13.1,121.1 -> 13.2,121.2
   ✅ Route found: 5.2km, 8min, 145 points
   ```

4. **Verify frontend API URL:**
   Check `.env` file has correct `VITE_API_BASE_URL`

## Related Files

- `backend/server_modular.js` - Original implementation (lines 1089-1260)
- `frontend/src/styles/MainApp.css` - Route animation CSS
- `frontend/src/App.css` - Alternative route animation CSS

## Architecture Note

The routing endpoint is now properly integrated into the modular architecture:

```
app.js
  ↓
routes/index.js
  ↓
routes/routeRoutes.js (NEW)
  ↓
OSRM API (router.project-osrm.org)
```

This follows the same pattern as other route modules (stations, pois, owner, admin, user).
