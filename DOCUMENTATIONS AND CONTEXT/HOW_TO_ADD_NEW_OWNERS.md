# How to Add New Station Owners

## 📚 Overview

This guide explains how to add new station owners to the Fuel Finder system. Each owner gets:
- ✅ Unique subdomain (e.g., `shell-network.fuelfinder.com`)
- ✅ Secure API key for authentication
- ✅ Access to manage only their stations
- ✅ Ability to verify community-submitted prices
- ✅ Analytics dashboard

## 🚀 Method 1: Interactive Script (Recommended)

The easiest way to add a new owner:

```bash
cd backend
node database/add-owner-interactive.js
```

This script will:
1. ✅ Guide you through the setup process
2. ✅ Generate a secure API key automatically
3. ✅ Create the owner in the database
4. ✅ Optionally assign stations
5. ✅ Display all access information

### Example Session:

```
╔════════════════════════════════════════════════════════════╗
║         ADD NEW STATION OWNER - INTERACTIVE SETUP          ║
╚════════════════════════════════════════════════════════════╝

📋 STEP 1: Owner Information

Company/Owner Name: Shell Station Network
Subdomain: shell-network
Contact Email: admin@shellnetwork.com
Contact Person Name: Maria Santos
Phone Number: +63-917-555-1234

🔐 STEP 2: Generating Secure API Key
✓ API Key generated: xK8fJ2mP9qR4vW7tN3bH...

...

✅ SETUP COMPLETE!

Portal URL:       https://shell-network.fuelfinder.com
API Key:          xK8fJ2mP9qR4vW7tN3bH6yL1sD5gA8zCbN9xV2mL4sR=
```

---

## 🛠️ Method 2: Manual SQL (Advanced)

### Step 1: Generate API Key

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use the template script
cd backend/database
```

### Step 2: Use SQL Template

Edit the template file:

```bash
cd backend/database
cp add-new-owner-template.sql shell-network-owner.sql
# Edit shell-network-owner.sql with your values
```

### Step 3: Execute SQL

```sql
-- Example: Adding Shell Station Network
INSERT INTO owners (
    name, 
    domain, 
    api_key, 
    email, 
    contact_person, 
    phone,
    is_active
) VALUES (
    'Shell Station Network',
    'shell-network',
    'xK8fJ2mP9qR4vW7tN3bH6yL1sD5gA8zCbN9xV2mL4sR=',
    'admin@shellnetwork.com',
    'Maria Santos',
    '+63-917-555-1234',
    TRUE
) RETURNING id, name, domain, api_key;
```

**Copy the returned `id` for the next step!**

### Step 4: Assign Stations

```sql
-- Replace <OWNER_ID> with the ID from Step 3
UPDATE stations 
SET owner_id = '<OWNER_ID>'
WHERE id IN (10, 11, 12, 13);  -- Your station IDs

-- Verify the assignment
SELECT 
    s.id,
    s.name AS station_name,
    o.name AS owner_name,
    o.domain
FROM stations s
JOIN owners o ON o.id = s.owner_id
WHERE o.domain = 'shell-network';
```

---

## 🔍 Finding Stations to Assign

### List All Unassigned Stations

```sql
SELECT id, name, brand, address
FROM stations
WHERE owner_id IS NULL
ORDER BY name;
```

### List All Stations by Location

```sql
SELECT id, name, brand, address, 
       ST_Y(location::geometry) as latitude,
       ST_X(location::geometry) as longitude
FROM stations
WHERE owner_id IS NULL
ORDER BY address;
```

### Search by Name/Brand

```sql
SELECT id, name, brand, address
FROM stations
WHERE owner_id IS NULL
  AND (name ILIKE '%shell%' OR brand ILIKE '%shell%')
ORDER BY name;
```

---

## 📋 Information to Provide to Owner

After creating the owner, provide them with:

### 1. Portal Access Details

```
🏪 Owner Portal Access Information
═══════════════════════════════════════════════════════════

Portal URL:       https://shell-network.fuelfinder.com
Login URL:        https://shell-network.fuelfinder.com/owner/login
API Key:          xK8fJ2mP9qR4vW7tN3bH6yL1sD5gA8zCbN9xV2mL4sR=

Company:          Shell Station Network
Contact Email:    admin@shellnetwork.com
Contact Person:   Maria Santos

IMPORTANT: Keep your API key secure! It's like a password.
```

### 2. Instructions for First Login

```markdown
## How to Access Your Owner Portal

1. Visit: https://shell-network.fuelfinder.com
2. Click on "Owner Portal" or go to /owner/login
3. Enter your API Key when prompted
4. Click "Login to Dashboard"

## What You Can Do

✅ View all your stations
✅ Update station information (hours, prices, etc.)
✅ Approve/reject community price reports
✅ View analytics and statistics
✅ Manage fuel prices for all fuel types

## Need Help?

Contact the system administrator at: admin@fuelfinder.com
```

---

## 🌐 DNS Configuration (Production)

### Option 1: Individual Subdomain Records

Add A records in your DNS provider:

```
shell-network.fuelfinder.com    →  123.45.67.89 (your server IP)
petron-calapan.fuelfinder.com   →  123.45.67.89
ifuel-dangay.fuelfinder.com     →  123.45.67.89
```

### Option 2: Wildcard DNS (Recommended)

Single record that works for all subdomains:

```
*.fuelfinder.com  →  123.45.67.89
```

**Pros:**
- ✅ No need to add DNS for each new owner
- ✅ Instantly works for new subdomains
- ✅ Easier to manage

**Note:** If using Netlify/Vercel, configure subdomain routing in their dashboard.

---

## 🧪 Testing the New Owner

### 1. Test Subdomain Detection

```bash
# Test owner info endpoint (no API key needed)
curl -H "Host: shell-network.fuelfinder.com" \
     http://localhost:3000/api/owner/info

# Expected: Returns owner information
```

### 2. Test API Key Authentication

```bash
# Test dashboard with API key
curl -H "Host: shell-network.fuelfinder.com" \
     -H "x-api-key: YOUR_API_KEY_HERE" \
     http://localhost:3000/api/owner/dashboard

# Expected: Returns dashboard statistics
```

### 3. Test in Browser

1. Visit `http://shell-network.localhost:3000` (or your domain)
2. Should show the owner login page
3. Enter the API key
4. Should redirect to dashboard

### 4. Test Data Isolation

```bash
# Owner A's stations
curl -H "Host: shell-network.fuelfinder.com" \
     http://localhost:3000/api/stations

# Should only return Shell Network's stations

# Owner B's stations
curl -H "Host: ifuel-dangay.fuelfinder.com" \
     http://localhost:3000/api/stations

# Should only return iFuel Dangay's stations
```

---

## 🔒 Security Best Practices

### API Key Management

1. **Generate Strong Keys**
   - Use `crypto.randomBytes(32).toString('base64')`
   - Never use simple/predictable keys

2. **Store Securely**
   - Owner stores in browser localStorage only
   - Never commit to git or public repos
   - Share via secure channel (encrypted email, password manager)

3. **Rotation (Optional)**
   ```sql
   -- Update owner's API key
   UPDATE owners 
   SET api_key = 'NEW_GENERATED_KEY',
       updated_at = NOW()
   WHERE domain = 'shell-network';
   ```

### Subdomain Naming Rules

- ✅ Use lowercase letters only
- ✅ Use hyphens for spaces (e.g., `shell-network`)
- ✅ Keep it short and memorable
- ❌ No special characters (only `a-z`, `0-9`, `-`)
- ❌ No underscores or spaces

**Examples:**
- Good: `shell-network`, `petron-calapan`, `ifuel-dangay`
- Bad: `Shell_Network`, `Petron Calapan`, `iFuel@Dangay`

---

## 📊 Managing Multiple Owners

### View All Owners

```sql
SELECT 
    id,
    name,
    domain || '.fuelfinder.com' as portal_url,
    email,
    contact_person,
    is_active,
    (SELECT COUNT(*) FROM stations WHERE owner_id = owners.id) as station_count,
    created_at
FROM owners
ORDER BY created_at DESC;
```

### View Owner Statistics

```sql
SELECT 
    o.name,
    o.domain,
    COUNT(DISTINCT s.id) as total_stations,
    COUNT(DISTINCT pr.id) as total_price_reports,
    COUNT(DISTINCT CASE WHEN pr.is_verified THEN pr.id END) as verified_reports,
    MAX(pr.created_at) as last_report_date
FROM owners o
LEFT JOIN stations s ON s.owner_id = o.id
LEFT JOIN fuel_price_reports pr ON pr.station_id = s.id
WHERE o.is_active = TRUE
GROUP BY o.id, o.name, o.domain
ORDER BY total_stations DESC;
```

### Reassign Stations

```sql
-- Move stations from Owner A to Owner B
UPDATE stations
SET owner_id = (SELECT id FROM owners WHERE domain = 'owner-b')
WHERE owner_id = (SELECT id FROM owners WHERE domain = 'owner-a')
  AND id IN (10, 11, 12);
```

### Deactivate Owner (Don't Delete)

```sql
-- Soft delete - keeps data but disables access
UPDATE owners
SET is_active = FALSE
WHERE domain = 'shell-network';

-- Reactivate later if needed
UPDATE owners
SET is_active = TRUE
WHERE domain = 'shell-network';
```

---

## ❓ Troubleshooting

### Issue: "Owner not found"

**Cause:** Subdomain doesn't exist in database or is inactive

**Solution:**
```sql
-- Check if owner exists
SELECT * FROM owners WHERE domain = 'subdomain-name';

-- Check if active
SELECT * FROM owners WHERE domain = 'subdomain-name' AND is_active = TRUE;
```

### Issue: "Invalid API key"

**Cause:** API key doesn't match or has extra spaces

**Solution:**
```sql
-- Verify API key (be careful - this shows the key!)
SELECT api_key FROM owners WHERE domain = 'subdomain-name';

-- Common issue: spaces in key
-- Always trim/copy-paste the key carefully
```

### Issue: Owner can't see their stations

**Cause:** Stations not assigned to owner

**Solution:**
```sql
-- Check station ownership
SELECT s.id, s.name, s.owner_id 
FROM stations s
WHERE s.id IN (1, 2, 3);

-- Assign stations to owner
UPDATE stations
SET owner_id = (SELECT id FROM owners WHERE domain = 'subdomain-name')
WHERE id IN (1, 2, 3);
```

### Issue: Portal shows wrong owner info

**Cause:** Browser cached old subdomain data

**Solution:**
1. Clear browser localStorage
2. Open browser DevTools (F12)
3. Go to Application > Local Storage
4. Delete `owner_api_key` and `owner_subdomain`
5. Refresh page

---

## 📝 Quick Reference Commands

```bash
# Generate API key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Run interactive setup
cd backend && node database/add-owner-interactive.js

# Test owner portal (local)
curl -H "Host: subdomain.localhost" http://localhost:3000/api/owner/info

# View database
psql -d your_database -c "SELECT * FROM owners;"

# Check station assignments
psql -d your_database -c "SELECT s.name, o.name as owner FROM stations s LEFT JOIN owners o ON o.id = s.owner_id;"
```

---

## 📚 Related Documentation

- **OWNER_ACCESS_CONTROL_GUIDE.md** - Complete technical implementation guide
- **OWNER_ACCESS_QUICK_REFERENCE.md** - API endpoints and curl commands
- **add-new-owner-template.sql** - SQL template for manual creation
- **add-owner-interactive.js** - Interactive setup script

---

## 💡 Tips

1. **Always test locally first** before adding to production
2. **Save API keys immediately** - they're shown only once during creation
3. **Use descriptive subdomain names** - owners will access these URLs daily
4. **Assign at least one station** to each owner for testing
5. **Document each owner** - keep a spreadsheet of owner details

---

**Last Updated:** October 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
