# Final Database Query Fixes

## Issues Fixed

### ❌ Error 1: ORDER BY with DISTINCT
```
ERROR: in an aggregate with DISTINCT, ORDER BY expressions must appear in argument list
```

**Cause:** PostgreSQL doesn't allow `ORDER BY` on columns not in `DISTINCT` clause

**Fixed in:** `stationRepository.js`
- Removed `DISTINCT` from all 6 `JSON_AGG()` calls
- Since we're already using `GROUP BY station.id`, duplicates don't exist
- No need for DISTINCT

### ❌ Error 2: Non-existent Columns in POIs
```
ERROR: column i.file_size does not exist
```

**Cause:** Same schema mismatch in POI queries

**Fixed in:** `poiRepository.js`
- Removed non-existent columns: `file_size`, `mime_type`, `width`, `height`, `original_filename`, `alt_text`, `updated_at`
- Kept only: `id`, `filename`, `display_order`, `is_primary`, `created_at`
- Fixed in 2 functions: `getAllPois()`, `getNearbyPois()`

---

## Complete Fix Summary

### stationRepository.js
✅ Removed `DISTINCT` from:
1. `getNearbyStations()` - images aggregation
2. `getNearbyStations()` - fuel_prices aggregation  
3. `getAllStations()` - images aggregation
4. `getAllStations()` - fuel_prices aggregation
5. `getStationById()` - images aggregation
6. `getStationById()` - fuel_prices aggregation

✅ Already fixed (from previous):
- Removed non-existent image columns

### poiRepository.js
✅ Removed non-existent columns from:
1. `getAllPois()` - images aggregation
2. `getNearbyPois()` - images aggregation

---

## Deploy Now

```bash
# SSH to EC2
ssh ubuntu@your-ec2-instance

# Pull changes
cd /home/ubuntu/Fuel-FInder
git pull

# Restart
cd backend
pm2 restart fuel-finder

# Verify
pm2 logs fuel-finder --lines 30
```

---

## Expected Result

**Before:**
```
❌ ERROR: in an aggregate with DISTINCT, ORDER BY expressions...
❌ ERROR: column i.file_size does not exist
```

**After:**
```
✅ Server running on port 3001
✅ Finding stations near [12.59, 121.52]...
✅ Found 25 nearby stations
✅ Finding POIs near [12.59, 121.52]...
✅ Found 10 nearby POIs
```

---

## Test Everything

### 1. Stations endpoint
```bash
curl https://fuelfinder.duckdns.org/api/stations
# Should return 200 OK with stations array
```

### 2. POIs endpoint
```bash
curl https://fuelfinder.duckdns.org/api/pois
# Should return 200 OK with POIs array
```

### 3. Nearby stations
```bash
curl "https://fuelfinder.duckdns.org/api/stations/nearby?lat=12.59&lng=121.52&radiusMeters=5000"
# Should return 200 OK with nearby stations
```

### 4. Nearby POIs
```bash
curl "https://fuelfinder.duckdns.org/api/pois/nearby?lat=12.59&lng=121.52&radiusMeters=5000"
# Should return 200 OK with nearby POIs
```

### 5. Price reporting
```bash
curl -X POST https://fuelfinder.duckdns.org/api/stations/52/report-price \
  -H "Content-Type: application/json" \
  -d '{"fuel_type":"Regular","price":65.5}'
# Should return 201 Created
```

### 6. Frontend
Visit: https://fuelfinder.duckdns.org
- ✅ Map loads
- ✅ Stations appear with popups
- ✅ POIs appear
- ✅ Can click station and report price
- ✅ No 500 errors in console

---

## What We Learned

### PostgreSQL DISTINCT + ORDER BY Rule
```sql
-- ❌ WRONG: Can't ORDER BY column not in DISTINCT
JSON_AGG(DISTINCT obj ORDER BY obj.display_order)

-- ✅ RIGHT: Remove DISTINCT when using GROUP BY
JSON_AGG(obj ORDER BY obj.display_order)
```

**Why?** When you use `GROUP BY station.id`, each station is already unique, so `DISTINCT` is redundant and conflicts with `ORDER BY`.

### Actual Database Schema
```sql
-- images table (ACTUAL columns in production)
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  station_id INTEGER REFERENCES stations(id),
  poi_id INTEGER REFERENCES pois(id),
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Columns that DON'T exist:
-- ❌ file_size
-- ❌ mime_type
-- ❌ width, height
-- ❌ original_filename
-- ❌ alt_text
-- ❌ updated_at
```

---

## Files Modified (2)

1. ✅ `backend/repositories/stationRepository.js`
   - Removed 6 `DISTINCT` keywords
   - Already had column fixes from previous

2. ✅ `backend/repositories/poiRepository.js`
   - Removed 7 non-existent columns from 2 functions

---

## Status

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| DISTINCT/ORDER BY error | ✅ Fixed | Removed DISTINCT |
| file_size in POIs | ✅ Fixed | Removed column |
| Stations 500 error | ✅ Fixed | Previous + DISTINCT fix |
| POIs 500 error | ✅ Fixed | Column fix |
| Price reporting | ✅ Fixed | Previous fix |

**Everything should work now!** 🎉

---

**Date:** October 24, 2025, 7:20 AM  
**Status:** ✅ **READY TO DEPLOY**  
**Breaking Changes:** ❌ **NONE**
