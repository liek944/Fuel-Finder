# Owner Logo Deployment Checklist

## Pre-Deployment

- [x] ✅ Identified root cause (middleware missing theme_config)
- [x] ✅ Updated `ownerDetection.js` SQL queries
- [x] ✅ Created deployment script
- [x] ✅ Created test script
- [x] ✅ Created documentation

## Deployment Steps

### Step 1: Verify Current State
```bash
# Check if backend is running
pm2 list

# Test current API response (should show empty theme_config or missing)
curl -s -H "x-owner-domain: ifuel-dangay" \
  https://fuelfinder.duckdns.org/api/owner/info | jq '.theme_config'
```

**Expected (Before Fix):** `{}` or field missing

### Step 2: Deploy Backend Fix
```bash
cd /home/keil/fuel_finder/backend
./deploy-owner-logo-fix.sh
```

**Or manually:**
```bash
pm2 restart fuel-finder-backend
# Wait 5 seconds for restart
sleep 5
pm2 logs fuel-finder-backend --lines 20
```

### Step 3: Verify Fix Applied
```bash
# Run automated test
cd /home/keil/fuel_finder
./test-owner-logo.sh ifuel-dangay

# Or manual test
curl -s -H "x-owner-domain: ifuel-dangay" \
  https://fuelfinder.duckdns.org/api/owner/info | jq '.theme_config'
```

**Expected (After Fix):** JSONB object (may be empty if no logo set)

### Step 4: Set Logo URL (if needed)
```bash
# Connect to database
psql -h your-db-host -U your-user -d your-database

# Set logo
UPDATE owners
SET theme_config = jsonb_set(
  COALESCE(theme_config, '{}'::jsonb),
  '{logoUrl}',
  to_jsonb('https://your-cdn.com/logo.png'::text),
  true
)
WHERE domain = 'ifuel-dangay';

# Verify
SELECT domain, theme_config->>'logoUrl' as logo 
FROM owners 
WHERE domain = 'ifuel-dangay';
```

### Step 5: Test in Browser
1. Open: `https://ifuel-dangay.fuelfinder.com/login`
2. Open DevTools (F12) → Network tab
3. Refresh page
4. Find `/api/owner/info` request
5. Check response for `theme_config.logoUrl`
6. Verify logo displays above login form

## Verification Checklist

### Backend Tests
- [ ] `/api/owner/info` returns 200 status
- [ ] Response includes `theme_config` field
- [ ] `theme_config` is valid JSONB (not null/undefined)
- [ ] `theme_config.logoUrl` exists (null if not set)
- [ ] Other theme fields present (primaryColor, etc.)

### Frontend Tests
- [ ] Login page loads without errors
- [ ] Logo displays if URL is set
- [ ] Fallback text shows if no logo
- [ ] Theme colors apply to UI elements
- [ ] No console errors in DevTools
- [ ] Responsive layout works on mobile

### Logo URL Tests (if logo set)
- [ ] Logo URL is publicly accessible
- [ ] Logo loads in browser (no 404)
- [ ] Image displays correctly (not broken)
- [ ] File size reasonable (< 500KB)
- [ ] Format supported (PNG/JPG/SVG)
- [ ] HTTPS if main site is HTTPS

## Rollback Plan

If issues occur after deployment:

```bash
# 1. Check PM2 logs for errors
pm2 logs fuel-finder-backend --err --lines 50

# 2. If critical error, rollback code
cd /home/keil/fuel_finder/backend
git log --oneline -5
git revert HEAD  # If committed
# Or restore from backup

# 3. Restart backend
pm2 restart fuel-finder-backend

# 4. Verify services restored
curl -s https://fuelfinder.duckdns.org/health | jq
```

## Common Issues & Solutions

### Issue 1: theme_config still empty after deploy
**Cause:** Backend not restarted properly  
**Solution:**
```bash
pm2 restart fuel-finder-backend --force
pm2 logs fuel-finder-backend --lines 10
```

### Issue 2: Logo doesn't display even with URL set
**Cause:** Logo URL not accessible or CORS issue  
**Solution:**
```bash
# Test logo URL accessibility
curl -I https://your-logo-url.com/logo.png

# Should return HTTP 200
# Check for CORS headers if needed
```

### Issue 3: Frontend shows old data
**Cause:** Browser cache or localStorage  
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Clear localStorage in DevTools

### Issue 4: 404 on /api/owner/info
**Cause:** Route not registered or backend crashed  
**Solution:**
```bash
# Check if backend is running
pm2 list

# Check routes are loaded
pm2 logs fuel-finder-backend | grep "Owner routes"

# Restart if needed
pm2 restart fuel-finder-backend
```

## Documentation References

- **Quick Summary:** `OWNER_LOGO_FIX_SUMMARY.md`
- **Detailed Guide:** `OWNER_LOGO_FIX.md`
- **Architecture:** `OWNER_LOGO_ARCHITECTURE.md`
- **SQL Helpers:** `backend/database/set-owner-logo.sql`
- **Test Script:** `test-owner-logo.sh`

## Support Queries

```sql
-- Check all owners with logos
SELECT domain, name, theme_config->>'logoUrl' as logo
FROM owners
WHERE theme_config->>'logoUrl' IS NOT NULL;

-- Check owners missing logos  
SELECT domain, name
FROM owners
WHERE theme_config IS NULL 
   OR theme_config->>'logoUrl' IS NULL;

-- View complete theme config
SELECT domain, name, theme_config
FROM owners
ORDER BY domain;
```

## Success Criteria

✅ Fix is successful when:
1. Backend returns theme_config in API response
2. Logo displays on owner login page (if URL set)
3. Theme colors apply to UI elements
4. No errors in browser console
5. No errors in backend logs
6. Multiple owner subdomains work independently

## Post-Deployment

- [ ] Monitor PM2 logs for errors: `pm2 logs fuel-finder-backend`
- [ ] Test with different owner subdomains
- [ ] Notify owners of new branding capability
- [ ] Document in owner onboarding guide
- [ ] Update admin documentation
- [ ] Consider adding logo management UI

---

**Status:** Ready for deployment  
**Estimated Time:** 5-10 minutes  
**Risk Level:** Low (non-breaking change)  
**Rollback Time:** < 2 minutes
