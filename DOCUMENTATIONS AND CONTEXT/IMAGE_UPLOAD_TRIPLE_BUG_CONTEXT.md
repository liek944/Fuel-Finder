# Image Upload Triple Bug - Investigation & Context

## Current Status: FIXED ✅

### What We've Done
✅ PM2 configured to run **single instance** (fork mode)  
✅ Request deduplication middleware added (backend)  
✅ PNG files now convert to JPEG properly  
✅ Logs show **only 1 upload sequence**  
✅ Database cleanup shows **no duplicates**  
✅ **Frontend upload guard added** - Prevents multiple simultaneous uploads

### Root Cause Found
**Frontend was making multiple API calls** due to React re-renders or multiple event triggers.

### Solution Applied
Added upload state check in `AdminPortal.tsx`:
- Line 690-693: Prevents duplicate uploads for existing stations
- Line 859: Prevents duplicate uploads for new stations/POIs

## Possible Root Causes

### 1. Frontend Making 3 Separate Requests
The frontend might be calling the upload API 3 times independently.

**Check**: `frontend/src/components/AdminPortal.tsx` line 695-699
```typescript
const imageRes = await apiPostBase64Images(
  `/api/stations/${stationId}/images`,
  images,
  adminApiKey.trim(),
);
```

**Look for**:
- Multiple event handlers attached
- React re-renders triggering multiple uploads
- Button click handler called multiple times

### 2. Browser/Network Retries
Browser might be retrying the request 3 times due to:
- Slow response time
- Network timeout
- CORS preflight issues

### 3. Load Balancer/Nginx Upstream
AWS load balancer or nginx might have:
- 3 upstream servers configured
- Retry logic set to 2 retries
- Round-robin to multiple backends

### 4. Supabase Storage Issue
Images might be uploaded once to DB but 3 times to Supabase Storage.

### 5. Image Carousel/Display Bug
The upload is working correctly, but the UI is displaying the same image 3 times.

## Diagnostic Steps

### Step 1: Check Database Directly
```sql
-- Connect to Supabase dashboard or use psql
SELECT 
  id,
  station_id,
  filename,
  original_filename,
  created_at
FROM images
WHERE station_id = 25  -- Replace with your test station ID
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: 1 row per upload  
**If 3 rows**: Backend is being called 3 times (deduplication not working)  
**If 1 row**: Frontend display issue

### Step 2: Check Supabase Storage
Go to: Supabase Dashboard → Storage → station-images → stations/

**Count files**: Should match database row count

### Step 3: Monitor Network Requests
1. Open browser DevTools (F12)
2. Go to Network tab
3. Upload 1 image
4. Filter by: `stations/*/images`
5. **Count POST requests**

**Expected**: 1 POST request  
**If 3 POST requests**: Frontend issue  
**If 1 POST request**: Backend/display issue

### Step 4: Check PM2 Instances Again
```bash
pm2 list
# Must show: 1 instance, mode: fork

# Check for multiple PM2 daemons
ps aux | grep PM2
# Should show only 1 PM2 daemon

# Check if multiple node processes
ps aux | grep "node.*server.js"
# Should show only 1 process
```

### Step 5: Add Request ID Logging
Add to `server.js` line ~1140 (in image upload endpoint):

```javascript
const requestId = require('crypto').randomBytes(8).toString('hex');
console.log(`🆔 Request ID: ${requestId} - Starting image upload`);
// ... existing code ...
console.log(`🆔 Request ID: ${requestId} - Upload complete`);
```

Then check if same request ID appears 3 times or 3 different IDs.

## Quick Tests

### Test A: Upload via curl (bypass frontend)
```bash
# Create test image base64
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" > test.b64

# Upload
curl -X POST http://your-backend-url/api/stations/25/images \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"images":[{"filename":"test.jpg","base64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","mimeType":"image/jpeg"}]}'

# Check database immediately
# Should create only 1 image
```

**If 1 image**: Frontend is the problem  
**If 3 images**: Backend/infrastructure is the problem

### Test B: Check React StrictMode
React StrictMode in development causes double-renders.

Check `frontend/src/index.tsx` or `frontend/src/main.tsx`:
```typescript
// If you see this:
<React.StrictMode>
  <App />
</React.StrictMode>

// Try removing StrictMode temporarily for testing
```

### Test C: Disable Deduplication Temporarily
Comment out deduplication in `server.js` line 1140:
```javascript
// app.post("/api/stations/:id/images", requestDeduplication, rateLimit, async (req, res) => {
app.post("/api/stations/:id/images", rateLimit, async (req, res) => {
```

Restart PM2 and test. If still 3 uploads, deduplication wasn't the issue.

## Files to Check

### Backend
- `backend/server.js` - Lines 1140-1182 (station image upload endpoint)
- `backend/services/imageService.js` - Lines 456-553 (uploadBase64Images function)
- `backend/ecosystem.config.js` - Verify instances: 1

### Frontend
- `frontend/src/components/AdminPortal.tsx` - Lines 680-742 (uploadStationImages function)
- `frontend/src/utils/api.ts` - Lines 166-174 (apiPostBase64Images function)
- Check for multiple event listeners or React effects

### Infrastructure
- Check AWS Load Balancer settings
- Check nginx config (if using)
- Check PM2 process count

## Next Steps Priority

1. **Check browser Network tab** - Count POST requests
2. **Query database directly** - Count actual rows
3. **Add request ID logging** - Track individual requests
4. **Test with curl** - Bypass frontend completely
5. **Check for React StrictMode** - Common cause of double-calls

## Temporary Workaround

If you need to continue working while debugging:

### Option 1: Add Unique Constraint
```sql
-- Prevent duplicate filenames per station
CREATE UNIQUE INDEX idx_unique_station_image 
ON images(station_id, filename)
ON CONFLICT DO NOTHING;
```

### Option 2: Frontend Debounce
Add debounce to upload button:
```typescript
const [uploading, setUploading] = useState(false);

const uploadStationImages = async (stationId: number) => {
  if (uploading) return; // Prevent multiple clicks
  setUploading(true);
  try {
    // ... upload code ...
  } finally {
    setUploading(false);
  }
};
```

## Expected Behavior

### Correct Flow
```
User clicks upload
→ Frontend sends 1 POST request
→ Backend receives 1 request
→ Deduplication allows it through
→ 1 image saved to database
→ 1 file uploaded to Supabase
→ User sees 1 image
```

### Current Flow (Bug)
```
User clicks upload
→ ??? (Unknown - need to investigate)
→ 3 images appear
```

## Contact Points for Investigation

1. **Browser DevTools Network Tab** - Shows actual HTTP requests
2. **PM2 Logs** - Shows backend processing
3. **Database Query** - Shows actual data
4. **Supabase Dashboard** - Shows storage files

## Key Questions to Answer

1. How many POST requests does the browser send? (Check Network tab)
2. How many rows are in the database? (Query directly)
3. How many files are in Supabase Storage? (Check dashboard)
4. Is PM2 running 1 or multiple instances? (pm2 list)
5. Are there multiple node processes? (ps aux | grep node)

## Debugging Commands

```bash
# Check PM2
pm2 list
pm2 logs fuel-finder --lines 100

# Check processes
ps aux | grep node
ps aux | grep PM2

# Check network
netstat -tlnp | grep 3001

# Test upload
curl -X POST http://localhost:3001/api/stations/25/images \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"images":[...]}'

# Monitor logs during upload
pm2 logs fuel-finder --lines 0
# Then upload and watch
```

## Last Resort: Nuclear Option

If nothing works, add this to the upload endpoint (line ~1160 in server.js):

```javascript
// TEMPORARY: Force single upload per station per 10 seconds
const uploadLocks = new Map();
const stationKey = `station_${stationId}`;

if (uploadLocks.has(stationKey)) {
  return res.status(429).json({
    error: "Upload in progress",
    message: "Please wait before uploading again"
  });
}

uploadLocks.set(stationKey, true);
setTimeout(() => uploadLocks.delete(stationKey), 10000);
```

---

**Status**: 🔴 Bug still present, investigation needed  
**Priority**: Check browser Network tab first  
**Most Likely Cause**: Frontend making 3 separate API calls
