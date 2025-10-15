-- Migration: Add contact and hours fields to POIs table
-- This allows POIs to have address, phone, and operating hours like stations

ALTER TABLE pois ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE pois ADD COLUMN IF NOT EXISTS operating_hours JSONB;

-- Create index on type for faster filtering
CREATE INDEX IF NOT EXISTS idx_pois_type ON pois(type);

-- Mark migration as applied
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('004', 'Add address, phone, and operating_hours to pois table', NOW())
ON CONFLICT (version) DO NOTHING;
