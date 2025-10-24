# Quick Deploy Instructions - Price Reports Fix

## On Your EC2 Server

```bash
# 1. SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-server-ip

# 2. Navigate to backend directory
cd ~/Fuel-FInder/backend

# 3. Pull latest changes
git pull origin main  # or your branch name

# 4. Run deployment script
chmod +x deploy-price-reports-fix.sh
./deploy-price-reports-fix.sh
```

## Alternative Manual Deployment

```bash
cd ~/Fuel-FInder/backend
pm2 stop fuel-finder
git pull
npm install
pm2 restart fuel-finder
pm2 logs fuel-finder --lines 50
```

## Verify Fix

```bash
# Test admin endpoints
curl http://localhost:3000/api/admin/price-reports/pending
curl http://localhost:3000/api/admin/price-reports/stats

# Check PM2 logs for errors
pm2 logs fuel-finder --lines 50
```

## What Was Fixed

✅ **Table name mismatch:** Changed `price_reports` → `fuel_price_reports` in all queries  
✅ **Missing admin routes:** Created `/api/admin/*` endpoints  
✅ **Missing admin controller:** Created admin logic handlers  

## Files Modified

- `backend/repositories/priceRepository.js` - Fixed 9 SQL queries
- `backend/repositories/stationRepository.js` - Fixed 1 SQL query
- `backend/routes/adminRoutes.js` - Created (NEW)
- `backend/controllers/adminController.js` - Created (NEW)
- `backend/routes/index.js` - Registered admin routes

---

See `DOCUMENTATIONS AND CONTEXT/PRICE_REPORTS_TABLE_FIX.md` for full details.
