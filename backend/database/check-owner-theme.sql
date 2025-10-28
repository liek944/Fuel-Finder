-- Check Owner Theme Configuration
-- Quick queries to inspect owner theme settings

-- 1. View theme config for specific owner
SELECT 
  domain,
  name,
  theme_config
FROM owners
WHERE domain = 'ifuel-dangay';

-- 2. Extract specific theme fields (pretty formatted)
-- ⚠️ IMPORTANT: Use nested access -> colors->>'primary' (not ->>'primaryColor')
SELECT 
  domain,
  name,
  theme_config->>'brandName' as brand_name,
  theme_config->>'logoUrl' as logo_url,
  theme_config->'colors'->>'primary' as primary_color,
  theme_config->'colors'->>'secondary' as secondary_color,
  theme_config->'colors'->>'background' as background_color,
  theme_config->'colors'->>'text' as text_color,
  theme_config->>'mode' as mode
FROM owners
WHERE domain = 'ifuel-dangay';

-- 3. View all owners with their logo URLs
SELECT 
  domain,
  name,
  CASE 
    WHEN theme_config->>'logoUrl' IS NOT NULL 
    THEN theme_config->>'logoUrl'
    ELSE '(no logo set)'
  END as logo_status
FROM owners
ORDER BY domain;

-- 4. Find owners missing logos
SELECT 
  domain,
  name,
  contact_person,
  email
FROM owners
WHERE theme_config IS NULL 
   OR theme_config->>'logoUrl' IS NULL
ORDER BY domain;

-- 5. Check if theme_config column exists (troubleshooting)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'owners' 
  AND column_name = 'theme_config';
