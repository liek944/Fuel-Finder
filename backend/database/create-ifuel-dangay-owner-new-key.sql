-- Create iFuel Dangay Owner Account with NEW SECURE API KEY
-- Run this if you want to generate a brand new API key

-- =====================================================
-- 1. Create owner with randomly generated secure API key
-- =====================================================

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
    encode(gen_random_bytes(32), 'base64'),  -- Generates secure random API key
    'admin@ifuel-dangay.com',
    'iFuel Admin',
    '+63-900-000-0000',
    TRUE
)
ON CONFLICT (domain) DO UPDATE SET
    name = EXCLUDED.name,
    api_key = encode(gen_random_bytes(32), 'base64'),  -- New API key on update
    email = EXCLUDED.email,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
RETURNING 
    name,
    domain,
    api_key as 'IMPORTANT_SAVE_THIS_API_KEY',
    email,
    is_active;

-- =====================================================
-- 2. Assign iFuel Dangay station(s)
-- =====================================================

UPDATE stations
SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
WHERE name ILIKE '%ifuel%dangay%'
   OR name ILIKE 'ifuel dangay%'
   OR name = 'IFuel Dangay'
   OR name = 'iFUEL Dangay'
RETURNING 
    id,
    name,
    brand,
    'Assigned to ifuel-dangay owner' as status;

-- =====================================================
-- 3. Display the new credentials
-- =====================================================

SELECT 
    '🔐 NEW OWNER CREDENTIALS' as notice,
    name,
    domain as 'LOGIN_URL: [domain]-portal.netlify.app',
    api_key as 'API_KEY_FOR_LOGIN',
    email,
    contact_person,
    is_active
FROM owners
WHERE domain = 'ifuel-dangay';

SELECT 
    '🏪 ASSIGNED STATIONS' as notice,
    s.id,
    s.name,
    s.brand,
    s.address
FROM stations s
WHERE s.owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay');

-- =====================================================
-- IMPORTANT NOTE
-- =====================================================
-- Copy the 'API_KEY_FOR_LOGIN' value from the results above
-- and use it to login at: https://ifuel-dangay-portal.netlify.app
