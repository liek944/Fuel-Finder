-- Set Owner Logo URL
-- Usage: Replace the domain and logoUrl with your values

-- Example: Set logo for ifuel-dangay
UPDATE owners
SET theme_config = jsonb_set(
  COALESCE(theme_config, '{}'::jsonb),
  '{logoUrl}',
  to_jsonb('https://your-cdn.com/path/to/logo.png'::text),
  true
)
WHERE domain = 'ifuel-dangay';

-- Verify the update
SELECT 
  domain,
  name,
  theme_config->>'logoUrl' as logo_url,
  theme_config->>'primaryColor' as primary_color,
  theme_config->>'secondaryColor' as secondary_color
FROM owners
WHERE domain = 'ifuel-dangay';

-- Optional: Set full theme config (logo + colors)
/*
UPDATE owners
SET theme_config = jsonb_build_object(
  'logoUrl', 'https://your-cdn.com/path/to/logo.png',
  'primaryColor', '#FF6B35',
  'secondaryColor', '#004E89',
  'backgroundColor', '#F7F7F7',
  'textColor', '#333333'
)
WHERE domain = 'ifuel-dangay';
*/

-- View all owner theme configs
-- SELECT domain, name, theme_config FROM owners;
