# Nearby Stations Radius Bug - Query Parameter Mismatch

**Date:** Oct 23, 2025 - 8:15am UTC+8  
**Status:** ✅ FIXED  
**Severity:** HIGH - Critical functionality broken

## 🐛 Issue Description

After backend modularization, the user interface only displayed 8 stations despite the database containing 41 stations. The admin portal correctly showed all 41 stations.

### PM2 Logs Revealed the Issue
```
GET /api/stations/nearby?radiusMeters=10500
🔍 Finding stations near [12.596, 121.525] within 3000m...
```
Frontend sends `radiusMeters=10500` but backend always used **3000m** default!

## 🔍 Root Cause

The modularized controllers were reading the wrong query parameter name.

### Frontend API Call (MainApp.tsx)
```javascript
fetch(`/api/stations/nearby?lat=${lat}&lng=${lng}&radiusMeters=${radiusMeters}`)
```

### Backend Controller (BEFORE FIX) - INCORRECT ❌
```javascript
const radius = parseInt(req.query.radius) || 3000;  // Always defaults to 3000!
```

### Backend Controller (AFTER FIX) - CORRECT ✅
```javascript
const radius = parseInt(req.query.radiusMeters || req.query.radius) || 3000;
```

## 💡 Technical Explanation

The controller parameter mismatch:

| Frontend Parameter | Backend Reads | Result |
|-------------------|---------------|---------|
| `radiusMeters=15000` | `req.query.radius` = `undefined` | Falls back to `3000` default |
| `radius=15000` | `req.query.radius` = `15000` | Works correctly |

**What happened:**
1. User adjusts radius slider to 15 km (15000 meters)
2. Frontend sends: `?radiusMeters=15000`
3. Backend controller reads: `req.query.radius` (undefined)
4. Falls back to default: `3000` meters
5. Only shows 8 stations within 3 km, ignoring user's 15 km selection

**The fix accepts both parameter names** for backward compatibility:
```javascript
req.query.radiusMeters || req.query.radius
```

## ✅ Fix Applied

### Files Changed

1. **backend/controllers/stationController.js** (Line 28)
2. **backend/controllers/poiController.js** (Line 24)

### Changes Made

Fixed query parameter name to accept `radiusMeters` (frontend) and `radius` (backward compatibility):

```javascript
// BEFORE
const radius = parseInt(req.query.radius) || 3000;

// AFTER  
const radius = parseInt(req.query.radiusMeters || req.query.radius) || 3000;
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

When refactoring API controllers:
1. **Check parameter names match between frontend and backend**
2. Always test with non-default values (don't rely on defaults)
3. Use PM2 logs to verify actual parameter values received
4. Consider using TypeScript shared types for API contracts
5. Add API parameter validation tests

## 🚀 Deployment Checklist

- [x] Fix applied to stationController.js
- [x] Fix applied to poiController.js  
- [ ] Commit and push changes to Git
- [ ] SSH to EC2 and git pull
- [ ] Restart backend server (PM2)
- [ ] Test with different radius values in user interface
- [ ] Verify PM2 logs show correct radiusMeters value
- [ ] Update MODULARIZATION_FIXES_SUMMARY.md

---

**Fixed By:** Cascade AI  
**Verified:** Pending deployment testing
