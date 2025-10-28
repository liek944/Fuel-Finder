# Owner Logo Fix

## Problem
The owner login page was not displaying logos even though `logoUrl` was set in the database's `theme_config` field.

## Root Cause
The owner detection middleware (`backend/middleware/ownerDetection.js`) was not including `theme_config` in its SQL queries. Therefore:
- `req.ownerData.theme_config` was `undefined`
- `/api/owner/info` returned `theme_config: {}` (empty object)
- Frontend received no `logoUrl` and showed owner name instead

## Solution
Added `theme_config` to the SELECT statements in both SQL queries:
1. **detectOwner** (line 92): Used by `/api/owner/info` endpoint
2. **optionalOwnerDetection** (line 148): For consistency across owner detection

### Changes Made

**File:** `backend/middleware/ownerDetection.js`

```sql
-- BEFORE
SELECT id, name, domain, email, contact_person, phone, is_active, created_at 
FROM owners 
WHERE domain = $1 AND is_active = TRUE

-- AFTER
SELECT id, name, domain, email, contact_person, phone, is_active, created_at, theme_config
FROM owners 
WHERE domain = $1 AND is_active = TRUE
```

## Where Logo is Used

### OwnerLogin.tsx (✅ Fixed)
- Renders logo if `ownerInfo.theme_config.logoUrl` exists
- Falls back to owner name if no logo
- Now receives logo URL from API

### OwnerDashboard.tsx (Header Only)
- Does NOT render logo by design
- Only shows owner name and domain in header
- Can be enhanced if needed

## Verification Steps

### Backend Test
```bash
# Test owner info endpoint (replace URL and subdomain)
curl -s -H "x-owner-domain: ifuel-dangay" \
  https://fuelfinder.duckdns.org/api/owner/info | jq

# Expected response:
{
  "name": "iFuel Dangay Station",
  "domain": "ifuel-dangay",
  "contact_person": "Juan Dela Cruz",
  "email": "ifuel.dangay@example.com",
  "phone": "+63 912 345 6789",
  "theme_config": {
    "logoUrl": "https://your-cdn.com/logo.png",
    "primaryColor": "#FF6B35",
    "secondaryColor": "#004E89"
  }
}
```

### Frontend Test
1. Navigate to owner login page: `https://ifuel-dangay.fuelfinder.com/login`
2. Open browser DevTools → Network tab
3. Find the `/api/owner/info` request
4. Verify response includes `theme_config` with `logoUrl`
5. Logo should now display above the login form

## Setting the Logo URL

If you need to set or update the logo for an owner:

```sql
-- Set logo URL (preserves other theme_config fields)
UPDATE owners
SET theme_config = jsonb_set(
  COALESCE(theme_config, '{}'::jsonb),
  '{logoUrl}',
  to_jsonb('https://your-cdn.com/path/to/logo.png'::text),
  true
)
WHERE domain = 'ifuel-dangay';
```

**Important:** The logo URL must be:
- Publicly accessible (no authentication required)
- HTTPS (for secure sites)
- Use `logoUrl` (camelCase), not `logo_url`

## Theme Config Structure

```json
{
  "logoUrl": "https://cdn.example.com/logo.png",
  "primaryColor": "#FF6B35",
  "secondaryColor": "#004E89",
  "backgroundColor": "#F7F7F7",
  "textColor": "#333333"
}
```

The frontend `OwnerThemeContext` applies these colors to:
- Login page gradient background
- Button colors
- Brand accents

## Deployment

```bash
# On EC2 server
cd /home/ubuntu/fuel-finder/backend
./deploy-owner-logo-fix.sh

# Or manually restart PM2
pm2 restart fuel-finder-backend
```

## Files Modified
- `backend/middleware/ownerDetection.js` (2 SQL queries updated)

## Related Files
- `frontend/src/components/owner/OwnerLogin.tsx` (logo rendering)
- `frontend/src/contexts/OwnerThemeContext.tsx` (theme application)
- `backend/controllers/ownerController.js` (getOwnerInfo endpoint)
- `backend/database/migrations/007_add_owner_theme_config.sql` (theme_config column)

## Status
✅ **FIXED** - Owner logos now display on login page after backend restart

## Future Enhancements
- Add logo to OwnerDashboard header
- Admin interface for uploading/managing logos
- Logo validation (size, format, accessibility)
- CDN integration for logo storage
