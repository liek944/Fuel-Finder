# Fix Owner Portal 500 Server Errors

## Problem

Owner portal dashboard showing 500 errors:
```
Failed to load resource: the server responded with a status of 500
Failed to fetch stations: 500
Error during verify: Error: An unexpected error occurred
```

Affected endpoints:
- ❌ `GET /api/owner/stations` → 500 error
- ❌ `POST /api/owner/price-reports/:id/verify` → 500 error
- ❌ Dashboard not loading station data

## Root Cause

**PostgreSQL DISTINCT with JSONB Issue**

The `ownerController.js` had the same SQL bug that was previously fixed in `stationRepository.js`:

```sql
-- ❌ BROKEN: This causes PostgreSQL error
json_agg(DISTINCT jsonb_build_object(...))
```

PostgreSQL cannot use `DISTINCT` with complex JSONB objects in `json_agg()` without `ORDER BY`, and you can't use `ORDER BY` with `DISTINCT` on JSONB.

**Error in PostgreSQL logs:**
```
ERROR: in an aggregate with DISTINCT, ORDER BY expressions must appear in argument list
```

This was supposedly fixed in Round 3 of bug fixes, but `ownerController.js` was missed.

## Solution

Removed `DISTINCT` from all `json_agg()` calls in `ownerController.js`:

```sql
-- ✅ FIXED: Remove DISTINCT
json_agg(jsonb_build_object(...))
```

The JSONB objects are already unique based on their IDs, so `DISTINCT` is unnecessary.

## Changes Made

### File: `backend/controllers/ownerController.js`

**Fixed 4 instances:**

1. **Line 82** - `getOwnerStations()` images aggregation
2. **Line 93** - `getOwnerStations()` fuel_prices aggregation  
3. **Line 149** - `getOwnerStation()` images aggregation
4. **Line 160** - `getOwnerStation()` fuel_prices aggregation

### Before:
```javascript
COALESCE(
  json_agg(
    DISTINCT jsonb_build_object(  // ❌ DISTINCT causes error
      'id', img.id,
      'filename', img.filename,
      'display_order', img.display_order,
      'is_primary', img.is_primary
    )
  ) FILTER (WHERE img.id IS NOT NULL),
  '[]'::json
) as images
```

### After:
```javascript
COALESCE(
  json_agg(
    jsonb_build_object(  // ✅ DISTINCT removed
      'id', img.id,
      'filename', img.filename,
      'display_order', img.display_order,
      'is_primary', img.is_primary
    )
  ) FILTER (WHERE img.id IS NOT NULL),
  '[]'::json
) as images
```

## Deployment

### Option 1: Quick Deploy Script (Recommended)

```bash
./deploy-owner-500-fix.sh
```

### Option 2: Manual Deployment

#### On your local machine:
```bash
# Upload the fixed file to EC2
scp -i ~/.ssh/your-key.pem \
  backend/controllers/ownerController.js \
  ubuntu@fuelfinder.duckdns.org:/home/ubuntu/fuel_finder/backend/controllers/
```

#### On EC2 (SSH):
```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ubuntu@fuelfinder.duckdns.org

# Navigate to backend
cd /home/ubuntu/fuel_finder/backend

# Restart PM2
pm2 restart fuel-finder-api

# Check logs
pm2 logs fuel-finder-api --lines 50
```

### Option 3: Git Pull (if using Git)

```bash
# On EC2
cd /home/ubuntu/fuel_finder/backend
git pull origin main
pm2 restart fuel-finder-api
pm2 logs fuel-finder-api
```

## Testing Checklist

After deployment, test these endpoints:

### 1. Dashboard Statistics
```bash
curl -X GET "https://fuelfinder.duckdns.org/api/owner/dashboard" \
  -H "x-api-key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=" \
  -H "x-owner-domain: ifuel-dangay"
```

**Expected:** `200 OK` with dashboard stats JSON

### 2. Owner Stations List
```bash
curl -X GET "https://fuelfinder.duckdns.org/api/owner/stations" \
  -H "x-api-key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=" \
  -H "x-owner-domain: ifuel-dangay"
```

**Expected:** `200 OK` with array of stations (with images and fuel_prices)

### 3. Verify Price Report
```bash
curl -X POST "https://fuelfinder.duckdns.org/api/owner/price-reports/31/verify" \
  -H "x-api-key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=" \
  -H "x-owner-domain: ifuel-dangay" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Verified by owner"}'
```

**Expected:** `200 OK` with success message

### 4. Browser Test
1. Go to: `https://ifuel-dangay-portal.netlify.app`
2. Login with API key
3. Check all 3 tabs load without errors:
   - ✅ Overview tab shows statistics
   - ✅ Stations tab shows station list with images
   - ✅ Pending Reports tab shows reports
4. Click **Approve** or **Reject** on a report
5. Should see success message (no 500 error)

## Verification

### Check PM2 Logs

After restarting, you should see:
```
✅ Server listening on port 3001
🏪 Fetching stations for owner: iFuel Dangay Station
✅ Found 1 stations for iFuel Dangay Station
```

### Common Success Indicators

- No more `500` errors in browser console
- Dashboard loads with station data
- Images show up in station cards
- Fuel prices display correctly
- Approve/reject buttons work

## Why This Happened

This issue was supposedly fixed in **Round 3** of bug fixes (memory reference: `e09ffee5-1e13-431e-918b-a44ceef8fefe`), which states:

> ROUND 3: SQL DISTINCT and POI Fixes
> - Removed DISTINCT from 6 JSON_AGG calls in stationRepository.js

However, **`ownerController.js` was not included** in that fix, even though it had the same pattern. The owner endpoints are separate from the main station endpoints, so they weren't caught in testing.

## Prevention

To prevent this in the future:

### 1. Search Entire Codebase
When fixing SQL patterns, search ALL files:
```bash
grep -r "DISTINCT jsonb_build_object" backend/
```

### 2. Test All Similar Endpoints
If fixing `/api/stations`, also test:
- `/api/owner/stations`
- `/api/admin/stations`
- Any other variations

### 3. Add Regression Test
Create test to ensure DISTINCT is never used with JSONB:
```bash
# In CI/CD or pre-commit hook
if grep -r "DISTINCT jsonb_build_object" backend/; then
  echo "❌ ERROR: DISTINCT with JSONB detected!"
  exit 1
fi
```

## Related Issues

This is the same issue as:
- ✅ Fixed in `stationRepository.js` (Round 3)
- ✅ Fixed in `poiRepository.js` (Round 3)  
- ✅ NOW FIXED in `ownerController.js` (this fix)

## Status

✅ **FIXED** - Ready for deployment to EC2

All owner portal endpoints should work after deployment.
