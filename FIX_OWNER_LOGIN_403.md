# Fix Owner Login 403 Error

## Problem
Getting error when trying to login to owner dashboard:
```
GET https://fuelfinder.duckdns.org/api/owner/dashboard 403 (Forbidden)
Invalid API key. Please check your credentials
```

## Root Cause
The owner account with domain `ifuel-dangay` either:
1. **Doesn't exist in the database**, OR
2. **Has a different API key** than what you're using

Looking at the database setup script, there's no owner with domain `ifuel-dangay`. The "iFUEL Dangay" station was assigned to the `roxaspetro` owner instead.

## Solution

You need to create the `ifuel-dangay` owner account in your database. Choose ONE of these options:

---

## Option 1: Use Existing API Key (Recommended if you already have users)

If you already gave out the API key `H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=` to the station owner, run this:

### On Supabase SQL Editor or psql:

```sql
-- Run this SQL script
\i /path/to/backend/database/create-ifuel-dangay-owner.sql
```

Or copy-paste this directly:

```sql
-- Create the owner with your existing API key
INSERT INTO owners (
    name, 
    domain, 
    api_key, 
    email, 
    contact_person, 
    phone, 
    is_active
) VALUES (
    'iFuel Dangay Station',
    'ifuel-dangay',
    'H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=',
    'admin@ifuel-dangay.com',
    'iFuel Admin',
    '+63-900-000-0000',
    TRUE
)
ON CONFLICT (domain) DO UPDATE SET
    name = EXCLUDED.name,
    api_key = EXCLUDED.api_key,
    is_active = EXCLUDED.is_active;

-- Assign the station
UPDATE stations
SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
WHERE name ILIKE '%ifuel%dangay%';

-- Verify it worked
SELECT 
    name,
    domain,
    api_key,
    is_active
FROM owners
WHERE domain = 'ifuel-dangay';
```

**Login with:**
- URL: https://ifuel-dangay-portal.netlify.app
- API Key: `H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=`

---

## Option 2: Generate New Secure API Key (Recommended for fresh start)

If you want to generate a brand new secure API key:

### On Supabase SQL Editor or psql:

```sql
-- Run this SQL script
\i /path/to/backend/database/create-ifuel-dangay-owner-new-key.sql
```

Or copy-paste this:

```sql
-- Create owner with NEW random API key
INSERT INTO owners (
    name, 
    domain, 
    api_key, 
    email, 
    contact_person, 
    phone, 
    is_active
) VALUES (
    'iFuel Dangay Station',
    'ifuel-dangay',
    encode(gen_random_bytes(32), 'base64'),  -- Generates secure random key
    'admin@ifuel-dangay.com',
    'iFuel Admin',
    '+63-900-000-0000',
    TRUE
)
ON CONFLICT (domain) DO UPDATE SET
    api_key = encode(gen_random_bytes(32), 'base64')
RETURNING 
    name,
    domain,
    api_key as 'SAVE_THIS_API_KEY';  -- ⚠️ COPY THIS VALUE!

-- Assign the station
UPDATE stations
SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
WHERE name ILIKE '%ifuel%dangay%';
```

**Important:** The query will return the new API key. Copy it immediately and save it somewhere secure!

---

## Option 3: Quick Check - Maybe Owner Already Exists?

Run this to check if the owner exists with a different domain name:

```sql
-- Check all existing owners
SELECT 
    domain,
    name,
    LEFT(api_key, 20) || '...' as api_key_preview,
    is_active
FROM owners
ORDER BY created_at DESC;

-- Check which owner has iFuel Dangay station
SELECT 
    s.name as station_name,
    o.domain as owner_domain,
    o.name as owner_name,
    LEFT(o.api_key, 20) || '...' as api_key_preview
FROM stations s
LEFT JOIN owners o ON o.id = s.owner_id
WHERE s.name ILIKE '%ifuel%dangay%';
```

If you see the station is assigned to a different owner (like `roxaspetro`), you can either:
- **Login with that domain instead:** https://roxaspetro-portal.netlify.app (with roxaspetro's API key)
- **OR reassign the station** to a new `ifuel-dangay` owner (use Option 1 or 2 above)

---

## Verification Steps

After running the SQL, verify everything works:

### 1. Check owner exists:
```sql
SELECT * FROM owners WHERE domain = 'ifuel-dangay';
```

Expected result: One row with the owner details and API key.

### 2. Check stations are assigned:
```sql
SELECT 
    s.id,
    s.name,
    s.brand,
    o.domain as owner_domain
FROM stations s
JOIN owners o ON o.id = s.owner_id
WHERE o.domain = 'ifuel-dangay';
```

Expected result: At least one station (like "iFUEL Dangay" or "IFuel Dangay").

### 3. Check dashboard view works:
```sql
SELECT * FROM owner_dashboard_stats WHERE domain = 'ifuel-dangay';
```

Expected result: Dashboard stats showing total_stations, pending_reports, etc.

### 4. Test login in browser:

1. Go to: https://ifuel-dangay-portal.netlify.app
2. Enter the API key (the one from your SQL query results)
3. Click "Login to Dashboard"
4. Should redirect to dashboard with Overview, Stations, and Reports tabs

---

## Common Issues

### Issue: "Subdomain 'fuelfinder' is not registered"

**Problem:** You're accessing the portal from the wrong URL.

**Solution:** Always use: `https://ifuel-dangay-portal.netlify.app`  
NOT: `https://fuelfinder.duckdns.org`

### Issue: "Owner not found" even after creating it

**Problem:** The `domain` column doesn't match what the frontend is sending.

**Solution:** Check what subdomain the frontend is detecting:

```javascript
// In browser console at ifuel-dangay-portal.netlify.app
console.log(window.location.hostname);  // Should show: ifuel-dangay-portal.netlify.app
localStorage.getItem('owner_subdomain');  // Should show: ifuel-dangay
```

Make sure the `domain` in the database matches this exactly (case-sensitive).

### Issue: Station not showing in Stations tab

**Problem:** Station's `owner_id` is NULL or points to different owner.

**Solution:**
```sql
-- Find the station
SELECT id, name, brand, owner_id FROM stations 
WHERE name ILIKE '%ifuel%';

-- Assign it
UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
WHERE id = [STATION_ID];  -- Use actual ID from query above
```

---

## Quick Copy-Paste Solution

If you just want to get it working ASAP, run this complete script:

```sql
-- Complete setup script
BEGIN;

-- Create owner
INSERT INTO owners (name, domain, api_key, email, is_active) 
VALUES (
    'iFuel Dangay Station',
    'ifuel-dangay',
    'H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=',
    'admin@ifuel-dangay.com',
    TRUE
)
ON CONFLICT (domain) DO UPDATE SET
    api_key = EXCLUDED.api_key,
    is_active = EXCLUDED.is_active;

-- Assign station(s)
UPDATE stations
SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
WHERE name ILIKE '%ifuel%dangay%';

-- Show results
SELECT 'Owner created:' as status, name, domain, api_key, is_active
FROM owners WHERE domain = 'ifuel-dangay';

SELECT 'Stations assigned:' as status, id, name, brand
FROM stations 
WHERE owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay');

COMMIT;
```

**Then login with:**
- **URL:** https://ifuel-dangay-portal.netlify.app
- **API Key:** `H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=`

---

## Files Created

- ✅ `/backend/database/check-owner-credentials.sql` - Check existing owners
- ✅ `/backend/database/create-ifuel-dangay-owner.sql` - Create with existing key  
- ✅ `/backend/database/create-ifuel-dangay-owner-new-key.sql` - Create with new key
- ✅ `/backend/database/check-owner-api-key.js` - Node.js checker script

## Need Help?

If still not working:

1. Check PM2 logs: `pm2 logs fuelfinder-backend`
2. Check if owner detection is working: Look for console logs like:
   ```
   🏷️ Owner domain from header: ifuel-dangay
   👤 Owner request detected: iFuel Dangay Station (ifuel-dangay)
   ```
3. Check if API key matches exactly (no extra spaces or quotes)
4. Verify the database view was recreated (from previous fix)
