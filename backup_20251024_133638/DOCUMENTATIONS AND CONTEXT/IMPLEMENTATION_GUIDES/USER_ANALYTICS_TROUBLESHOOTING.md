# User Analytics Troubleshooting Guide

## Quick Answer

**Q: Does the dashboard auto-refresh?**  
✅ **YES** - The dashboard automatically refreshes every 10 seconds when "Auto-refresh" is enabled (checked by default).

**Q: Do I need to manually refresh the page?**  
❌ **NO** - The dashboard updates automatically. You should see the "Last updated" timestamp changing every 10 seconds.

---

## How It Works

### User Side (Main App)
1. When a user opens the Fuel Finder app, tracking starts automatically
2. **First heartbeat** sent immediately
3. **Subsequent heartbeats** sent every 60 seconds
4. User appears as "active" for 5 minutes after last heartbeat

### Admin Side (Dashboard)
1. Dashboard fetches stats every 10 seconds automatically
2. Shows users active in the last 5 minutes
3. Updates without page refresh

---

## Debugging Steps

### Step 1: Check Browser Console (Main App)

Open the main Fuel Finder app and check the browser console (F12):

**What you should see:**
```
🔄 User tracking started - Session ID: session_xxx... | Heartbeat interval: 60 seconds
📡 Sending heartbeat to: https://fuelfinder.duckdns.org/api/user/heartbeat
✅ Heartbeat successful - Active users: 1
```

**If you see errors:**
```
❌ Heartbeat failed: 404 Not Found
```
→ **Problem:** Backend endpoint not available. Check server deployment.

```
❌ Heartbeat error: TypeError: Failed to fetch
```
→ **Problem:** Network/CORS issue. Check API URL configuration.

### Step 2: Check Browser Console (Admin Dashboard)

Open the User Analytics page and check console:

**What you should see:**
```
📊 Fetching user stats with API key: Present
📊 Stats response status: 200
📊 Stats data: {success: true, stats: {...}}
👥 Fetching active users with API key: Present
👥 Active users response status: 200
👥 Active users data: {success: true, users: [...]}
```

**If you see:**
```
📊 Fetching user stats with API key: Missing
```
→ **Problem:** Admin API key not stored in localStorage. Re-login to admin panel.

```
❌ Stats fetch failed: 401
```
→ **Problem:** Invalid API key. Check your admin API key matches backend.

```
❌ Stats fetch failed: 404
```
→ **Problem:** Backend endpoints not deployed. Make sure server has latest code.

### Step 3: Verify Backend is Running

Check backend server logs for:

```
👥 User Activity Tracker initialized (in-memory)
```

And when heartbeats arrive:
```
(Should see POST requests to /api/user/heartbeat)
```

### Step 4: Test the Flow

1. **Open Main App** in one browser tab
   - Wait 5 seconds
   - Check console for "✅ Heartbeat successful"

2. **Open Admin Portal** in another tab
   - Navigate to "👥 User Analytics"
   - You should see "Active Users: 1"
   - Check "Last updated" timestamp is changing every 10 seconds

3. **Open Main App** in a different device/browser
   - Wait 60 seconds
   - Check Admin Dashboard
   - Should now show "Active Users: 2"

---

## Common Issues & Solutions

### Issue 1: No Active Users Showing

**Symptoms:**
- Dashboard shows "Active Users: 0"
- "Last updated" timestamp is changing
- No errors in console

**Causes & Solutions:**

1. **No one has opened the main app recently**
   - ✅ Solution: Open the main Fuel Finder app in another tab
   - Wait 5 seconds for first heartbeat
   - Dashboard should update within 10 seconds

2. **Sessions expired (5 minute timeout)**
   - ✅ Solution: Open main app to create new session
   - Users must have activity within last 5 minutes to appear

3. **Heartbeats are failing silently**
   - ✅ Solution: Check main app console for "❌ Heartbeat error"
   - Fix the underlying connection issue

### Issue 2: Dashboard Not Updating

**Symptoms:**
- "Last updated" timestamp not changing
- No new data appears

**Causes & Solutions:**

1. **Auto-refresh is disabled**
   - ✅ Solution: Check the "Auto-refresh (10s)" checkbox

2. **Dashboard frozen/crashed**
   - ✅ Solution: Check browser console for errors
   - Hard refresh the page (Ctrl+Shift+R)

3. **Network interruption**
   - ✅ Solution: Check browser network tab
   - Look for failed API requests

### Issue 3: 404 Errors

**Error:**
```
GET /admin/users/stats 404 (Not Found)
```

**Causes & Solutions:**

1. **Backend not deployed with latest code**
   - ✅ Solution: Redeploy backend with user tracking endpoints
   - Endpoints needed:
     - `POST /api/user/heartbeat`
     - `GET /api/admin/users/stats`
     - `GET /api/admin/users/active`

2. **Wrong API URL**
   - ✅ Solution: Check `VITE_API_BASE_URL` environment variable
   - Should point to your backend server

### Issue 4: 401 Unauthorized Errors

**Error:**
```
GET /api/admin/users/stats 401 (Unauthorized)
```

**Causes & Solutions:**

1. **API key not saved**
   - ✅ Solution: Log in to Admin Portal again
   - Enter admin API key
   - Key is stored in localStorage as `admin_api_key`

2. **API key mismatch**
   - ✅ Solution: Check backend `ADMIN_API_KEY` environment variable
   - Should match the key you're entering in admin portal

### Issue 5: Wrong User Count

**Symptoms:**
- Dashboard shows wrong number of users
- Users appear multiple times

**Causes & Solutions:**

1. **Multiple tabs/browsers per user**
   - This is normal behavior
   - Each browser tab = separate session
   - Each device = separate session

2. **Sessions not expiring**
   - ✅ Solution: Restart backend server
   - Sessions are in-memory, restart clears all

---

## Verification Checklist

Use this checklist to verify everything is working:

### Backend
- [ ] Server is running
- [ ] Console shows "👥 User Activity Tracker initialized"
- [ ] No errors on server startup
- [ ] Environment variables set correctly (`ADMIN_API_KEY`)

### Main App (User Side)
- [ ] Open main app in browser
- [ ] Open browser console (F12)
- [ ] See "🔄 User tracking started"
- [ ] See "✅ Heartbeat successful" every 60 seconds
- [ ] No "❌ Heartbeat error" messages

### Admin Dashboard
- [ ] Open Admin Portal
- [ ] Navigate to "👥 User Analytics"
- [ ] See user statistics loading
- [ ] "Last updated" timestamp changes every 10 seconds
- [ ] Active user count > 0 (if main app is open)
- [ ] No 404 or 401 errors in console

---

## Testing Scenarios

### Scenario 1: Single User
```
1. Open main app → Wait 5 seconds
2. Open admin dashboard
3. Expected: "Active Users: 1"
4. Close main app → Wait 6 minutes
5. Expected: "Active Users: 0" (session expired)
```

### Scenario 2: Multiple Users
```
1. Open main app in Browser A
2. Open main app in Browser B (or device)
3. Wait 60 seconds (for both heartbeats)
4. Open admin dashboard
5. Expected: "Active Users: 2"
6. Check device breakdown (e.g., 1 Desktop, 1 Mobile)
```

### Scenario 3: Session Expiry
```
1. Open main app → Wait 5 seconds
2. Check admin: "Active Users: 1"
3. Close main app
4. Wait 5 minutes
5. Check admin: "Active Users: 0"
```

---

## Performance Expectations

### Network Usage
- **Per user**: ~200 bytes every 60 seconds
- **100 users**: ~200 KB/hour total
- **Negligible** for most networks

### Server Resources
- **Memory**: ~1 KB per active user
- **100 users**: ~100 KB memory
- **1000 users**: ~1 MB memory
- **CPU**: Minimal (cleanup runs once per minute)

### Client Resources
- **JavaScript**: Runs in background
- **No UI blocking**
- **Minimal battery impact** (60-second intervals)

---

## Debug Commands

### Check Backend Endpoint Availability

```bash
# Test heartbeat endpoint (should return 400 if sessionId missing)
curl -X POST https://fuelfinder.duckdns.org/api/user/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test_123","page":"main"}'

# Should return: {"success": true, "activeUsers": 1}
```

### Check Admin Endpoints

```bash
# Test stats endpoint (requires API key)
curl https://fuelfinder.duckdns.org/api/admin/users/stats \
  -H "x-api-key: YOUR_API_KEY_HERE"

# Should return: {"success": true, "stats": {...}}
```

### Check localStorage

In browser console:
```javascript
// Check if admin API key is saved
localStorage.getItem('admin_api_key')

// Check if session ID exists
localStorage.getItem('fuel_finder_session_id')
```

---

## Getting Help

If you've tried all these steps and it's still not working:

1. **Collect Debug Info:**
   - Browser console logs (main app)
   - Browser console logs (admin dashboard)
   - Backend server logs
   - Network tab screenshots

2. **Check Documentation:**
   - `USER_ANALYTICS_FEATURE.md` - Full feature documentation
   - `USER_ANALYTICS_404_FIX.md` - Common 404 error fixes

3. **Verify Deployment:**
   - Frontend rebuilt with latest code
   - Backend redeployed with latest code
   - Environment variables configured

---

## Summary

**How to know it's working:**

✅ Main app console shows "✅ Heartbeat successful" every 60 seconds  
✅ Admin dashboard "Last updated" timestamp changes every 10 seconds  
✅ Active user count matches number of open main app tabs/devices  
✅ No errors in browser console  
✅ Device breakdown shows correct types (Mobile/Desktop)  

**Remember:**
- Dashboard **auto-refreshes** every 10 seconds
- Users must be active within **last 5 minutes** to appear
- First heartbeat sent **immediately**, then every 60 seconds
- Each browser tab/device = separate session
