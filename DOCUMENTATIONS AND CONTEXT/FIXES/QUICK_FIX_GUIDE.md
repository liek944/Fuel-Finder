# 🚀 Quick Fix Guide - Image Upload Duplication

## Problem
Uploading 1 image creates 3 duplicates in database and Supabase.

## Root Cause
PM2 running multiple instances + no request deduplication.

## Solution (5 Minutes)

### On Your AWS EC2 Instance

```bash
# 1. SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Navigate to backend
cd /path/to/fuel_finder/backend

# 3. Stop all PM2 processes
pm2 stop all
pm2 delete all

# 4. Pull latest code (or upload manually)
git pull origin main

# 5. Start with new config (SINGLE INSTANCE)
pm2 start ecosystem.config.js

# 6. Save PM2 config
pm2 save

# 7. Verify ONLY 1 instance is running
pm2 list
# ✅ Should show: 1 app, mode: "fork"
```

## Test It Works

```bash
# Watch logs
pm2 logs fuel-finder

# In another terminal, test upload
node test-deduplication.js

# Expected: "✅ TEST PASSED: Deduplication is working correctly!"
```

## What Changed

### 1. New File: `ecosystem.config.js`
Forces PM2 to run **only 1 instance** (no clustering).

### 2. Modified: `server.js`
Added middleware that **blocks duplicate requests** within 5 seconds.

## Verify Success

✅ **PM2 shows 1 instance**:
```bash
pm2 list
# Should show: instances: 1, mode: fork
```

✅ **Upload 1 image → Creates 1 record**:
- Check admin portal: 1 image appears
- Check database: 1 row in `images` table
- Check Supabase: 1 file uploaded

✅ **Logs show deduplication**:
```bash
pm2 logs | grep "Duplicate"
# Should see: "⚠️ Duplicate request detected and blocked"
```

## Rollback (If Needed)

```bash
pm2 stop fuel-finder
pm2 start server.js --name fuel-finder
```

## Files to Upload (If Not Using Git)

1. `backend/ecosystem.config.js` (NEW)
2. `backend/server.js` (MODIFIED - lines 39-93 added)

## Key Points

- ⚠️ **MUST use ecosystem.config.js** to start PM2
- ⚠️ **MUST have only 1 instance** running
- ✅ Deduplication blocks duplicates within 5 seconds
- ✅ No code changes needed in frontend

## Quick Check Commands

```bash
# Is PM2 running correctly?
pm2 list  # Should show 1 instance

# Are duplicates being blocked?
pm2 logs | grep -i duplicate

# How many PM2 processes?
ps aux | grep PM2  # Should be 1

# Test upload
curl -X POST http://localhost:3001/api/stations/20/images \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"images":[{"filename":"test.jpg","base64":"...","mimeType":"image/jpeg"}]}'
```

## Success Criteria

✅ PM2 list shows: `instances: 1, mode: fork`  
✅ Upload 1 image → See 1 image in admin portal  
✅ Database has no duplicate filenames  
✅ Logs show "Duplicate request detected" if retries occur  

## Need Help?

1. Read: `IMAGE_UPLOAD_BUG_FIX.md` (detailed explanation)
2. Read: `DEPLOYMENT_FIX.md` (full deployment guide)
3. Run: `node test-deduplication.js` (automated test)

---

**Time to Fix**: ~5 minutes  
**Downtime**: ~30 seconds (PM2 restart)  
**Risk**: Low (easy rollback)
