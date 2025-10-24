# Price Reports Table Name Fix

## Problem Summary

The application was experiencing critical errors:
1. ❌ `error: relation "price_reports" does not exist` (PostgreSQL error code 42P01)
2. ❌ `Route GET /api/admin/price-reports/pending not found`
3. ❌ Price reports and statistics not visible in admin panel

## Root Cause

**Table Name Mismatch:**
- **Database table name:** `fuel_price_reports` (as defined in schema.sql and migrations)
- **Code reference:** `price_reports` (incorrect table name used in repository queries)

**Missing Admin Routes:**
- No admin routes file existed for `/api/admin/*` endpoints
- Admin controller was missing

## Files Fixed

### 1. `/backend/repositories/priceRepository.js`
Changed all SQL queries from `price_reports` to `fuel_price_reports`:
- ✅ `submitPriceReport()` - Fixed INSERT query
- ✅ `getPriceReports()` - Fixed SELECT query
- ✅ `getLatestVerifiedPrice()` - Fixed SELECT query
- ✅ `getAveragePriceFromReports()` - Fixed SELECT query
- ✅ `verifyPriceReport()` - Fixed UPDATE query
- ✅ `deletePriceReport()` - Fixed DELETE query
- ✅ `getPriceReportStats()` - Fixed SELECT query
- ✅ `getPriceReportTrends()` - Fixed SELECT query
- ✅ `getPendingPriceReports()` - Fixed SELECT query

**Schema Column Adjustments:**
- Changed `reporter_name` → `reporter_identifier`
- Changed `reporter_contact` → `reporter_ip`
- Changed `photo_url` → `notes`

### 2. `/backend/routes/adminRoutes.js` (NEW)
Created admin routes for:
- `GET /api/admin/price-reports/pending` - Get unverified reports
- `GET /api/admin/price-reports/stats` - Get statistics
- `GET /api/admin/price-reports/trends` - Get price trends
- `POST /api/admin/price-reports/:id/verify` - Verify a report
- `DELETE /api/admin/price-reports/:id` - Delete a report
- `PUT /api/admin/stations/:id/prices` - Update station prices

**Note:** Uses existing custom `middleware/rateLimiter.js` (not express-rate-limit package)

### 3. `/backend/controllers/adminController.js` (NEW)
Created admin controller with functions:
- `getPendingPriceReports()`
- `getPriceReportStats()`
- `getPriceReportTrends()`
- `verifyPriceReport()`
- `deletePriceReport()`
- `updateStationPrices()`

### 4. `/backend/routes/index.js`
- ✅ Added `adminRoutes` import
- ✅ Registered `/admin` route prefix

## Database Schema Reference

```sql
CREATE TABLE fuel_price_reports (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(50) DEFAULT 'Regular',
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    reporter_ip VARCHAR(45),
    reporter_identifier VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints Fixed

### Price Reporting (User Endpoints)
- ✅ `POST /api/stations/:id/report-price` - Submit price report
- ✅ `GET /api/stations/:id/price-reports` - Get reports for station
- ✅ `GET /api/stations/:id/average-price` - Get average price

### Admin Endpoints (NEW)
- ✅ `GET /api/admin/price-reports/pending` - List pending reports
- ✅ `GET /api/admin/price-reports/stats` - View statistics
- ✅ `GET /api/admin/price-reports/trends?days=7` - View price trends
- ✅ `POST /api/admin/price-reports/:id/verify` - Verify report
- ✅ `DELETE /api/admin/price-reports/:id` - Delete report
- ✅ `PUT /api/admin/stations/:id/prices` - Update station prices

## Deployment

### On EC2/Production Server:
```bash
cd ~/Fuel-FInder/backend
chmod +x deploy-price-reports-fix.sh
./deploy-price-reports-fix.sh
```

### Manual Deployment:
```bash
cd backend
pm2 stop fuel-finder
git pull  # if using git
npm install
pm2 restart fuel-finder
pm2 logs fuel-finder --lines 50
```

## Testing

### Test Admin Endpoints:
```bash
# Get pending reports
curl http://localhost:3000/api/admin/price-reports/pending

# Get stats
curl http://localhost:3000/api/admin/price-reports/stats

# Get trends (last 7 days)
curl http://localhost:3000/api/admin/price-reports/trends?days=7
```

### Test Price Reporting:
```bash
# Submit a price report
curl -X POST http://localhost:3000/api/stations/1/report-price \
  -H "Content-Type: application/json" \
  -d '{
    "fuel_type": "Regular",
    "price": 58.50,
    "notes": "Test price report"
  }'

# Get price reports for station
curl http://localhost:3000/api/stations/1/price-reports
```

## Verification Checklist

After deployment, verify:
- [ ] No more "relation does not exist" errors in PM2 logs
- [ ] `/api/admin/price-reports/pending` returns data (empty array if no reports)
- [ ] `/api/admin/price-reports/stats` returns statistics
- [ ] Price reports visible in admin dashboard
- [ ] Users can submit price reports
- [ ] Admin can verify/delete reports

## Related Files

- `backend/database/schema.sql` - Database schema definition
- `backend/database/migrations/001_add_price_reports.sql` - Migration file
- `backend/repositories/priceRepository.js` - Database queries
- `backend/controllers/adminController.js` - Admin logic
- `backend/routes/adminRoutes.js` - Admin routes
- `backend/routes/index.js` - Route aggregator

## Notes

- All 9 functions in priceRepository.js were updated
- Admin routes use existing custom rate limiter (configured via environment variables)
- Proper error handling with asyncHandler middleware
- Backwards compatible with existing price reporting feature
- No database migrations needed (table already exists with correct name)
- No new npm packages required (uses existing middleware)

---

**Fixed by:** Cascade AI Assistant  
**Date:** October 24, 2025  
**Issue:** PostgreSQL relation "price_reports" does not exist (42P01)  
**Solution:** Updated table references from `price_reports` to `fuel_price_reports`
