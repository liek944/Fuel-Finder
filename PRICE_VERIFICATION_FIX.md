# Price Verification Fix

## Problem Discovered

Verifying price reports (both owner and admin portals) was **not properly updating the station markers** on the map. The "(community)" indicator was not appearing after verification.

### User Report
> "I don't think verifying reports changes the prices of the fuels in the station markers?"
> "But it always updates in the past? When I click verify the word 'community' will appear next to the verified fuel price. It used to work."

## Root Causes Found

### Issue #1: Owner Portal Missing `price_updated_by` Field
**File:** `backend/controllers/ownerController.js:389-401`

**Problem:**
```sql
-- OLD CODE (BROKEN)
INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, updated_at)
VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (station_id, fuel_type) 
DO UPDATE SET 
  price = EXCLUDED.price,
  is_community = TRUE,
  updated_at = CURRENT_TIMESTAMP
```

The code was setting `is_community = TRUE` but **NOT setting `price_updated_by = 'community'`**.

**Frontend checks this field:**
```typescript
// frontend/src/components/MainApp.tsx:1290
{fp.price_updated_by === "community" && (
  <span>(community)</span>
)}
```

**Impact:** Price was updated but "(community)" indicator didn't appear.

### Issue #2: Admin Portal Not Updating `fuel_prices` Table At All
**File:** `backend/repositories/priceRepository.js:110-123`

**Problem:**
```javascript
// OLD CODE (BROKEN)
async function verifyPriceReport(reportId, verifiedBy) {
  const query = `
    UPDATE fuel_price_reports
    SET is_verified = true, verified_by = $2, verified_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [reportId, verifiedBy]);
  return result.rows[0];
}
```

This only updated `fuel_price_reports` (marking report as verified) but **didn't update `fuel_prices`** (the table that feeds the map markers).

**Impact:** Admin verification did nothing to actual displayed prices on map.

## Solutions Implemented

### Fix #1: Owner Portal - Add `price_updated_by` Field
**File:** `backend/controllers/ownerController.js`

```sql
-- NEW CODE (FIXED)
INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, price_updated_by, price_updated_at, updated_at)
VALUES ($1, $2, $3, TRUE, 'community', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (station_id, fuel_type) 
DO UPDATE SET 
  price = EXCLUDED.price,
  is_community = TRUE,
  price_updated_by = 'community',
  price_updated_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
```

**Changes:**
- ✅ Added `price_updated_by = 'community'` to INSERT
- ✅ Added `price_updated_by = 'community'` to UPDATE
- ✅ Added `price_updated_at` timestamp tracking
- ✅ Now matches the working code in `db.js`

### Fix #2: Admin Portal - Actually Update Fuel Prices
**File:** `backend/repositories/priceRepository.js`

```javascript
// NEW CODE (FIXED)
async function verifyPriceReport(reportId, verifiedBy) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Mark the report as verified
    const reportQuery = `
      UPDATE fuel_price_reports
      SET is_verified = true, verified_by = $2, verified_at = NOW()
      WHERE id = $1
      RETURNING station_id, fuel_type, price
    `;
    
    const reportResult = await client.query(reportQuery, [reportId, verifiedBy]);
    const report = reportResult.rows[0];
    
    // Step 2: Update the fuel_prices table (THIS WAS MISSING!)
    const priceQuery = `
      INSERT INTO fuel_prices (station_id, fuel_type, price, is_community, price_updated_by, price_updated_at, updated_at)
      VALUES ($1, $2, $3, TRUE, 'community', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (station_id, fuel_type)
      DO UPDATE SET
        price = EXCLUDED.price,
        is_community = TRUE,
        price_updated_by = 'community',
        price_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await client.query(priceQuery, [report.station_id, report.fuel_type, report.price]);
    
    await client.query('COMMIT');
    return report;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Changes:**
- ✅ Added database transaction for atomicity
- ✅ Now updates `fuel_prices` table after marking report verified
- ✅ Sets all required fields: `price_updated_by`, `is_community`, timestamps
- ✅ Uses proper error handling with rollback

## Database Schema Reference

### `fuel_prices` Table (What Gets Displayed)
```sql
CREATE TABLE fuel_prices (
  id SERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES stations(id),
  fuel_type VARCHAR(50),
  price NUMERIC(10,2),
  price_updated_at TIMESTAMP,
  price_updated_by VARCHAR(50),      -- "community" or "admin"
  is_community BOOLEAN DEFAULT FALSE, -- Added in migration 007
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_station_fuel UNIQUE(station_id, fuel_type)
);
```

### `fuel_price_reports` Table (Pending Submissions)
```sql
CREATE TABLE fuel_price_reports (
  id SERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES stations(id),
  fuel_type VARCHAR(50),
  price NUMERIC(10,2),
  reporter_name VARCHAR(100),
  notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by VARCHAR(100),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Verification Flow

### Before Fix
```
User submits report → fuel_price_reports (pending)
                     ↓
Owner/Admin clicks verify → fuel_price_reports.is_verified = TRUE
                          → (price_updated_by NOT SET) ❌
                          → fuel_prices NOT UPDATED in admin case ❌
```

### After Fix
```
User submits report → fuel_price_reports (pending)
                     ↓
Owner/Admin clicks verify → fuel_price_reports.is_verified = TRUE
                          → fuel_prices.price = NEW_PRICE ✅
                          → fuel_prices.price_updated_by = 'community' ✅
                          → fuel_prices.is_community = TRUE ✅
                          ↓
                    Map markers update with "(community)" indicator ✅
```

## Testing Steps

### 1. Test Owner Verification
```bash
# Submit a price report via MainApp
curl -X POST http://localhost:3001/api/stations/52/report-price \
  -H "Content-Type: application/json" \
  -d '{"fuel_type":"Regular","price":65.50,"notes":"Test report"}'

# Verify via Owner Dashboard
# Visit: ifuel-dangay-portal.netlify.app
# Click "Approve" on pending report

# Check database
psql $DATABASE_URL -c "SELECT station_id, fuel_type, price, price_updated_by, is_community FROM fuel_prices WHERE station_id=52;"

# Expected result:
# price_updated_by = 'community' ✅
# is_community = TRUE ✅
```

### 2. Test Admin Verification
```bash
# Submit report (same as above)

# Verify via Admin Portal
curl -X POST http://localhost:3001/api/admin/price-reports/123/verify \
  -H "x-api-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"verifiedBy":"admin"}'

# Check fuel_prices table
psql $DATABASE_URL -c "SELECT * FROM fuel_prices WHERE station_id=52 AND fuel_type='Regular';"

# Expected: Row exists with updated price ✅
```

### 3. Test Frontend Display
1. Open MainApp at fuelfinder.duckdns.org
2. Find iFuel Dangay station on map
3. Click station marker
4. Look for fuel prices with "(community)" indicator
5. ✅ Should show: "Regular: ₱65.50/L (community)"

## Files Modified

1. **backend/controllers/ownerController.js**
   - Line 391-399: Added `price_updated_by` field to INSERT/UPDATE

2. **backend/repositories/priceRepository.js**
   - Line 110-158: Complete rewrite of `verifyPriceReport()` function
   - Added transaction handling
   - Added fuel_prices table update (was completely missing)

## Deployment

```bash
cd /home/keil/fuel_finder/backend
chmod +x deploy-price-verification-fix.sh
./deploy-price-verification-fix.sh
```

Or manually:
```bash
pm2 restart fuel-finder-backend
pm2 logs fuel-finder-backend --lines 50
```

## Why This Worked Before

Looking at the old monolithic `database/db.js:631-704`, the `verifyPriceReport()` function **did include** the fuel_prices update with `price_updated_by = 'community'`.

**When refactoring to modular architecture**, this logic was:
- ✅ **Correctly** copied to `ownerController.js` BUT missing the `price_updated_by` field
- ❌ **Incorrectly** simplified in `priceRepository.js` (only marked report verified, didn't update prices)

## Lessons Learned

1. **Database field migration:** When `is_community` column was added (migration 007), code was updated to set it but `price_updated_by` was forgotten
2. **Refactoring verification:** When splitting monolithic code, critical business logic (updating fuel_prices) was lost in admin path
3. **Frontend dependencies:** The UI checks `price_updated_by === "community"`, not `is_community` boolean
4. **Testing gaps:** This should have been caught by integration tests verifying the complete verification flow

## Related Memory Updated

Updated memory about price verification to include:
- Both owner and admin verification must update `fuel_prices` table
- Must set both `price_updated_by='community'` AND `is_community=TRUE`
- Frontend displays "(community)" based on `price_updated_by` field
