# Diagnostic Commands for Triple Upload Bug

## Problem
Network tab shows **1 POST request** but **3 images** are uploaded to database/storage.

This means: **1 request → 3 backend processes handling it**

## SSH into Your Server

```bash
ssh ubuntu@fuelfinder.duckdns.org
# or whatever your SSH command is
```

## Step 1: Check PM2 Status

```bash
pm2 list
```

**Expected Output:**
```
┌─────┬──────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ mode    │ ↺      │ status  │ cpu      │
├─────┼──────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ fuel-finder  │ fork    │ 0      │ online  │ 0%       │
└─────┴──────────────┴─────────┴─────────┴─────────┴──────────┘
```

**Look for:**
- **instances column** should show `1` or be blank
- **mode** should be `fork` (NOT `cluster`)
- Should only see **1 row** for fuel-finder

**If you see multiple rows** or **mode: cluster**:
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

## Step 2: Check for Multiple Node Processes

```bash
ps aux | grep "node.*server.js" | grep -v grep
```

**Expected Output:**
```
ubuntu   12345  0.5  2.1  123456 54321 ?  Ssl  09:00  0:15 node /path/to/server.js
```

Should show **ONLY 1 process**.

**If you see 3 processes**:
```bash
# Kill all and restart properly
pm2 delete all
pkill -f "node.*server.js"
cd /home/ubuntu/fuel_finder/backend  # or your backend path
pm2 start ecosystem.config.js
pm2 save
```

## Step 3: Check PM2 Daemon

```bash
ps aux | grep PM2 | grep -v grep
```

**Expected:** 1 PM2 daemon process

**If multiple daemons**:
```bash
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

## Step 4: Verify Ecosystem Config is Being Used

```bash
cd /home/ubuntu/fuel_finder/backend  # your backend path
cat ecosystem.config.js | grep -A 2 "instances"
```

**Should show:**
```javascript
instances: 1,
exec_mode: 'fork',
```

## Step 5: Check Backend Logs for Request IDs

```bash
pm2 logs fuel-finder --lines 50 | grep "🆔"
```

**What to look for:**

### If Working Correctly (1 upload):
```
🆔 [a1b2c3d4] 2025-01-14T09:46:00.000Z - Image upload request started
🆔 [a1b2c3d4] Processing upload for station 31
🆔 [a1b2c3d4] 📸 Uploading 1 images for station 31
🆔 [a1b2c3d4] ✅ Upload complete: 1 success, 0 errors
```
→ **1 unique request ID** = Good ✅

### If Bug Still Exists (3 uploads):
```
🆔 [a1b2c3d4] 2025-01-14T09:46:00.000Z - Image upload request started
🆔 [e5f6g7h8] 2025-01-14T09:46:00.001Z - Image upload request started
🆔 [i9j0k1l2] 2025-01-14T09:46:00.002Z - Image upload request started
```
→ **3 different request IDs** = Multiple processes handling same request ❌

## Step 6: Check Deduplication Logs

```bash
pm2 logs fuel-finder --lines 100 | grep "DUPLICATE"
```

**If you see:**
```
⚠️  DUPLICATE REQUEST BLOCKED: POST /api/stations/31/images
   Hash: a1b2c3d4...
   Time since original: 15ms
```
→ Deduplication is working, but requests are still getting through somehow

**If you see nothing:**
→ Deduplication middleware might not be applied or requests have different hashes

## Step 7: Test Deduplication Directly

```bash
cd /home/ubuntu/fuel_finder/backend
export ADMIN_API_KEY=your-actual-api-key
export TEST_STATION_ID=31
node test-upload-deduplication.js
```

**Expected Result:**
```
✅ TEST PASSED: Deduplication is working correctly!
   Only 1 request succeeded, 2 were blocked as duplicates.
```

## Step 8: Check Nginx/Load Balancer (If Applicable)

```bash
# Check if nginx is running
systemctl status nginx

# Check nginx config
cat /etc/nginx/sites-enabled/fuel-finder
```

**Look for:**
- Multiple `upstream` servers
- Retry logic
- Load balancing to multiple backends

## Fix Commands (If Multiple Instances Found)

### Nuclear Option: Complete Reset

```bash
# Stop everything
pm2 delete all
pm2 kill
pkill -f "node.*server.js"

# Wait 5 seconds
sleep 5

# Start fresh
cd /home/ubuntu/fuel_finder/backend
pm2 start ecosystem.config.js
pm2 save

# Verify
pm2 list
ps aux | grep "node.*server.js" | grep -v grep | wc -l  # Should output: 1
```

### Verify Fix

```bash
# Should show exactly 1 process
pm2 list

# Should show mode: fork, instances: 1
pm2 show fuel-finder | grep -E "mode|instances"

# Monitor logs
pm2 logs fuel-finder --lines 0
# Then upload an image and watch for request IDs
```

## Expected Behavior After Fix

1. **PM2 list** shows 1 instance in fork mode
2. **ps aux** shows 1 node process
3. **Backend logs** show 1 unique request ID per upload
4. **Database** has 1 image record per upload
5. **Supabase storage** has 1 file per upload

## If Still Not Fixed

Check these:

1. **Are you deploying to the right server?**
   ```bash
   hostname
   pwd
   ```

2. **Is the code actually updated?**
   ```bash
   cd /home/ubuntu/fuel_finder/backend
   git log -1
   grep "requestId = crypto.randomBytes" server.js
   ```

3. **Is PM2 using the right file?**
   ```bash
   pm2 show fuel-finder | grep "script path"
   ```

4. **Check for multiple deployment locations:**
   ```bash
   find /home -name "server.js" -path "*/fuel_finder/*" 2>/dev/null
   ```

## Contact Points

- PM2 process manager: `pm2 list`, `pm2 logs`
- System processes: `ps aux | grep node`
- Backend code: `/home/ubuntu/fuel_finder/backend/server.js`
- PM2 config: `/home/ubuntu/fuel_finder/backend/ecosystem.config.js`

---

**Most Likely Cause**: PM2 is running 3 instances despite ecosystem.config.js saying 1 instance.

**Quick Fix**: `pm2 delete all && pm2 start ecosystem.config.js && pm2 save`
