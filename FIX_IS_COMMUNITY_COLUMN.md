# Fix: Missing is_community Column in fuel_prices Table

## Problem

Owner portal returning 500 errors with:
```
❌ ERROR: column "is_community" of relation "fuel_prices" does not exist
```

Affected operations:
- ❌ Fetching owner stations (GET /api/owner/stations)
- ❌ Verifying price reports (POST /api/owner/price-reports/:id/verify)

## Root Cause

The `ownerController.js` code references `fp.is_community` in SQL queries, but your database's `fuel_prices` table doesn't have this column.

The table has `price_updated_by` (VARCHAR) but not `is_community` (BOOLEAN).

## Solution

Add the `is_community` column to the `fuel_prices` table using Migration 007.

## Deployment Steps

### Option 1: Automated (Recommended)

**On EC2:**
```bash
cd /home/ubuntu/Fuel-FInder/backend/database
node apply-migration-007.js
```

This will:
1. Add `is_community` column (BOOLEAN, default FALSE)
2. Migrate existing data (set TRUE where `price_updated_by = 'community'`)
3. Create index for performance
4. Verify the migration succeeded

### Option 2: Manual SQL

**Connect to your database (Supabase SQL Editor or psql):**

```sql
-- Add the is_community column
ALTER TABLE fuel_prices 
ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT FALSE;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_fuel_prices_is_community ON fuel_prices(is_community);

-- Migrate existing data
UPDATE fuel_prices 
SET is_community = TRUE
WHERE price_updated_by = 'community';

-- Verify it worked
SELECT 
    COUNT(*) as total_prices,
    COUNT(*) FILTER (WHERE is_community = TRUE) as community_prices,
    COUNT(*) FILTER (WHERE is_community = FALSE) as official_prices
FROM fuel_prices;
```

### Option 3: Upload Files to EC2

If you don't have direct EC2 access:

**1. Upload migration files:**
```bash
scp -i ~/.ssh/your-key.pem \
  backend/database/migrations/007_add_is_community_to_fuel_prices.sql \
  backend/database/apply-migration-007.js \
  ubuntu@fuelfinder.duckdns.org:/home/ubuntu/Fuel-FInder/backend/database/
```

**2. SSH and run:**
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@fuelfinder.duckdns.org
cd /home/ubuntu/Fuel-FInder/backend/database
node apply-migration-007.js
```

## Verification

After running the migration:

### 1. Check column exists
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fuel_prices' 
  AND column_name = 'is_community';
```

**Expected:** One row showing `is_community | boolean | false`

### 2. Test owner stations API
```bash
curl -X GET "https://fuelfinder.duckdns.org/api/owner/stations" \
  -H "x-api-key: H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=" \
  -H "x-owner-domain: ifuel-dangay"
```

**Expected:** `200 OK` with station data (not 500 error)

### 3. Test in browser
1. Visit: https://ifuel-dangay-portal.netlify.app
2. Login with API key
3. Check all tabs load:
   - ✅ Overview
   - ✅ Stations (should show station list)
   - ✅ Pending Reports

### 4. Check PM2 logs
```bash
pm2 logs fuel-finder --lines 30
```

**Expected:** No more "column is_community does not exist" errors

## What This Column Does

The `is_community` column tracks the source of price updates:

- **`FALSE`** (default): Price set by admin or station owner (official)
- **`TRUE`**: Price reported by community users (needs verification)

This allows:
- Displaying community-reported prices with a special indicator
- Owners to approve/reject community price submissions
- Filtering official vs community prices in queries

## Files Created

- ✅ `backend/database/migrations/007_add_is_community_to_fuel_prices.sql`
- ✅ `backend/database/apply-migration-007.js`
- ✅ `FIX_IS_COMMUNITY_COLUMN.md` (this file)

## Related Issue

This is related to the owner portal system where community users can report fuel prices, and station owners can verify them. The column is used in:

1. **`ownerController.js:97`** - Fetching stations with fuel prices
   ```javascript
   'is_community', fp.is_community,
   ```

2. **`ownerController.js:390`** - Inserting verified price
   ```javascript
   INSERT INTO fuel_prices (..., is_community, ...)
   VALUES (..., TRUE, ...)
   ```

## No Backend Code Changes Needed

The backend code (`ownerController.js`) is already correct and expects this column. You just need to add the column to your database.

## Status

🔧 **MIGRATION READY** - Run on EC2 to fix the error

After applying this migration, the owner portal will work correctly.
