# Owner Portal Netlify Deployment Fix

**Issue**: Owner portal at `ifuel-dangay-portal.netlify.app` was showing main app instead of owner login.

**Root Cause**: The system was designed for subdomain-based routing (e.g., `ifuel-dangay.fuelfinder.com`), but your Netlify deployment uses separate domains without subdomains.

---

## Solution Implemented

### Backend Changes

**File**: `backend/middleware/ownerDetection.js`

Added fallback detection using `x-owner-domain` header when hostname-based subdomain detection fails:

```javascript
// Method 1: Try to extract subdomain from hostname
let subdomain = extractSubdomain(req.hostname);

// Method 2: If no subdomain, check x-owner-domain header (for Netlify deployments)
if (!subdomain) {
  const ownerDomainHeader = req.header("x-owner-domain");
  if (ownerDomainHeader) {
    subdomain = ownerDomainHeader;
    console.log(`🏷️  Owner domain from header: ${subdomain}`);
  }
}
```

### Frontend Changes

**Files**: 
- `frontend/src/App.tsx`
- `frontend/src/components/owner/OwnerLogin.tsx`
- `frontend/src/components/owner/OwnerDashboard.tsx`

#### 1. Updated App.tsx Subdomain Detection

Now detects Netlify owner portals by checking for `-portal` in the site name:

```typescript
// Pattern: owner-name-portal.netlify.app
if (siteName.includes('-portal')) {
  // Extract owner name: "ifuel-dangay-portal" -> "ifuel-dangay"
  const ownerName = siteName.replace('-portal', '');
  return ownerName;
}
```

#### 2. Replaced All API Headers

Changed from forbidden `Host` header to custom `x-owner-domain` header:

```typescript
// ❌ OLD (doesn't work in browsers)
headers: {
  'x-api-key': apiKey,
  'Host': `${subdomain}.fuelfinder.com`
}

// ✅ NEW (works with Netlify)
headers: {
  'x-api-key': apiKey,
  'x-owner-domain': subdomain
}
```

---

## Deployment Architecture

### Current Setup
```
Main App:      fuelfinderths.netlify.app
Owner Portal:  ifuel-dangay-portal.netlify.app
Backend API:   fuelfinder.duckdns.org
```

### How It Works Now

1. **Frontend Detection** (`App.tsx`)
   - User visits: `ifuel-dangay-portal.netlify.app`
   - Detects `-portal` in domain name
   - Extracts owner: `ifuel-dangay`
   - Routes to `OwnerLogin` component

2. **API Communication**
   - Frontend sends: `x-owner-domain: ifuel-dangay`
   - Backend receives header
   - Looks up owner in database
   - Validates API key
   - Returns owner-specific data

---

## Deployment Steps

### 1. Deploy Backend Changes

```bash
cd backend
pm2 restart fuel-finder-api
```

Or if backend not running:
```bash
npm start
```

### 2. Deploy Frontend to Netlify

```bash
cd frontend

# Build the project
npm run build

# Deploy to Netlify (if using Netlify CLI)
netlify deploy --prod

# Or deploy via Git push (if connected to GitHub)
git add .
git commit -m "Fix owner portal subdomain detection for Netlify"
git push origin main
```

### 3. Configure Environment Variables

In **Netlify Dashboard** → Site Settings → Environment Variables:

```
VITE_API_BASE_URL=https://fuelfinder.duckdns.org
```

### 4. Test Owner Portal

Visit: `https://ifuel-dangay-portal.netlify.app`

**Expected Behavior**:
- ✅ Shows owner login page (not main app)
- ✅ Displays "iFuel Dangay Station" header
- ✅ Login with API key: `H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=`
- ✅ Redirects to dashboard
- ✅ Shows station data and price reports

**Check Browser Console**:
```
🔍 Hostname: ifuel-dangay-portal.netlify.app
🔍 Detected Netlify owner portal: ifuel-dangay
```

---

## Testing Checklist

### Frontend Tests
- [ ] Visit `ifuel-dangay-portal.netlify.app` shows owner login (not main app)
- [ ] Owner name displays correctly on login page
- [ ] API key input field visible
- [ ] No console errors on page load

### Backend Tests
- [ ] Backend logs show: `🏷️ Owner domain from header: ifuel-dangay`
- [ ] Login with valid API key succeeds
- [ ] Invalid API key shows error
- [ ] Dashboard loads owner-specific data

### Full Flow Test
1. Visit owner portal URL
2. See owner login page ✅
3. Enter API key: `H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=`
4. Click "Login to Dashboard"
5. See dashboard with station data
6. Navigate to "Stations" tab
7. See "IFuel Dangay" station (ID: 52)
8. Navigate to "Reports" tab
9. See pending price reports (if any)
10. Test approve/reject functionality

---

## Creating More Owner Portals

To add another owner portal (e.g., for Castillon Fuels):

### 1. Deploy New Netlify Site

```bash
# Create new deployment for castillonfuels
netlify deploy --prod --site castillonfuels-portal
```

**Site name**: `castillonfuels-portal.netlify.app`

### 2. Owner Already Exists in Database

```sql
SELECT domain, api_key FROM owners WHERE domain = 'castillonfuels';
```

### 3. Test New Portal

Visit: `https://castillonfuels-portal.netlify.app`

Login with Castillon Fuels API key.

---

## Naming Convention

**Important**: Owner portal Netlify sites MUST follow this pattern:

```
{owner-domain}-portal.netlify.app
```

Examples:
- ✅ `ifuel-dangay-portal.netlify.app` → owner: `ifuel-dangay`
- ✅ `castillonfuels-portal.netlify.app` → owner: `castillonfuels`
- ✅ `santosgas-portal.netlify.app` → owner: `santosgas`
- ❌ `ifuel-dangay.netlify.app` → won't be detected as owner portal
- ❌ `owner-portal.netlify.app` → can't extract owner name

---

## Rollback Plan

If issues occur, you can rollback:

### Backend Rollback
```bash
cd backend
git checkout HEAD~1 middleware/ownerDetection.js
pm2 restart fuel-finder-api
```

### Frontend Rollback
The old code still works for custom domains with subdomains. Only Netlify deployments need the new code.

---

## Alternative: Custom Domain Setup (Future)

For a cleaner setup, consider purchasing a domain:

```
Main App:        app.fuelfinder.com → Netlify
Owner Portals:   ifuel-dangay.fuelfinder.com → Netlify
                 castillonfuels.fuelfinder.com → Netlify
Backend API:     api.fuelfinder.com → EC2
```

With this setup, both hostname-based and header-based detection work.

---

## Files Modified

### Backend
- `backend/middleware/ownerDetection.js` - Added `x-owner-domain` header support

### Frontend
- `frontend/src/App.tsx` - Updated Netlify portal detection
- `frontend/src/components/owner/OwnerLogin.tsx` - Changed to `x-owner-domain` header
- `frontend/src/components/owner/OwnerDashboard.tsx` - Changed to `x-owner-domain` header

---

## Summary

✅ **Fixed**: Owner portal now works with Netlify separate domain deployments  
✅ **Backward Compatible**: Still works with subdomain-based routing  
✅ **Scalable**: Easy to add more owner portals  
✅ **Secure**: API key validation unchanged

**Status**: Ready for deployment and testing!
