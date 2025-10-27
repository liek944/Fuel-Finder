-- ==========================================
-- Migration 007: Add Theme Configuration Support
-- ==========================================
-- This migration adds theme customization for owners and stations
-- Allows per-owner branding (colors, logos, fonts) and optional station overrides

-- Add theme_config to owners table
ALTER TABLE owners
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}'::jsonb;

-- Add theme_config to stations table (optional overrides)
ALTER TABLE stations
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN owners.theme_config IS 'Owner branding configuration (colors, logo, fonts, features)';
COMMENT ON COLUMN stations.theme_config IS 'Station-specific theme overrides (optional)';

-- Create index for faster theme queries
CREATE INDEX IF NOT EXISTS idx_owners_theme_config ON owners USING GIN (theme_config);
CREATE INDEX IF NOT EXISTS idx_stations_theme_config ON stations USING GIN (theme_config);

-- Insert sample theme for iFuel Dangay owner
UPDATE owners
SET theme_config = '{
  "brandName": "iFuel Dangay",
  "logoUrl": null,
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

-- Migration complete
SELECT 'Migration 007 completed: Theme configuration support added' as status;
