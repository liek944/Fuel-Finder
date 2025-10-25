-- Create iFuel Dangay Owner Account
-- This script creates the owner account for iFuel Dangay station

-- =====================================================
-- 1. Create the owner (or update if exists)
-- =====================================================

-- Insert or update the owner
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
    'H8dyZF3oZx72k2EOSIjUrKeZOQ8MMmoYFr9NVv07g0I=',  -- Use this API key
    'admin@ifuel-dangay.com',
    'iFuel Admin',
    '+63-900-000-0000',
    TRUE
)
ON CONFLICT (domain) DO UPDATE SET
    name = EXCLUDED.name,
    api_key = EXCLUDED.api_key,
    email = EXCLUDED.email,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =====================================================
-- 2. Find and assign iFuel Dangay station
-- =====================================================

-- First, let's see what stations match
SELECT 
    id,
    name,
    brand,
    address,
    owner_id,
    CASE 
        WHEN owner_id IS NULL THEN 'Unassigned'
        ELSE (SELECT name FROM owners WHERE id = owner_id)
    END as current_owner
FROM stations
WHERE name ILIKE '%ifuel%' OR name ILIKE '%dangay%'
ORDER BY name;

-- Assign the station to ifuel-dangay owner
-- Adjust the WHERE clause based on the exact station name from query above
UPDATE stations
SET owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay')
WHERE name ILIKE '%ifuel%dangay%'
   OR id = 52  -- Use the actual station ID if you know it
RETURNING 
    id,
    name,
    brand,
    (SELECT domain FROM owners WHERE id = owner_id) as new_owner_domain;

-- =====================================================
-- 3. Verify the setup
-- =====================================================

-- Show the new owner details
SELECT 
    '✅ Owner Created' as status,
    name,
    domain,
    api_key as 'API_KEY_TO_USE_FOR_LOGIN',
    email,
    is_active
FROM owners
WHERE domain = 'ifuel-dangay';

-- Show assigned stations
SELECT 
    '✅ Assigned Stations' as status,
    s.id,
    s.name,
    s.brand,
    s.address
FROM stations s
WHERE s.owner_id = (SELECT id FROM owners WHERE domain = 'ifuel-dangay');

-- Test the dashboard stats view
SELECT 
    '✅ Dashboard Stats' as status,
    owner_name,
    domain,
    total_stations,
    pending_reports,
    verified_reports,
    total_actions
FROM owner_dashboard_stats
WHERE domain = 'ifuel-dangay';
