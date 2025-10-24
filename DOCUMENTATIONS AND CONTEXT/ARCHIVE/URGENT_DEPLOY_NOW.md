# 🚨 URGENT: Deploy Image Fix NOW

## Current Status
❌ **Production is DOWN** - PostgreSQL error on all station/POI endpoints  
❌ **Admin portal shows white screen**

## What Happened
My previous fix added `DISTINCT` with `ORDER BY`, which PostgreSQL rejects:
```
error: in an aggregate with DISTINCT, ORDER BY expressions must appear in argument list
```

## Fix Applied
✅ Removed `ORDER BY` from all `DISTINCT JSON_AGG` calls  
✅ DISTINCT still works (compares full JSONB object)  
✅ Image duplication fixed AND PostgreSQL error resolved

---

## Deploy to EC2 (Production) - DO THIS NOW

### Option 1: Automated Script (Recommended)
```bash
# SSH to EC2
ssh ubuntu@your-ec2-server

# Navigate to backend
cd /home/ubuntu/Fuel-FInder/backend

# Pull latest changes (if pushed to git)
git pull origin main

# Run urgent fix script
./deploy-image-fix-urgent.sh
```

### Option 2: Quick PM2 Restart
```bash
# SSH to EC2
ssh ubuntu@your-ec2-server

# Navigate and pull changes
cd /home/ubuntu/Fuel-FInder/backend
git pull origin main

# Restart PM2
pm2 restart fuel-finder

# Watch logs for errors
pm2 logs fuel-finder --lines 50
```

### Option 3: Manual File Transfer (If git isn't synced)
```bash
# From your local machine, copy fixed files to EC2
scp /home/keil/fuel_finder/backend/repositories/stationRepository.js \
    ubuntu@your-ec2:/home/ubuntu/Fuel-FInder/backend/repositories/

scp /home/keil/fuel_finder/backend/repositories/poiRepository.js \
    ubuntu@your-ec2:/home/ubuntu/Fuel-FInder/backend/repositories/

# Then SSH and restart
ssh ubuntu@your-ec2-server
cd /home/ubuntu/Fuel-FInder/backend
pm2 restart fuel-finder
pm2 logs fuel-finder
```

---

## Verify Fix Works

### 1. Check Logs (Should see NO errors)
```bash
pm2 logs fuel-finder --lines 100 | grep -i "error"
```

### 2. Test API
```bash
# Should return stations (not errors)
curl https://fuelfinder.duckdns.org/api/stations

# Should return POIs
curl https://fuelfinder.duckdns.org/api/pois
```

### 3. Test in Browser
1. Open https://fuelfinder.duckdns.org
2. ✅ Map should load with markers
3. ✅ Click station → popup should open
4. ✅ Admin portal should load (no white screen)

---

## Files Changed
- `backend/repositories/stationRepository.js` (lines 33-40, 95-102, 147-154)
- `backend/repositories/poiRepository.js` (lines 43-50, 81-88, 121-128)

**Change:** Removed `ORDER BY i.display_order, i.id` from 6 DISTINCT JSON_AGG calls

---

## What's Fixed
✅ Image duplication resolved (DISTINCT works without ORDER BY)  
✅ PostgreSQL error eliminated  
✅ All API endpoints working  
✅ Admin portal loads normally  
✅ Station markers display  
✅ POI markers display

---

## If You Need to Push to Git First
```bash
# From local machine
cd /home/keil/fuel_finder/backend
git add repositories/stationRepository.js repositories/poiRepository.js
git commit -m "Fix: Remove ORDER BY from DISTINCT JSON_AGG (PostgreSQL compatibility)"
git push origin main

# Then on EC2
ssh ubuntu@your-ec2-server
cd /home/ubuntu/Fuel-FInder/backend
git pull origin main
pm2 restart fuel-finder
```

---

## Expected Results After Deploy

### PM2 Logs Should Show:
```
✅ Server running on port 3000
✅ Database connected successfully
✅ Finding stations near...
✅ Finding POIs near...
```

### Should NOT Show:
```
❌ error: in an aggregate with DISTINCT, ORDER BY expressions must appear
❌ code: '42P10'
```

---

## Time to Deploy: ~2 minutes
## Estimated Downtime: 30 seconds (PM2 restart)

**Deploy NOW to restore production!**
