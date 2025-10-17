# User Analytics Feature

## Overview

The User Analytics feature provides real-time visibility into active users of the Fuel Finder application through the admin dashboard. This lightweight tracking system uses **in-memory storage** to minimize server overhead and database load while providing valuable insights about user activity.

## Key Features

✅ **Real-time active user tracking**  
✅ **Zero database writes** - All tracking data is stored in memory  
✅ **Privacy-focused** - Only stores generalized location data (city-level, ~10km precision)  
✅ **Automatic session cleanup** - Sessions expire after 5 minutes of inactivity  
✅ **Comprehensive statistics** - Device types, locations, feature usage, page views  
✅ **Auto-refresh dashboard** - Updates every 10 seconds  
✅ **Minimal performance impact** - Lightweight heartbeat pings every 60 seconds  

---

## Architecture

### Backend Components

#### 1. **User Activity Tracker Service** (`backend/services/userActivityTracker.js`)

A singleton service that manages user session tracking using an in-memory Map structure.

**Key Features:**
- Tracks anonymous sessions via generated session IDs
- Stores sanitized user data (device type, approximate location, page views)
- Auto-expires inactive sessions after 5 minutes
- Provides statistics and active user lists
- Runs automatic cleanup every 60 seconds

**Data Structure:**
```javascript
Map<sessionId, {
  sessionId: string,
  firstSeen: timestamp,
  lastSeen: timestamp,
  location: { lat, lng, city, region }, // Generalized to ~10km precision
  userAgent: 'Mobile' | 'Desktop' | 'Tablet' | 'Unknown',
  pageViews: number,
  currentPage: string,
  features: { [featureName]: usageCount }
}>
```

**Configuration:**
- `SESSION_TIMEOUT_MS`: 5 minutes (300,000ms)
- `CLEANUP_INTERVAL_MS`: 1 minute (60,000ms)
- `CACHE_TTL_MS`: 10 seconds (stats cache duration)

#### 2. **API Endpoints** (added to `backend/server.js`)

##### Public Endpoints

**POST `/api/user/heartbeat`**
- Records user activity
- **No authentication required** (public endpoint)
- Body: `{ sessionId, location?, page?, feature? }`
- Response: `{ success: true, activeUsers: number }`

**GET `/api/users/count`**
- Returns current active user count
- **No authentication required**
- Response: `{ success: true, activeUsers: number }`

##### Admin Endpoints (Protected by API Key)

**GET `/api/admin/users/stats`**
- Returns comprehensive statistics
- **Requires `x-api-key` header**
- Response: Detailed statistics including device breakdown, locations, feature usage, sessions

**GET `/api/admin/users/active`**
- Returns list of active users with details
- **Requires `x-api-key` header**
- Response: Array of active user sessions

---

### Frontend Components

#### 1. **User Tracking Utility** (`frontend/src/utils/userTracking.ts`)

A TypeScript class that manages client-side tracking.

**Key Features:**
- Generates and persists session ID in localStorage
- Sends heartbeat every 60 seconds
- Tracks page changes and feature usage
- Handles visibility changes (when user returns to tab)
- Automatically starts/stops with component lifecycle

**Usage in Components:**
```typescript
import userTracking from '../utils/userTracking';

// Start tracking when component mounts
useEffect(() => {
  userTracking.startTracking('main');
  return () => userTracking.stopTracking();
}, []);

// Track feature usage
userTracking.trackFeature('route-navigation');

// Update current page
userTracking.setPage('trip-history');
```

> Implementation note: When calling the heartbeat API from the frontend, use the API helper with the full path:
>
> ```typescript
> fetch(getApiUrl('/api/user/heartbeat'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, location, page, feature }) });
> ```

#### 2. **User Analytics Dashboard** (`frontend/src/components/UserAnalytics.tsx`)

A React component that displays user analytics in the admin portal.

**Features:**
- Real-time statistics display
- Auto-refresh every 10 seconds (toggleable)
- Device breakdown charts
- Location breakdown (by region)
- Feature usage tracking
- Page view distribution
- Recent sessions table
- Session duration statistics

**Displays:**
- 📊 Active Users count
- ⏱️ Average session duration
- 🏆 Longest session
- 📱 Device breakdown (Mobile/Desktop/Tablet)
- 📍 Location breakdown (by region)
- 📄 Current pages distribution
- ✨ Feature usage statistics
- 🕐 Recent sessions table with details

---

## How It Works

### User Side (MainApp)

1. **Session Initialization:**
   - When MainApp mounts, a unique session ID is generated or retrieved from localStorage
   - The session ID persists across page reloads but is unique per browser

2. **Heartbeat Pings:**
   - Every 60 seconds, the client sends a heartbeat ping to `/api/user/heartbeat`
   - Heartbeat includes: session ID, approximate location (if available), current page
   - Also sends when page visibility changes (user returns to tab)

3. **Feature Tracking:**
   - When users interact with features (routing, trip recording, etc.), the tracker records it
   - Feature usage is aggregated in the backend

### Admin Side (AdminPortal)

1. **Access Analytics:**
   - Navigate to Admin Portal → Click "👥 User Analytics" button
   - View real-time statistics and active users

2. **Auto-Refresh:**
   - Dashboard automatically refreshes every 10 seconds
   - Can be toggled off using the checkbox
   - Manual refresh button available

3. **View Details:**
   - See active user count and device distribution
   - Monitor which pages users are currently on
   - Track feature usage patterns
   - View location breakdown (by region)
   - See recent session details

---

## Privacy Considerations

### Data Privacy Measures

1. **Anonymized Sessions:**
   - No personal information is collected
   - Sessions are tracked via generated IDs, not user accounts
   - Session IDs are partially masked in admin view (e.g., `session_abc...`)

2. **Location Privacy:**
   - GPS coordinates are rounded to 1 decimal place (~10km precision)
   - Only city/region information is stored
   - Exact user locations are never stored or transmitted

3. **No Persistent Storage:**
   - All data is in-memory only
   - No database writes for tracking
   - Data is lost on server restart (by design)

4. **Automatic Expiry:**
   - Sessions expire after 5 minutes of inactivity
   - Old data is automatically cleaned up

5. **User Consent:**
   - Consider adding a privacy notice in your app
   - Users can disable geolocation in their browser
   - Tracking continues to work without location data

---

## Performance Impact

### Backend

**Memory Usage:**
- ~1 KB per active session
- For 100 concurrent users: ~100 KB
- For 1,000 concurrent users: ~1 MB
- Negligible impact on server memory

**CPU Usage:**
- Cleanup runs every 60 seconds (lightweight iteration)
- Statistics calculation cached for 10 seconds
- Minimal CPU overhead

**Network:**
- Each heartbeat: ~200 bytes
- Per user per hour: ~12 KB (60 heartbeats × 200 bytes)
- For 100 users: ~1.2 MB/hour

### Frontend

**Network Usage:**
- Heartbeat every 60 seconds
- ~200 bytes per heartbeat
- Negligible bandwidth impact

**Client Performance:**
- Minimal JavaScript execution
- No UI blocking operations
- Geolocation API called once (cached for 5 minutes)

---

## Configuration

### Backend Configuration

Edit `backend/services/userActivityTracker.js`:

```javascript
// Session timeout (default: 5 minutes)
this.SESSION_TIMEOUT_MS = 5 * 60 * 1000;

// Cleanup interval (default: 1 minute)
this.CLEANUP_INTERVAL_MS = 60 * 1000;

// Stats cache TTL (default: 10 seconds)
this.statsCache.CACHE_TTL_MS = 10 * 1000;
```

### Frontend Configuration

Edit `frontend/src/utils/userTracking.ts`:

```typescript
// Heartbeat interval (default: 60 seconds)
private heartbeatIntervalMs: number = 60000;

// Geolocation cache (default: 5 minutes)
maximumAge: 300000
```

---

## Usage Examples

### Accessing the Dashboard

1. Open Admin Portal
2. Enter your admin API key
3. Click "👥 User Analytics" in the navigation
4. View real-time statistics

### Reading Statistics

**Active Users Overview:**
- See total active users
- View average session duration
- Check longest active session

**Device Distribution:**
- Monitor mobile vs desktop usage
- Identify most common device types

**Location Insights:**
- See which regions users are from
- Identify geographic distribution

**Feature Usage:**
- Track which features are most used
- Identify user behavior patterns

**Page Distribution:**
- See which pages users are currently viewing
- Monitor user flow through the app

---

## API Endpoints Reference

### POST `/api/user/heartbeat`

**Description:** Record user activity heartbeat

**Authentication:** None (public)

**Request Body:**
```json
{
  "sessionId": "session_abc123...",
  "location": {
    "lat": 12.6,
    "lng": 121.5,
    "city": "Roxas",
    "region": "Oriental Mindoro"
  },
  "page": "main",
  "feature": "route-navigation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Activity recorded",
  "activeUsers": 42
}
```

### GET `/api/admin/users/stats`

**Description:** Get comprehensive user statistics

**Authentication:** Required (`x-api-key` header)

**Response:**
```json
{
  "success": true,
  "stats": {
    "activeUsers": 42,
    "timestamp": 1697548200000,
    "deviceBreakdown": {
      "Mobile": 30,
      "Desktop": 10,
      "Tablet": 2
    },
    "locationBreakdown": {
      "Oriental Mindoro": 35,
      "Unknown": 7
    },
    "featureUsage": {
      "route-navigation": 120,
      "trip-recording": 45
    },
    "pageBreakdown": {
      "main": 38,
      "trip-history": 4
    },
    "sessionStats": {
      "averageDurationMinutes": 12,
      "longestSessionMinutes": 45
    },
    "recentSessions": [...]
  }
}
```

### GET `/api/admin/users/active`

**Description:** Get list of active users

**Authentication:** Required (`x-api-key` header)

**Response:**
```json
{
  "success": true,
  "count": 42,
  "users": [
    {
      "sessionId": "session_abc...",
      "device": "Mobile",
      "location": {
        "lat": 12.6,
        "lng": 121.5,
        "display": "Roxas, Oriental Mindoro"
      },
      "duration": 12,
      "pageViews": 5,
      "currentPage": "main",
      "lastActive": "2024-10-17T08:30:00.000Z"
    }
  ]
}
```

### GET `/api/users/count`

**Description:** Get active user count (lightweight)

**Authentication:** None (public)

**Response:**
```json
{
  "success": true,
  "activeUsers": 42
}
```

---

## Troubleshooting

### No Users Showing in Dashboard

**Possible Causes:**
1. Users haven't visited the app recently (sessions expire after 5 minutes)
2. Frontend tracking not initialized properly
3. Backend service not running

**Solutions:**
1. Open the main app in a browser window
2. Check browser console for tracking errors
3. Verify backend server is running and accessible
4. Check network tab for heartbeat requests

### Statistics Not Updating

**Possible Causes:**
1. Auto-refresh disabled
2. API key invalid
3. Backend cache not clearing

**Solutions:**
1. Enable auto-refresh checkbox
2. Click manual refresh button
3. Verify admin API key is correct
4. Check browser console for errors

### High Memory Usage

**Possible Causes:**
1. Very high number of concurrent users
2. Sessions not expiring properly

**Solutions:**
1. Monitor active user count
2. Restart backend server to clear memory
3. Adjust `SESSION_TIMEOUT_MS` to expire sessions faster

---

## Future Enhancements

Potential improvements for future versions:

1. **Persistent Analytics:**
   - Store aggregated statistics in database
   - Historical trends and charts
   - User retention metrics

2. **Advanced Insights:**
   - User journey mapping
   - Conversion funnel analysis
   - Feature adoption rates

3. **Alerts:**
   - Notify admin when user count spikes
   - Alert on unusual activity patterns

4. **Export:**
   - Download analytics reports
   - CSV/JSON export options

5. **Visualization:**
   - Real-time map showing active users
   - Interactive charts and graphs
   - Heatmaps of feature usage

---

## Summary

The User Analytics feature provides a **lightweight, privacy-focused, real-time** view of active users in the Fuel Finder application. It achieves this without impacting database performance by using in-memory storage, while respecting user privacy through data anonymization and generalization.

**Key Benefits:**
- ✅ Real-time visibility into active users
- ✅ No database overhead
- ✅ Privacy-friendly design
- ✅ Minimal performance impact
- ✅ Easy to access via admin dashboard

**Files Modified/Created:**
- Backend: `services/userActivityTracker.js`, `server.js`
- Frontend: `utils/userTracking.ts`, `components/UserAnalytics.tsx`, `components/AdminPortal.tsx`, `components/MainApp.tsx`
