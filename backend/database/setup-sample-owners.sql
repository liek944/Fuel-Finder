-- Setup Sample Owners for Testing
-- This script creates sample owners with API keys for testing the owner dashboard

-- Insert sample owners
INSERT INTO owners (
    name, 
    domain, 
    api_key, 
    email, 
    contact_person, 
    phone, 
    is_active
) VALUES 
(
    'Castillon Fuels',
    'castillonfuels',
    'castillon_api_key_2024_secure_123',
    'admin@castillonfuels.com',
    'Maria Castillon',
    '+63-912-345-6789',
    TRUE
),
(
    'Santos Gas Stations',
    'santosgas',
    'santos_api_key_2024_secure_456',
    'admin@santosgas.com',
    'Juan Santos',
    '+63-917-123-4567',
    TRUE
),
(
    'Roxas Petroleum',
    'roxaspetro',
    'roxas_api_key_2024_secure_789',
    'admin@roxaspetro.com',
    'Pedro Roxas',
    '+63-918-987-6543',
    TRUE
)
ON CONFLICT (domain) DO UPDATE SET
    name = EXCLUDED.name,
    api_key = EXCLUDED.api_key,
    email = EXCLUDED.email,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active;

-- Assign some stations to owners
UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'castillonfuels' LIMIT 1)
WHERE name IN ('Castillon Gas Station', 'Castillon Express');

UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'santosgas' LIMIT 1)
WHERE name IN ('Kings Gas Station', 'Alliance');

UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'roxaspetro' LIMIT 1)
WHERE name IN ('iFUEL Dangay', 'STOP N GAS');

-- Verify the setup
SELECT 
    'Sample owners created' as status,
    COUNT(*) as total_owners
FROM owners 
WHERE is_active = TRUE;

-- Show owner details
SELECT 
    name,
    domain,
    api_key,
    email,
    contact_person
FROM owners 
WHERE is_active = TRUE
ORDER BY name;

-- Show station assignments
SELECT 
    s.name as station_name,
    s.brand,
    o.name as owner_name,
    o.domain
FROM stations s
LEFT JOIN owners o ON o.id = s.owner_id
WHERE s.owner_id IS NOT NULL
ORDER BY o.name, s.name;
