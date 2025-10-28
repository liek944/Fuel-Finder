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
SELECT 
  domain,
  name,
  theme_config->>'logoUrl' as logo_url,
  theme_config->>'primaryColor' as primary_color,
  theme_config->>'secondaryColor' as secondary_color,
  theme_config->>'backgroundColor' as background_color,
  theme_config->>'textColor' as text_color
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
