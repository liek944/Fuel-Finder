# 🚀 Quick Fix Steps for Triple Upload Bug

Follow these steps **in order**. Don't skip any step!

## Step 1: Run Diagnostic Script

```bash
cd ~/fuel_finder
chmod +x debug-upload-issue.sh
./debug-upload-issue.sh
```

**Look at the output carefully!** It will tell you if there are issues with PM2 or node processes.

## Step 2: Fix Backend (If Issues Found)

If the diagnostic found multiple PM2 instances or node processes:

```bash
# Stop everything
pm2 delete all
pkill -f "node.*server.js"

# Wait 3 seconds
sleep 3

# Start fresh
cd ~/fuel_finder/backend
pm2 start ecosystem.config.js
pm2 save

# Verify
pm2 list
# Should show exactly 1 instance in fork mode
```

## Step 3: Update Frontend Code

The code has already been updated with:
- ✅ Enhanced upload tracking
- ✅ Event propagation prevention
- ✅ Global API deduplication
- ✅ Service Worker safeguards

Build and deploy:

```bash
cd frontend
npm run build
# Deploy to your hosting (Netlify/Vercel)
```

## Step 4: Clear Browser Cache & Service Worker

**THIS IS CRITICAL!** Old Service Worker can cause issues.

### In Chrome/Edge:
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. Click **Service Workers** (left sidebar under Application)
4. Find your app
5. Click **Unregister**
6. Go to **Storage** (left sidebar)
7. Click **Clear site data**
8. Close DevTools
9. Press `Ctrl + Shift + R` to hard reload **TWICE**

### In Firefox:
1. Press `F12`
2. Go to **Application** tab → **Service Workers**
3. Click **Unregister** next to your app
4. Press `Ctrl + Shift + Delete`
5. Select "Everything" and clear cache
6. Hard reload twice (`Ctrl + Shift + R`)

## Step 5: Test Upload

1. Open browser console (`F12` → Console tab)
2. Open Network tab as well
3. Upload **ONE** image
4. Watch the console logs

### What to Look For:

#### ✅ SUCCESS - You should see:
```
🖱️ Upload button clicked for station 31
🆔 [abc123] Upload function called for station 31
🚀 [abc123] Starting upload for station 31 with 1 images
📡 [abc123] Making API call to upload images
🔒 [API DEDUP] Request locked: POST:...
📤 [API] Making POST request to: ...
📥 [API] Response received (200) from: ...
✅ [abc123] Upload successful
✅ [abc123] Upload complete for station 31 - locks released
```

**AND** in Network tab: **Exactly 1 POST request**

#### ❌ STILL BROKEN - You'll see:
Multiple `🆔` with different IDs = Multiple uploads happening

```
🆔 [abc123] Upload function called for station 31
🆔 [def456] Upload function called for station 31  ← BAD!
🆔 [ghi789] Upload function called for station 31  ← BAD!
```

## Step 6: Verify Database

Check how many images were actually saved:

### Using Supabase Dashboard:
1. Go to Supabase → Table Editor
2. Open `images` table
3. Filter by your test station ID
4. Count the rows

**Should be exactly 1 image per upload**

## 🆘 If Still Not Working

### Run This Command on Server:
```bash
cd ~/fuel_finder/backend
pm2 logs fuel-finder --lines 100 | grep "🆔"
```

Count unique request IDs. Should be 1 per upload.

### Check This:
```bash
ps aux | grep "node.*server.js" | grep -v grep
```

**Must show exactly 1 process!**

If you see 3 processes:
```bash
pm2 delete all
pkill -f "node.*server.js"
pm2 start ecosystem.config.js
pm2 save
```

## 📞 Need More Help?

If none of this works, provide these:

1. **Frontend console logs** (full upload sequence)
2. **Backend logs**: `pm2 logs fuel-finder --lines 100`
3. **PM2 status**: `pm2 list` output
4. **Node processes**: `ps aux | grep node`
5. **Network tab screenshot** showing the POST requests

Copy all of this and share it.

---

## 🎯 Quick Checklist

- [ ] Ran diagnostic script
- [ ] Fixed PM2 if issues found (only 1 instance, fork mode)
- [ ] Built and deployed frontend
- [ ] Cleared browser cache & Service Worker
- [ ] Tested upload with console & Network tab open
- [ ] Verified only 1 image in database

**If all checked ✅ and still broken** → Something else is going on (load balancer, nginx, network infrastructure)
