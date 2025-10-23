# Emergency Fix for 500 Errors

## Issues Fixed

### 1. ❌ ownerDetection middleware: `db.query is not a function`
**Cause:** Wrong import - was using `database/db` instead of `config/database`

**Fix:** Changed in `backend/middleware/ownerDetection.js`:
```javascript
// Before:
const db = require("../database/db");
await db.query(...);

// After:
const { pool } = require("../config/database");
await pool.query(...);
```

### 2. ❌ stationRepository: `column i.file_size does not exist`
**Cause:** Repository was querying non-existent columns in images table

**Fix:** Removed non-existent columns from `backend/repositories/stationRepository.js`:
- ❌ `file_size`
- ❌ `mime_type` 
- ❌ `width`
- ❌ `height`
- ❌ `original_filename`
- ❌ `alt_text`
- ❌ `updated_at`

**Kept only existing columns:**
- ✅ `id`
- ✅ `filename`
- ✅ `display_order`
- ✅ `is_primary`
- ✅ `created_at`

## Deployment Steps

### Option 1: Git Pull & Restart (Recommended)

```bash
# SSH to EC2
ssh ubuntu@your-ec2-instance

# Navigate to project
cd /home/ubuntu/Fuel-FInder

# Pull latest fixes
git pull

# Restart backend
cd backend
pm2 restart fuel-finder

# Check logs
pm2 logs fuel-finder --lines 50
```

### Option 2: Manual File Upload

If git pull doesn't work, upload these fixed files:

1. `backend/middleware/ownerDetection.js`
2. `backend/repositories/stationRepository.js`

Then restart:
```bash
pm2 restart fuel-finder
```

## Verification

### 1. Check Backend Logs
```bash
pm2 logs fuel-finder --lines 20
```

**Expected:** No more errors about `db.query` or `file_size`

### 2. Test Stations Endpoint
```bash
curl https://fuelfinder.duckdns.org/api/stations
```

**Expected:** 200 OK with stations array (not 500 error)

### 3. Test POIs Endpoint
```bash
curl https://fuelfinder.duckdns.org/api/pois
```

**Expected:** 200 OK with POIs array (not 500 error)

### 4. Test Price Reporting
```bash
curl -X POST https://fuelfinder.duckdns.org/api/stations/52/report-price \
  -H "Content-Type: application/json" \
  -d '{"fuel_type":"Regular","price":65.5}'
```

**Expected:** 201 Created with success message

### 5. Open Frontend
Visit: https://fuelfinder.duckdns.org

**Expected:**
- ✅ Map loads
- ✅ Stations appear
- ✅ POIs appear
- ✅ No 500 errors in console

## What Changed

| File | Change | Impact |
|------|--------|--------|
| `middleware/ownerDetection.js` | Fixed database import | Owner detection now works |
| `repositories/stationRepository.js` | Removed non-existent columns | Stations/POIs queries work |

## Rollback

If issues occur:

```bash
cd /home/ubuntu/Fuel-FInder
git log --oneline -5
git reset --hard <previous-commit-hash>
pm2 restart fuel-finder
```

## Prevention

**Root Cause:** Database schema mismatch between code and actual database

**Prevention Measures:**
1. Always verify column existence before querying
2. Use migrations to track schema changes
3. Test queries against actual production database structure
4. Document actual schema in code comments

## Database Schema Reference

### images table (actual columns)
```sql
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  station_id INTEGER REFERENCES stations(id),
  poi_id INTEGER REFERENCES pois(id),
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Note:** Columns like `file_size`, `mime_type`, `width`, `height` don't exist in production

---

**Status:** ✅ **FIXED**  
**Priority:** 🔴 **CRITICAL**  
**Date:** October 23, 2025, 10:30 PM  
**Tested:** Pending deployment
