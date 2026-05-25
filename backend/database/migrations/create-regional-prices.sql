-- Migration: Create regional_fuel_prices table

-- Create the regional_fuel_prices table
CREATE TABLE IF NOT EXISTS regional_fuel_prices (
    id SERIAL PRIMARY KEY,
    region_name VARCHAR(100) DEFAULT 'Oriental Mindoro',
    fuel_type VARCHAR(50) NOT NULL, -- e.g., 'Regular', 'Premium', 'Diesel'
    average_price DECIMAL(10, 2) NOT NULL CHECK (average_price > 0),
    data_sources JSONB, -- Store URLs or snippet data used for aggregation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying of history
CREATE INDEX IF NOT EXISTS idx_regional_prices_region ON regional_fuel_prices(region_name);
CREATE INDEX IF NOT EXISTS idx_regional_prices_fuel_type ON regional_fuel_prices(fuel_type);
CREATE INDEX IF NOT EXISTS idx_regional_prices_created_at ON regional_fuel_prices(created_at DESC);
