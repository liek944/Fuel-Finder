# Frontend Upload Testing Guide

## 🎯 Test if Frontend is Making Multiple Requests

Since your AWS infrastructure is correct (1 instance, no load balancers), 
the issue is likely the FRONTEND making multiple API calls.

## 🧪 Test Steps

### Step 1: Open Browser DevTools
1. Open your admin portal
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Go to **Network** tab (in a separate tab)

### Step 2: Clear Everything
1. In Network tab, click the **🚫 Clear** button
2. In Console tab, click the **🚫 Clear console** button

### Step 3: Upload 1 Image
1. Select 1 image to upload
2. Click the Upload button **ONCE**
3. **DO NOT CLICK AGAIN** - just wait

### Step 4: Check Network Tab
In the Network tab:
1. Filter by: `images` or type `/api/stations`
2. Look for POST requests to `/api/stations/{id}/images`
3. **Count them!**

**Expected:** ✅ **1 POST request**
**If broken:** ❌ **3 POST requests** (or multiple)

### Step 5: Check Console Logs
In the Console tab, look for logs like:

**If you see this (GOOD):**
```
🖱️ Upload button clicked for station 31
🆔 [abc123] Upload function called for station 31
🚀 [abc123] Starting upload for station 31 with 1 images
```

**If you see this (BAD - frontend issue):**
```
🖱️ Upload button clicked for station 31
🖱️ Upload button clicked for station 31  ← DUPLICATE!
🖱️ Upload button clicked for station 31  ← DUPLICATE!
```
OR
```
🆔 [abc123] Upload function called for station 31
🆔 [def456] Upload function called for station 31  ← Different IDs = multiple calls!
🆔 [ghi789] Upload function called for station 31  ← Different IDs = multiple calls!
```

### Step 6: Check Service Worker
1. In DevTools, go to **Application** tab
2. Click **Service Workers** in left sidebar
3. Look for your app's service worker
4. If you see it, click **Unregister**
5. **Reload the page twice** (Ctrl+Shift+R)
6. Try uploading again

## 📊 What the Results Mean

### Scenario A: Network Tab Shows 3 POST Requests
**Problem:** Frontend is making 3 separate API calls
**Cause:** 
- React event handlers attached multiple times
- React StrictMode causing re-renders
- Service Worker interfering

**Fix:** Deploy the updated frontend code I created

### Scenario B: Network Tab Shows 1 POST Request
**Problem:** 1 request reaches backend but creates 3 images
**This shouldn't be possible** with 1 EC2 instance and 1 node process

**Need to check:** Backend request deduplication logs

### Scenario C: Console Shows Multiple Upload IDs
**Problem:** Upload function is being called multiple times
**Fix:** Deploy the updated frontend code

## 🚀 Next Steps Based on Results

### If Network Tab Shows 3 Requests:
The frontend needs to be updated and redeployed with my fixes:
1. Enhanced upload locks
2. Event propagation prevention
3. Global API deduplication

### If Network Tab Shows 1 Request But 3 Images Created:
This is very unusual. Would need to check:
1. Backend request handler being called 3 times somehow
2. Database query running 3 times
3. Image service creating duplicates

## 💡 Quick Test Without Rebuilding

Try disabling React StrictMode temporarily:

Edit `frontend/src/index.tsx`:
```typescript
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
```

Then rebuild:
```bash
cd frontend
npm run build
# Deploy
```

Test again. If fixed → StrictMode was causing it (but my code should handle this).

---

**Report back with:**
1. How many POST requests in Network tab? 
2. What do Console logs show?
3. Screenshot if possible
