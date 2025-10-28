-- Fix Owner Theme Colors
-- Restores CORRECT nested structure that frontend expects

-- First, check current (broken) state
SELECT 
  domain,
  name,
  theme_config
FROM owners
WHERE domain = 'ifuel-dangay';

-- ✅ FIX: Use CORRECT nested structure with colors object
UPDATE owners
SET theme_config = '{
  "brandName": "iFuel Dangay",
  "logoUrl": "https://pngimg.com/d/gas_station_PNG38.png",
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

-- Verify the fix (correct nested access)
SELECT 
  domain,
  name,
  theme_config->>'logoUrl' as logo_url,
  theme_config->'colors'->>'primary' as primary_color,
  theme_config->'colors'->>'secondary' as secondary_color,
  theme_config->'colors'->>'background' as background_color,
  theme_config->'colors'->>'text' as text_color,
  theme_config->>'mode' as mode
FROM owners
WHERE domain = 'ifuel-dangay';
