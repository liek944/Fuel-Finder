-- =====================================================
-- Setup iFuel Dangay Station as Owner
-- Domain: ifuel-dangay.duckdns.org
-- =====================================================

-- Step 1: Create the owner with a secure API key
INSERT INTO owners (name, domain, api_key, email, contact_person, phone)
VALUES (
    'iFuel Dangay Station',
    'ifuel-dangay',  -- Matches the subdomain from ifuel-dangay.duckdns.org
    encode(gen_random_bytes(32), 'base64'),  -- Generates secure 32-byte API key
    'owner@ifuel-dangay.com',  -- TODO: Update with actual email
    'Station Owner Name',  -- TODO: Update with actual contact person
    '+63-XXX-XXX-XXXX'  -- TODO: Update with actual phone
)
RETURNING 
    id as owner_id,
    name,
    domain,
    api_key,
    email,
    created_at;

-- ⚠️ IMPORTANT: Save the API key from the output above!
-- You'll need it to authenticate API requests

-- Step 2: Find your iFuel station
SELECT 
    id,
    name,
    brand,
    address,
    owner_id
FROM stations 
WHERE name ILIKE '%iFuel%Dangay%' OR name ILIKE '%iFUEL%Dangay%';

-- Step 3: Link the station to the owner
-- Replace <STATION_ID> with the ID from the query above
UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
WHERE name ILIKE '%iFuel%Dangay%' OR name ILIKE '%iFUEL%Dangay%';

-- Step 4: Verify the setup
SELECT 
    s.id as station_id,
    s.name as station_name,
    s.brand,
    s.address,
    o.name as owner_name,
    o.domain as owner_domain,
    o.email as owner_email,
    o.is_active
FROM stations s
JOIN owners o ON s.owner_id = o.id
WHERE o.domain = 'ifuel-dangay';

-- Step 5: Check API access capability
SELECT 
    o.name as owner_name,
    o.domain,
    COUNT(s.id) as total_stations,
    o.is_active as api_enabled
FROM owners o
LEFT JOIN stations s ON s.owner_id = o.id
WHERE o.domain = 'ifuel-dangay'
GROUP BY o.id, o.name, o.domain, o.is_active;

-- =====================================================
-- Testing Instructions:
-- =====================================================
-- 1. Run this script in your PostgreSQL database
-- 2. Save the API key that's generated
-- 3. Test the API with curl:
--
--    curl -H "Host: ifuel-dangay.duckdns.org" \
--         http://localhost:3000/api/owner/info
--
-- 4. Test authenticated endpoint:
--
--    curl -H "Host: ifuel-dangay.duckdns.org" \
--         -H "x-api-key: YOUR_API_KEY_HERE" \
--         http://localhost:3000/api/owner/dashboard
--
-- =====================================================
