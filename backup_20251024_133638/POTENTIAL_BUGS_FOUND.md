# Potential Bugs Found - Code Review

## 🔴 Critical Bugs (Will Crash)

### Bug #1: POI getPoiById() Has Non-Existent Columns
**File:** `backend/repositories/poiRepository.js` (line 110-146)  
**Severity:** 🔴 **CRITICAL**  
**Status:** ❌ **NOT FIXED**

**Error Will Be:**
```
ERROR: column i.file_size does not exist
```

**Problem:**
The `getPoiById()` function still references 7 non-existent columns:
- `original_filename`
- `file_size`
- `mime_type`
- `width`
- `height`
- `alt_text`
- `updated_at`

**Current Code (WRONG):**
```javascript
async function getPoiById(id) {
  const query = `
    SELECT ...
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
            'id', i.id,
            'filename', i.filename,
            'original_filename', i.original_filename,  // ❌
            'file_size', i.file_size,                  // ❌
            'mime_type', i.mime_type,                  // ❌
            'width', i.width,                          // ❌
            'height', i.height,                        // ❌
            'display_order', i.display_order,
            'alt_text', i.alt_text,                    // ❌
            'is_primary', i.is_primary,
            'created_at', i.created_at,
            'updated_at', i.updated_at                 // ❌
          ) ORDER BY i.display_order, i.id
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::JSON
      ) AS images
    ...
```

**Should Be:**
```javascript
JSONB_BUILD_OBJECT(
  'id', i.id,
  'filename', i.filename,
  'display_order', i.display_order,
  'is_primary', i.is_primary,
  'created_at', i.created_at
)
```

**Impact:** 
- Any request to get a specific POI by ID will fail with 500 error
- Admin portal POI editing will crash
- Frontend POI details view will fail

---

### Bug #2: ownerController.js Uses Wrong Database Import
**File:** `backend/controllers/ownerController.js` (line 6)  
**Severity:** 🔴 **CRITICAL**  
**Status:** ❌ **NOT FIXED**

**Error Will Be:**
```
TypeError: db.query is not a function
```

**Problem:**
Uses `const db = require("../database/db")` and calls `db.query()` directly, but `database/db.js` doesn't export a `query` method.

**Current Code (WRONG):**
```javascript
const db = require("../database/db");
...
const result = await db.query(query, params);  // ❌ db.query doesn't exist
```

**Should Be:**
```javascript
const { pool } = require("../config/database");
...
const result = await pool.query(query, params);  // ✅
```

**Or Alternative:**
```javascript
const db = require("../database/db");
...
const result = await db.pool.query(query, params);  // ✅ db.pool exists
```

**Impact:**
- ALL owner portal features will crash:
  - Owner dashboard (15 `db.query()` calls)
  - Get owner stations
  - Update station
  - Price report verification
  - Activity logs
  - Analytics
- Owner authentication will fail

**Affected Functions:**
- `getDashboard()` - 1 query
- `getOwnerStations()` - 1 query
- `getStationById()` - 1 query
- `updateStation()` - 2 queries
- `getPendingPriceReports()` - 1 query
- `verifyPriceReport()` - 3 queries
- `rejectPriceReport()` - 2 queries
- `getActivityLogs()` - 1 query
- `getAnalytics()` - 3 queries in Promise.all

**Total:** 15 database calls that will all fail

---

### Bug #3: ownerAuth.js Uses Wrong Database Import
**File:** `backend/middleware/ownerAuth.js` (line 9)  
**Severity:** 🔴 **CRITICAL**  
**Status:** ❌ **NOT FIXED**

**Error Will Be:**
```
TypeError: db.query is not a function
```

**Problem:**
Same issue as Bug #2 - uses `db.query()` which doesn't exist.

**Current Code (WRONG):**
```javascript
const db = require("../database/db");
...
const result = await db.query(query, params);  // ❌
```

**Should Be:**
```javascript
const { pool } = require("../config/database");
...
const result = await pool.query(query, params);  // ✅
```

**Impact:**
- Owner API key authentication will fail
- All protected owner endpoints will be inaccessible
- Activity logging will fail
- Station ownership checks will fail

**Affected Functions:**
- `verifyOwnerApiKey()` - 1 query
- `logOwnerActivity()` - 1 query  
- `checkStationOwnership()` - 1 query

---

## ⚠️ Medium Priority Issues

### Issue #1: Missing Error Handling
**Files:** Multiple controller files  
**Severity:** ⚠️ **MEDIUM**

Some async functions in controllers don't have try-catch blocks. They rely on the `asyncHandler` wrapper, which is fine, but some edge cases might not be caught.

**Example:**
```javascript
async function getAllPois(req, res) {
  const pois = await poiRepository.getAllPois();  // If this throws, what happens?
  const data = transformPoiData(pois);
  res.json(data);
}
```

**Recommendation:** Already using `asyncHandler` wrapper in routes, so this is handled. No action needed unless specific error handling is required.

---

### Issue #2: SQL Injection Risk (Low - Already Mitigated)
**Status:** ✅ **OK** 

All queries use parameterized statements (`$1`, `$2`, etc.), so SQL injection is already prevented. Good job!

---

### Issue #3: No Input Validation in Some Controllers
**Severity:** ⚠️ **MEDIUM**

Some controller functions don't validate all inputs before using them.

**Example:**
```javascript
async function updateStation(id, updates) {
  const { name, brand, fuel_price, services, address, phone, operating_hours, lat, lng } = updates;
  
  // No validation of:
  // - Is lat/lng in valid range?
  // - Is fuel_price positive?
  // - Are services an array?
}
```

**Recommendation:** Add validation middleware or use a library like `joi` or `zod`.

---

## 📊 Summary

| Bug # | Severity | File | Issue | Status |
|-------|----------|------|-------|--------|
| 1 | 🔴 CRITICAL | poiRepository.js | Non-existent columns in getPoiById() | ❌ NOT FIXED |
| 2 | 🔴 CRITICAL | ownerController.js | Wrong db import (15 queries will fail) | ❌ NOT FIXED |
| 3 | 🔴 CRITICAL | ownerAuth.js | Wrong db import (3 queries will fail) | ❌ NOT FIXED |
| 4 | ⚠️ MEDIUM | controllers | Missing input validation | 📝 COULD IMPROVE |

---

## 🔧 Quick Fixes Required

### Fix #1: POI Repository
```bash
# File: backend/repositories/poiRepository.js
# Line: 120-138
# Remove non-existent columns, keep only: id, filename, display_order, is_primary, created_at
```

### Fix #2: Owner Controller
```bash
# File: backend/controllers/ownerController.js
# Line: 6
# Change: const db = require("../database/db");
# To:     const { pool } = require("../config/database");
# Then replace all: db.query -> pool.query
```

### Fix #3: Owner Auth
```bash
# File: backend/middleware/ownerAuth.js  
# Line: 9
# Change: const db = require("../database/db");
# To:     const { pool } = require("../config/database");
# Then replace all: db.query -> pool.query
```

---

## 🧪 How to Test

After fixes, test these scenarios:

### Test POI Fix:
```bash
curl https://fuelfinder.duckdns.org/api/pois/123
# Should return 200 OK with POI details
```

### Test Owner Features:
```bash
# 1. Get owner dashboard
curl -H "x-api-key: YOUR_API_KEY" \
  https://ifuel-dangay.duckdns.org/api/owner/dashboard

# 2. Get owner stations
curl -H "x-api-key: YOUR_API_KEY" \
  https://ifuel-dangay.duckdns.org/api/owner/stations

# 3. Verify price report
curl -X POST -H "x-api-key: YOUR_API_KEY" \
  https://ifuel-dangay.duckdns.org/api/owner/price-reports/123/verify
```

---

## 🎯 Priority Order

1. **🔴 Fix Bug #2 & #3 FIRST** - Owner features are completely broken
2. **🔴 Fix Bug #1** - POI details won't load
3. **⚠️ Consider input validation** - Add over time

---

## 📝 Notes

**Why These Weren't Caught Before:**
1. Owner features haven't been tested yet (subdomain not accessed)
2. `getPoiById()` might not be called in main flow (only used in admin/details)
3. No automated tests for these specific features

**Prevention:**
- Add integration tests for all repository functions
- Test against actual production database schema
- Run end-to-end tests for owner portal before deploying

---

**Date:** October 24, 2025, 7:25 AM  
**Found By:** Code Review  
**Priority:** 🔴 **URGENT** - All 3 critical bugs will cause crashes
