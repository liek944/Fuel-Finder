-- Migration 007: Add is_community column to fuel_prices table
-- This column tracks whether the price is from community reporting (true) or admin/owner (false)

-- Add the is_community column
ALTER TABLE fuel_prices 
ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT FALSE;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_fuel_prices_is_community ON fuel_prices(is_community);

-- Migrate existing data: if price_updated_by contains 'community', set is_community = TRUE
UPDATE fuel_prices 
SET is_community = TRUE
WHERE price_updated_by = 'community';

-- Add comment
COMMENT ON COLUMN fuel_prices.is_community IS 'TRUE if price was submitted by community, FALSE if set by admin/owner';

-- Show results
SELECT 
    'Migration 007 complete' as status,
    COUNT(*) as total_prices,
    COUNT(*) FILTER (WHERE is_community = TRUE) as community_prices,
    COUNT(*) FILTER (WHERE is_community = FALSE) as official_prices
FROM fuel_prices;
