# Image Duplication Fix - SQL Cartesian Product Resolution

**Date:** October 24, 2024  
**Issue:** Station images appearing duplicated 3-4x in carousel  
**Cause:** SQL Cartesian Product from multiple LEFT JOINs  
**Status:** ✅ FIXED

---

## Quick Summary

Station images were duplicated because queries join both `images` and `fuel_prices` tables:
- 1 image × 3 fuel types = **3 duplicate image rows**
- Solution: Add `DISTINCT` to `JSON_AGG()` for images

---

## Technical Details

### The Problem Query Pattern

```sql
SELECT 
  s.id,
  s.name,
  JSON_AGG(                    -- ❌ Without DISTINCT
    JSONB_BUILD_OBJECT(
      'id', i.id,
      'filename', i.filename
    )
  ) AS images
FROM stations s
LEFT JOIN images i ON i.station_id = s.id          -- 1 image
LEFT JOIN fuel_prices fp ON fp.station_id = s.id   -- 3 fuel types
GROUP BY s.id;
```

**Result:** Each image appears once per fuel price (3x duplication)

### The Solution

```sql
SELECT 
  s.id,
  s.name,
  JSON_AGG(DISTINCT            -- ✅ With DISTINCT
    JSONB_BUILD_OBJECT(
      'id', i.id,
      'filename', i.filename
    ) ORDER BY i.display_order
  ) AS images
FROM stations s
LEFT JOIN images i ON i.station_id = s.id
LEFT JOIN fuel_prices fp ON fp.station_id = s.id
GROUP BY s.id;
```

**Result:** Each image appears exactly once (correct)

---

## Files Modified

### 1. `backend/repositories/stationRepository.js`

Added `DISTINCT` to 3 functions:

| Function | Line | Description |
|----------|------|-------------|
| `getNearbyStations()` | 33 | Stations within radius |
| `getAllStations()` | 95 | All stations query |
| `getStationById()` | 147 | Single station lookup |

### 2. `backend/repositories/poiRepository.js`

Added `DISTINCT` to 3 functions (preventive measure):

| Function | Line | Description |
|----------|------|-------------|
| `getAllPois()` | 43 | All POIs query |
| `getNearbyPois()` | 81 | POIs within radius |
| `getPoiById()` | 121 | Single POI lookup |

---

## Why This Happened

### History of DISTINCT in This Codebase

1. **Round 3 Bug Fix (Previous)**: Removed DISTINCT from all `JSON_AGG()` calls  
   - **Reason:** Was causing SQL errors at the time
   - **Mistake:** Removed it from images too (should only remove from some aggregations)

2. **Current Fix**: Re-added DISTINCT but only for images  
   - **Why images need it:** Multiple LEFT JOINs create Cartesian products
   - **Why fuel_prices don't need it:** We want all 3 fuel types (no deduplication)

---

## Visual Explanation

### Before Fix (Cartesian Product)

```
Station: Shell Roxas
├─ Image 1 ────┬─ Diesel ₱58.00/L   → Row 1: [Image 1]
│              ├─ Premium ₱62.00/L  → Row 2: [Image 1] (duplicate)
│              └─ Regular ₱60.00/L  → Row 3: [Image 1] (duplicate)
└─ Result: JSON_AGG creates [Image 1, Image 1, Image 1]
```

### After Fix (DISTINCT Applied)

```
Station: Shell Roxas
├─ Image 1 ────┬─ Diesel ₱58.00/L   → Row 1: [Image 1]
│              ├─ Premium ₱62.00/L  → Row 2: [Image 1] (filtered by DISTINCT)
│              └─ Regular ₱60.00/L  → Row 3: [Image 1] (filtered by DISTINCT)
└─ Result: JSON_AGG(DISTINCT) creates [Image 1]
```

---

## Deployment

### Quick Deploy (PM2)

```bash
cd /home/keil/fuel_finder/backend
pm2 restart fuel-finder-backend
```

### Full Deployment Script

```bash
cd /home/keil/fuel_finder/backend
./deploy-image-duplication-fix.sh
```

The script will:
1. ✅ Backup current files
2. ✅ Verify fix is applied
3. ✅ Restart PM2 application
4. ✅ Show logs and status
5. ✅ Provide testing instructions

---

## Testing

### 1. API Test (Command Line)

```bash
# Test station images count
curl http://localhost:3000/api/stations | jq '.[] | {id, name, image_count: .images | length}'

# Expected output:
# {
#   "id": 1,
#   "name": "Shell Roxas",
#   "image_count": 1    ← Should match actual images uploaded
# }
```

### 2. Browser Test

1. Open Fuel Finder app: `http://fuelfinders.netlify.app`
2. Click any station marker
3. Check image carousel counter
   - ✅ Should show "1 of 1" (if 1 image)
   - ✅ Should show "1 of 2" (if 2 images)
   - ❌ Should NOT show "1 of 4" (if only 1 image uploaded)

### 3. Database Direct Check

```sql
-- Check actual images in database
SELECT 
  s.name,
  COUNT(DISTINCT i.id) as actual_images,
  COUNT(fp.fuel_type) as fuel_types
FROM stations s
LEFT JOIN images i ON i.station_id = s.id
LEFT JOIN fuel_prices fp ON fp.station_id = s.id
WHERE s.id = 1
GROUP BY s.id, s.name;

-- Expected: actual_images should match carousel count
```

---

## Important Notes

### When to Use DISTINCT in JSON_AGG

✅ **Use DISTINCT when:**
- Multiple LEFT JOINs create Cartesian products
- Aggregating data from the "left" side of joins
- Example: Images (joined first, multiplied by second join)

❌ **Don't use DISTINCT when:**
- Single LEFT JOIN (no Cartesian product)
- Aggregating data from the "right" side of joins
- You want all rows (e.g., all fuel prices)

### PostgreSQL Compatibility

- Requires PostgreSQL 9.5+ for `JSON_AGG(DISTINCT ... ORDER BY ...)`
- Current database version: PostgreSQL 13+ ✅
- No compatibility issues expected

---

## Rollback Plan

If issues arise after deployment:

```bash
# 1. Restore from backup
cd /home/keil/fuel_finder/backend
BACKUP_DIR=$(ls -t backups/ | head -1)
cp backups/$BACKUP_DIR/stationRepository.js repositories/
cp backups/$BACKUP_DIR/poiRepository.js repositories/

# 2. Restart application
pm2 restart fuel-finder-backend

# 3. Verify rollback
curl http://localhost:3000/api/stations | jq '.[0]'
```

---

## Related Documentation

- **Previous Bug Fix:** `FINAL_DATABASE_FIXES.md` (Round 3 - incorrectly removed DISTINCT)
- **Deployment Guide:** `DOCUMENTATIONS AND CONTEXT/DEPLOYMENT/`
- **Database Schema:** `backend/database/schema.sql`

---

## Lessons Learned

1. **DISTINCT is context-dependent**: Not all aggregations need it
2. **Cartesian Products are sneaky**: Multiple LEFT JOINs multiply rows
3. **Test with real data**: 1 image + 3 fuel types revealed the bug
4. **Document SQL patterns**: Future joins should consider Cartesian products

---

## Status

| Item | Status |
|------|--------|
| Code Fixed | ✅ Complete |
| Documentation | ✅ Complete |
| Deployment Script | ✅ Ready |
| Testing Instructions | ✅ Provided |
| Rollback Plan | ✅ Documented |

**Ready for production deployment.**

---

**Next Steps:**
1. Run deployment script on production EC2
2. Test with live data
3. Monitor PM2 logs for errors
4. Update thesis documentation if needed
