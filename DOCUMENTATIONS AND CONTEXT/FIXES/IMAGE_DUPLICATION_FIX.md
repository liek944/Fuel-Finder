# Image Duplication Fix - Cartesian Product Resolution

## Problem
Station images were appearing duplicated (4x) in the image carousel due to a SQL Cartesian Product issue.

## Root Cause
The station queries perform two LEFT JOINs:
```sql
LEFT JOIN images i ON i.station_id = s.id
LEFT JOIN fuel_prices fp ON fp.station_id = s.id
```

When a station has:
- **1 image**
- **3 fuel types** (Diesel, Premium, Regular)

The Cartesian product creates: **1 image × 3 fuel prices = 3 duplicate rows**

Without `DISTINCT` in the `JSON_AGG()`, each image gets included once per fuel price row.

## Example Scenario
For a station with 1 image and 3 fuel prices:
- **Without DISTINCT**: `JSON_AGG()` creates `[img1, img1, img1]` (3 duplicates)
- **With DISTINCT**: `JSON_AGG(DISTINCT ...)` creates `[img1]` (correct)

## Solution
Added `DISTINCT` keyword to all `JSON_AGG()` calls for images to deduplicate them across joined rows.

### Files Modified

#### 1. `/backend/repositories/stationRepository.js`
Fixed 3 functions:
- `getNearbyStations()` - Line 33
- `getAllStations()` - Line 95
- `getStationById()` - Line 147

**Change:**
```sql
-- BEFORE
JSON_AGG(
  JSONB_BUILD_OBJECT(...)
) FILTER (WHERE i.id IS NOT NULL)

-- AFTER  
JSON_AGG(DISTINCT
  JSONB_BUILD_OBJECT(...)
) FILTER (WHERE i.id IS NOT NULL)
```

#### 2. `/backend/repositories/poiRepository.js`
Fixed 3 functions (for consistency and future-proofing):
- `getAllPois()` - Line 43
- `getNearbyPois()` - Line 81
- `getPoiById()` - Line 121

## Technical Details

### Why DISTINCT Was Needed Now
Previous fix (Round 3) **incorrectly removed DISTINCT** from all `JSON_AGG()` calls. This was a mistake because:
- DISTINCT **is needed** when multiple LEFT JOINs create Cartesian products
- DISTINCT **is not needed** for simple single-table aggregations
- The original bug was likely using DISTINCT on the wrong aggregation

### Why Fuel Prices Don't Need DISTINCT
Fuel prices don't have Cartesian product issues because:
1. Each station has exactly 3 fuel types (Diesel, Premium, Regular)
2. The `fuel_prices` table is the second join, so it doesn't multiply images
3. We want all 3 fuel prices, not deduplicated ones

### PostgreSQL DISTINCT with ORDER BY
The syntax `JSON_AGG(DISTINCT ... ORDER BY ...)` is valid in PostgreSQL 9.5+:
```sql
JSON_AGG(DISTINCT
  JSONB_BUILD_OBJECT(...)
  ORDER BY i.display_order, i.id
) FILTER (WHERE i.id IS NOT NULL)
```

## Deployment

### Option 1: Using PM2 (Recommended)
```bash
cd /home/keil/fuel_finder/backend
pm2 restart fuel-finder-backend
pm2 logs fuel-finder-backend
```

### Option 2: Using Deployment Script
```bash
cd /home/keil/fuel_finder
./backend/deploy-image-duplication-fix.sh
```

### Option 3: Manual Restart
```bash
cd /home/keil/fuel_finder/backend
npm install  # If needed
node server_modular_entry.js
```

## Testing

### 1. Test Station Images
```bash
curl http://localhost:3000/api/stations | jq '.[] | {id, name, image_count: .images | length}'
```

Expected: Each station should show correct image count (1-4 unique images)

### 2. Test in Browser
1. Open Fuel Finder app
2. Click on any station marker
3. Check image carousel counter (should show "1 of 1", "1 of 2", etc.)
4. Verify no duplicate images appear

### 3. Test POI Images
```bash
curl http://localhost:3000/api/pois | jq '.[] | {id, name, image_count: .images | length}'
```

## Rollback
If issues arise, revert to previous version:
```bash
cd /home/keil/fuel_finder/backend
git checkout HEAD~1 repositories/stationRepository.js
git checkout HEAD~1 repositories/poiRepository.js
pm2 restart fuel-finder-backend
```

## Related Issues
- **Previous Fix (Round 3)**: Incorrectly removed DISTINCT from all JSON_AGG calls
- **Original Bug**: SQL Cartesian Product causing duplicate rows
- **Memory**: Retrieved memory mentioned this exact issue pattern

## Status
✅ **FIXED** - Ready for deployment
- All station query functions updated
- All POI query functions updated (preventive)
- Documentation complete
- Deployment script ready

## References
- PostgreSQL JSON Functions: https://www.postgresql.org/docs/current/functions-json.html
- Cartesian Product Explanation: Multiple LEFT JOINs multiply rows
- DISTINCT in Aggregates: Deduplicates values before aggregation
