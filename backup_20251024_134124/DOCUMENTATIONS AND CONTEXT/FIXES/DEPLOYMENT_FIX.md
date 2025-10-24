# Fix for Image Upload Duplication Bug

## Problem
Images are being uploaded 3 times due to:
1. **Multiple PM2 instances** running in cluster mode
2. **Load balancer/reverse proxy** sending duplicate requests
3. **No request deduplication** in the backend

## Solution Applied

### 1. Created PM2 Ecosystem Configuration
- File: `backend/ecosystem.config.js`
- **Forces single instance** (no clustering)
- Prevents multiple processes from handling the same request

### 2. Added Request Deduplication Middleware
- Location: `backend/server.js` (lines 39-93)
- **Detects and blocks duplicate requests** within 5-second window
- Uses MD5 hash of: method + path + body + IP address
- Applied to all POST/PUT/PATCH endpoints

### 3. Protected Critical Endpoints
Added deduplication to:
- `POST /api/stations/:id/images` (station image upload)
- `POST /api/pois/:id/images` (POI image upload)
- `POST /api/stations` (station creation)
- `POST /api/pois` (POI creation)

## Deployment Steps on AWS EC2

### Step 1: Stop Current Backend
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to backend directory
cd /path/to/fuel_finder/backend

# Stop all PM2 processes
pm2 stop all
pm2 delete all
```

### Step 2: Pull Latest Code
```bash
# Pull the latest changes
git pull origin main

# Or if you're uploading manually, ensure these files are updated:
# - backend/server.js (with deduplication middleware)
# - backend/ecosystem.config.js (new file)
```

### Step 3: Restart with PM2 Ecosystem Config
```bash
# Start using the ecosystem config (ensures single instance)
pm2 start ecosystem.config.js

# Save the PM2 process list
pm2 save

# Setup PM2 to start on system reboot
pm2 startup
```

### Step 4: Verify Single Instance
```bash
# Check that only 1 instance is running
pm2 list

# You should see:
# ┌─────┬──────────────┬─────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ mode    │ ↺       │ status  │ cpu      │
# ├─────┼──────────────┼─────────┼─────────┼─────────┼──────────┤
# │ 0   │ fuel-finder  │ fork    │ 0       │ online  │ 0%       │
# └─────┴──────────────┴─────────┴─────────┴─────────┴──────────┘
#
# IMPORTANT: "mode" should be "fork", NOT "cluster"
# IMPORTANT: Only 1 row should appear

# Monitor logs
pm2 logs fuel-finder
```

### Step 5: Test Image Upload
1. Go to your admin portal
2. Upload a single image
3. Check the logs for:
   - ✅ Only ONE upload log entry
   - ⚠️  If duplicates appear, they should be blocked with "Duplicate request detected"
4. Verify in database that only 1 image record was created

## Verification Queries

### Check for Duplicate Images
```sql
-- Run this in your PostgreSQL database
SELECT 
  station_id,
  filename,
  COUNT(*) as count,
  array_agg(id) as image_ids
FROM images
WHERE station_id IS NOT NULL
GROUP BY station_id, filename
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

### Clean Up Existing Duplicates (if needed)
```sql
-- BACKUP YOUR DATABASE FIRST!
-- This keeps the oldest image and deletes duplicates

WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY station_id, filename 
      ORDER BY created_at ASC
    ) as rn
  FROM images
  WHERE station_id IS NOT NULL
)
DELETE FROM images
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

## Monitoring

### Check PM2 Status
```bash
pm2 status
pm2 monit  # Real-time monitoring
```

### View Logs
```bash
# All logs
pm2 logs

# Only errors
pm2 logs --err

# Specific app
pm2 logs fuel-finder

# Last 100 lines
pm2 logs --lines 100
```

### Check for Deduplication in Action
```bash
# Watch for duplicate request warnings
pm2 logs fuel-finder | grep "Duplicate request"
```

## Troubleshooting

### If Images Still Upload Multiple Times

1. **Check PM2 instances:**
   ```bash
   pm2 list
   # Should show ONLY 1 instance in "fork" mode
   ```

2. **Check if multiple PM2 daemons are running:**
   ```bash
   ps aux | grep PM2
   # Should show only 1 PM2 daemon
   ```

3. **Check nginx/reverse proxy config:**
   ```bash
   # If you're using nginx
   sudo nginx -t
   sudo systemctl status nginx
   
   # Check for proxy_pass duplication or retry logic
   sudo cat /etc/nginx/sites-enabled/fuel-finder
   ```

4. **Check for load balancer retries:**
   - AWS ELB/ALB might have retry logic
   - Check your AWS console for load balancer settings

### If Deduplication Blocks Legitimate Requests

Adjust the deduplication window in `server.js`:
```javascript
const DEDUP_WINDOW_MS = 5000; // Change to 2000 for 2 seconds
```

## Environment Variables

Ensure these are set in your `.env`:
```bash
NODE_ENV=production
PORT=3001
ADMIN_API_KEY=your-secret-key
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
```

## Success Indicators

✅ PM2 shows 1 instance in "fork" mode
✅ Image uploads create only 1 database record
✅ Logs show "Duplicate request detected" if duplicates arrive
✅ No duplicate filenames in Supabase Storage
✅ Admin portal shows correct image count

## Rollback Plan

If issues occur:
```bash
# Stop the new version
pm2 stop fuel-finder

# Start without ecosystem config (old way)
pm2 start server.js --name fuel-finder

# Or revert code changes
git revert HEAD
pm2 restart fuel-finder
```

## Additional Notes

- The deduplication middleware uses a **5-second window**
- Duplicate requests return **HTTP 202 Accepted** status
- Request hashing includes: method, path, body, and IP
- Old pending requests are automatically cleaned up
- The middleware is **stateless** and works with single instance only

## Contact

If issues persist after following these steps, check:
1. AWS EC2 instance type (ensure adequate resources)
2. Network latency between frontend and backend
3. Browser network tab for actual request count
4. PM2 logs for any errors or warnings
