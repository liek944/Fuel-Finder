-- ==========================================
-- ADD NEW STATION OWNER TEMPLATE
-- ==========================================
-- 
-- Instructions:
-- 1. Replace ALL_CAPS_VALUES with actual data
-- 2. Run this SQL in your database client
-- 3. Save the API key securely
-- 4. Assign stations to the new owner
-- ==========================================

-- Step 1: Create the owner
INSERT INTO owners (
    name, 
    domain, 
    api_key, 
    email, 
    contact_person, 
    phone,
    is_active
) VALUES (
    'OWNER_COMPANY_NAME',                    -- e.g., 'Shell Station Network'
    'SUBDOMAIN_NAME',                        -- e.g., 'shell-network' (becomes shell-network.fuelfinder.com)
    'PASTE_GENERATED_API_KEY_HERE',          -- From crypto.randomBytes(32).toString('base64')
    'contact@email.com',                     -- Owner's contact email
    'CONTACT_PERSON_NAME',                   -- e.g., 'Juan Dela Cruz'
    '+63-XXX-XXX-XXXX',                     -- Phone number
    TRUE                                     -- Active status
) RETURNING id, name, domain, api_key;

-- ⚠️ IMPORTANT: Copy and save the returned API key!

-- Step 2: Get the owner ID (if not shown above)
SELECT id, name, domain 
FROM owners 
WHERE domain = 'SUBDOMAIN_NAME';

-- Step 3: Assign existing stations to this owner
-- Replace <OWNER_ID> with the ID from Step 2
-- Replace station IDs with your actual station IDs
UPDATE stations 
SET owner_id = '<OWNER_ID>'
WHERE id IN (1, 2, 3);  -- Replace with actual station IDs

-- Step 4: Verify the assignment
SELECT 
    s.id,
    s.name AS station_name,
    s.brand,
    o.name AS owner_name,
    o.domain
FROM stations s
LEFT JOIN owners o ON o.id = s.owner_id
WHERE o.domain = 'SUBDOMAIN_NAME';

-- Step 5: Test owner access
-- Copy this info for the owner:
SELECT 
    '🏪 Owner Portal Access' as info,
    name as company_name,
    domain || '.fuelfinder.com' as portal_url,
    api_key as secret_key,
    email,
    contact_person
FROM owners
WHERE domain = 'SUBDOMAIN_NAME';
