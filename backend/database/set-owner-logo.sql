-- Set Owner Logo URL and Theme Colors
-- Usage: Replace the domain, logoUrl, brandName, and colors with your values

-- ⚠️ IMPORTANT: Use NESTED structure with "colors" object (not flat primaryColor)
-- Frontend expects: theme_config.colors.primary (not theme_config.primaryColor)

-- ✅ RECOMMENDED: Set complete theme config (logo + colors together)
UPDATE owners
SET theme_config = '{
  "brandName": "Your Brand Name",
  "logoUrl": "https://your-cdn.com/path/to/logo.png",
  "colors": {
    "primary": "#FF6B00",
    "secondary": "#FFB800",
    "accent": "#00D4FF",
    "background": "#0A0E1A",
    "surface": "#151B2E",
    "text": "#FFFFFF",
    "textSecondary": "#B0B8D4"
  },
  "mode": "dark",
  "fonts": {
    "heading": "Inter, system-ui, -apple-system, sans-serif",
    "body": "Inter, system-ui, -apple-system, sans-serif"
  },
  "features": {
    "analytics": true,
    "priceVerification": true,
    "stationEditing": true,
    "customFuelTypes": true
  }
}'::jsonb
WHERE domain = 'ifuel-dangay';

-- Verify the update (use nested access: colors->>'primary')
SELECT 
  domain,
  name,
  theme_config->>'logoUrl' as logo_url,
  theme_config->>'brandName' as brand_name,
  theme_config->'colors'->>'primary' as primary_color,
  theme_config->'colors'->>'secondary' as secondary_color,
  theme_config->'colors'->>'background' as background_color,
  theme_config->>'mode' as mode
FROM owners
WHERE domain = 'ifuel-dangay';

-- Alternative: Set ONLY logo (preserves existing colors if any)
-- ⚠️ WARNING: If theme_config is empty, this will result in missing colors!
/*
UPDATE owners
SET theme_config = jsonb_set(
  COALESCE(theme_config, '{}'::jsonb),
  '{logoUrl}',
  to_jsonb('https://your-cdn.com/path/to/logo.png'::text),
  true
)
WHERE domain = 'ifuel-dangay';
*/

-- Alternative: Add colors to existing theme_config (preserves logo)
/*
UPDATE owners
SET theme_config = theme_config || jsonb_build_object(
  'primaryColor', '#FF6B35',
  'secondaryColor', '#004E89',
  'backgroundColor', '#F7F7F7',
  'textColor', '#333333'
)
WHERE domain = 'ifuel-dangay';
*/

-- View all owner theme configs
-- SELECT domain, name, theme_config FROM owners;
