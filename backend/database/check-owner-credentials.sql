-- Check Owner Credentials
-- Run this query on your Supabase/PostgreSQL database to find the correct API key

-- =====================================================
-- 1. Check if owner exists with domain 'ifuel-dangay'
-- =====================================================
SELECT 
    id,
    name,
    domain,
    api_key,
    email,
    contact_person,
    is_active,
    created_at
FROM owners
WHERE domain = 'ifuel-dangay';

-- If no results, check all owners:
SELECT 
    domain,
    name,
    is_active,
    LENGTH(api_key) as key_length,
    SUBSTRING(api_key, 1, 10) || '...' as key_preview
FROM owners
ORDER BY created_at DESC;

-- =====================================================
-- 2. Check stations assigned to this owner
-- =====================================================
SELECT 
    s.id,
    s.name,
    s.brand,
    s.address,
    o.domain as owner_domain
FROM stations s
LEFT JOIN owners o ON o.id = s.owner_id
WHERE o.domain = 'ifuel-dangay';

-- =====================================================
-- 3. If owner doesn't exist, create/update it
-- =====================================================

-- Option A: Create new owner if it doesn't exist
-- IMPORTANT: Save the generated API key somewhere safe!
/*
INSERT INTO owners (name, domain, email, contact_person, is_active, api_key)
VALUES (
    'iFuel Dangay Station',
    'ifuel-dangay',
    'admin@ifuel-dangay.com',
    'Admin',
    TRUE,
    encode(gen_random_bytes(32), 'base64')
)
ON CONFLICT (domain) DO NOTHING
RETURNING 
    domain,
    name,
    api_key as 'SAVE_THIS_API_KEY';
*/

-- Option B: Update existing owner's API key
-- Run this if you need to regenerate the API key
/*
UPDATE owners
SET api_key = encode(gen_random_bytes(32), 'base64')
WHERE domain = 'ifuel-dangay'
RETURNING 
    domain,
    name,
    api_key as 'NEW_API_KEY';
*/

-- Option C: Set a specific API key (if you already have one)
/*
UPDATE owners
SET api_key = 'YOUR_SPECIFIC_API_KEY_HERE'
WHERE domain = 'ifuel-dangay'
RETURNING 
    domain,
    name,
    api_key;
*/

-- =====================================================
-- 4. Assign stations to owner (if needed)
-- =====================================================

-- Find unassigned stations that might belong to iFuel Dangay
SELECT 
    id,
    name,
    brand,
    address,
    owner_id
FROM stations
WHERE name ILIKE '%ifuel%' OR name ILIKE '%dangay%';

-- Assign specific station to owner
/*
UPDATE stations
SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
WHERE name ILIKE '%ifuel%dangay%'
RETURNING id, name, brand;
*/
