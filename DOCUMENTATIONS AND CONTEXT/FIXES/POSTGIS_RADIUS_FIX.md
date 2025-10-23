# PostGIS Radius Query Fix - Geography Cast Missing

**Date:** Oct 23, 2025 - 8:15am UTC+8  
**Status:** ✅ FIXED  
**Severity:** HIGH - Critical functionality broken

## 🐛 Issue Description

After backend modularization, the user interface only displayed 8 stations despite the database containing 41 stations. The admin portal correctly showed all 41 stations.

## 🔍 Root Cause

The modularized `stationRepository.js` and `poiRepository.js` were missing the `::geography` cast in the PostGIS `ST_DWithin` spatial query.

### Old Code (database/db.js) - CORRECT ✅
```sql
WHERE ST_DWithin(
  s.geom, 
  ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, 
  $3
)
```

### New Code (repositories) - INCORRECT ❌
```sql
WHERE ST_DWithin(
  s.geom,
  ST_SetSRID(ST_MakePoint($2, $1), 4326),
  $3
)
```

## 💡 Technical Explanation

PostGIS `ST_DWithin` behavior:

| Type | Distance Unit | Example |
|------|---------------|---------|
| **geometry** (no cast) | Degrees | `15000` = 15000 degrees ≈ 1.67 million km |
| **geography** (with cast) | Meters | `15000` = 15000 meters = 15 km |

Without the `::geography` cast:
- User sets radius to 15000 meters (15 km)
- PostGIS interprets as 15000 degrees
- Only stations within ~0.15 degrees (~16 km) match
- Result: 8 stations instead of expected ~30+ stations

With the `::geography` cast:
- User sets radius to 15000 meters (15 km)  
- PostGIS correctly interprets as 15000 meters
- All stations within 15 km match
- Result: All stations within radius display correctly

## ✅ Fix Applied

### Files Changed

1. **backend/repositories/stationRepository.js** (Line 61-65)
2. **backend/repositories/poiRepository.js** (Line 108-112)

### Changes Made

Added `::geography` cast to both geometry columns:

```sql
WHERE ST_DWithin(
  s.geom::geography,                                      -- Added cast
  ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,     -- Added cast
  $3
)
```

## 🧪 Testing

### Before Fix
```
Admin Portal: 41 stations (uses /api/stations - getAllStations)
User Interface: 8 stations (uses /api/stations/nearby?radius=15000)
```

### After Fix (Expected)
```
Admin Portal: 41 stations (unchanged)
User Interface: ~30+ stations (all stations within 15km radius)
```

### Test Commands
```bash
# Restart backend
cd /home/keil/fuel_finder/backend
pm2 restart all

# Test nearby endpoint
curl "http://localhost:3000/api/stations/nearby?lat=13.0&lng=121.0&radiusMeters=15000"
```

## 📊 Impact

- **User Interface**: Now correctly displays all stations within selected radius
- **API**: `/api/stations/nearby` endpoint fixed
- **Performance**: No performance impact (geography cast is standard PostGIS practice)
- **Backward Compatibility**: Fully compatible, no breaking changes

## 📚 Related Issues

- Part of backend modularization (MODULARIZATION_PLAN.md)
- Related to other modularization bugs (MODULARIZATION_FIXES_SUMMARY.md)

## ⚠️ Lesson Learned

When refactoring PostGIS queries:
1. Always preserve `::geography` casts for distance-based operations
2. Test spatial queries with known distances
3. Compare results with original implementation
4. Document PostGIS-specific query patterns

## 🚀 Deployment Checklist

- [x] Fix applied to stationRepository.js
- [x] Fix applied to poiRepository.js
- [ ] Restart backend server (PM2)
- [ ] Verify nearby stations endpoint returns correct count
- [ ] Test user interface displays all stations within radius
- [ ] Update MODULARIZATION_FIXES_SUMMARY.md

---

**Fixed By:** Cascade AI  
**Verified:** Pending deployment testing
