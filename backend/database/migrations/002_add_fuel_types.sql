-- Migration: Add support for multiple fuel types per station
-- This allows each station to have different prices for Regular, Diesel, Premium, etc.

-- Create fuel_prices table to store multiple fuel types per station
CREATE TABLE IF NOT EXISTS fuel_prices (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('Regular', 'Premium', 'Diesel', 'Premium Diesel', 'E85', 'LPG')),
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    price_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_updated_by VARCHAR(255), -- 'admin' or 'community'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(station_id, fuel_type) -- Each station can only have one price per fuel type
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fuel_prices_station ON fuel_prices(station_id);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_type ON fuel_prices(fuel_type);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_price ON fuel_prices(price);

-- Migrate existing fuel_price data from stations table to fuel_prices table
-- Assume existing prices are for 'Regular' fuel type
INSERT INTO fuel_prices (station_id, fuel_type, price, price_updated_at, price_updated_by)
SELECT 
    id, 
    'Regular', 
    fuel_price, 
    COALESCE(price_updated_at, created_at),
    COALESCE(price_updated_by, 'admin')
FROM stations 
WHERE fuel_price IS NOT NULL
ON CONFLICT (station_id, fuel_type) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fuel_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fuel_prices_timestamp 
BEFORE UPDATE ON fuel_prices
FOR EACH ROW EXECUTE FUNCTION update_fuel_prices_updated_at();

-- Add index on fuel_type in fuel_price_reports for better join performance
CREATE INDEX IF NOT EXISTS idx_price_reports_fuel_type ON fuel_price_reports(fuel_type);

-- Create a view for easy access to station prices with all fuel types
CREATE OR REPLACE VIEW station_fuel_prices AS
SELECT 
    s.id as station_id,
    s.name as station_name,
    s.brand,
    s.address,
    fp.fuel_type,
    fp.price,
    fp.price_updated_at,
    fp.price_updated_by
FROM stations s
LEFT JOIN fuel_prices fp ON s.id = fp.station_id
ORDER BY s.id, fp.fuel_type;

-- Note: The old fuel_price column in stations table is kept for backward compatibility
-- but should be considered deprecated. It will be updated to reflect the cheapest fuel price
-- or can be removed in a future migration once all code is updated.

COMMENT ON TABLE fuel_prices IS 'Stores multiple fuel type prices per station (Regular, Diesel, Premium, etc.)';
COMMENT ON COLUMN fuel_prices.fuel_type IS 'Type of fuel: Regular, Premium, Diesel, Premium Diesel, E85, LPG';
COMMENT ON COLUMN fuel_prices.price IS 'Price per liter in PHP';
COMMENT ON COLUMN fuel_prices.price_updated_by IS 'Source of price update: admin or community';
