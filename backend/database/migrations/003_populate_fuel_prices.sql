-- Populate fuel_prices table with sample data for existing stations
-- This adds Regular, Diesel, and Premium prices for each station

-- Insert fuel prices for existing stations
-- We'll add Regular, Diesel, and Premium for each station with realistic prices

-- Get all stations and add fuel prices
INSERT INTO fuel_prices (station_id, fuel_type, price, price_updated_by)
SELECT 
    id,
    'Regular',
    CASE 
        WHEN fuel_price IS NOT NULL THEN fuel_price
        ELSE 58.00
    END,
    'admin'
FROM stations
ON CONFLICT (station_id, fuel_type) DO NOTHING;

-- Add Diesel prices (typically cheaper than Regular in Philippines)
INSERT INTO fuel_prices (station_id, fuel_type, price, price_updated_by)
SELECT 
    id,
    'Diesel',
    CASE 
        WHEN fuel_price IS NOT NULL THEN fuel_price - 3.00
        ELSE 55.00
    END,
    'admin'
FROM stations
ON CONFLICT (station_id, fuel_type) DO NOTHING;

-- Add Premium prices (typically more expensive than Regular)
INSERT INTO fuel_prices (station_id, fuel_type, price, price_updated_by)
SELECT 
    id,
    'Premium',
    CASE 
        WHEN fuel_price IS NOT NULL THEN fuel_price + 4.00
        ELSE 62.00
    END,
    'admin'
FROM stations
ON CONFLICT (station_id, fuel_type) DO NOTHING;

-- Update the legacy fuel_price column to reflect the cheapest price
UPDATE stations
SET fuel_price = (
    SELECT MIN(price) 
    FROM fuel_prices 
    WHERE fuel_prices.station_id = stations.id
)
WHERE id IN (SELECT DISTINCT station_id FROM fuel_prices);
