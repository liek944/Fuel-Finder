-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create the stations table
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    fuel_price DECIMAL(10, 2), -- Price per liter
    services TEXT[], -- Array of services like ['WiFi', 'Car Wash', 'ATM']
    address TEXT,
    phone VARCHAR(50),
    operating_hours JSONB, -- Store opening hours as JSON
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for performance
CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST(geom);

-- Create index on brand for filtering
CREATE INDEX IF NOT EXISTS idx_stations_brand ON stations(brand);

-- Create index on fuel_price for filtering
CREATE INDEX IF NOT EXISTS idx_stations_fuel_price ON stations(fuel_price);

-- Insert sample data based on current static stations
INSERT INTO stations (name, brand, fuel_price, services, address, geom) VALUES
    ('iFUEL Dangay', 'Local', 58.50, ARRAY['WiFi', 'Convenience Store'], 'Dangay, Roxas, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.52673960796389, 12.596541316130333), 4326)),
    ('Kings Gas Station', 'Local', 59.00, ARRAY['Car Wash', 'ATM'], 'Roxas, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.51721240217624, 12.592646226321792), 4326)),
    ('Alliance', 'Local', 57.75, ARRAY['Convenience Store'], 'Roxas, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.51944399992831, 12.586866306629496), 4326)),
    ('Ws Velario Fuel', 'Local', 58.25, ARRAY['Tire Service'], 'Roxas, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.51339293679293, 12.585735437546605), 4326)),
    ('LMG Fuel station', 'Local', 58.00, ARRAY['WiFi', 'Restroom'], 'Roxas, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.5123510348652, 12.591852696747003), 4326)),
    ('Shell', 'Shell', 60.50, ARRAY['WiFi', 'Car Wash', 'Convenience Store', 'ATM'], 'Roxas, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.51024818313729, 12.590868441215353), 4326)),
    ('Total', 'Local', 57.50, ARRAY['Restroom'], 'Roxas, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.50973319941718, 12.59204117084647), 4326)),
    ('STOP N GAS', 'Local', 58.75, ARRAY['Convenience Store', 'ATM'], 'Roxas, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.51778828122882, 12.61433494869747), 4326))
ON CONFLICT DO NOTHING;

-- Add more sample stations for testing
INSERT INTO stations (name, brand, fuel_price, services, address, geom) VALUES
    ('Petron Station', 'Petron', 61.00, ARRAY['WiFi', 'Car Wash', 'Convenience Store', 'Restroom'], 'San Jose, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.5400, 12.6100), 4326)),
    ('Caltex Station', 'Caltex', 60.25, ARRAY['Car Wash', 'ATM', 'Convenience Store'], 'Calapan, Oriental Mindoro', ST_SetSRID(ST_MakePoint(121.1800, 13.4100), 4326))
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create fuel_price_reports table for community price reporting
CREATE TABLE IF NOT EXISTS fuel_price_reports (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(50) DEFAULT 'Regular', -- Regular, Premium, Diesel, etc.
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    reporter_ip VARCHAR(45), -- IPv4 or IPv6 address
    reporter_identifier VARCHAR(255), -- Optional: browser fingerprint or user ID
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255), -- Admin who verified
    verified_at TIMESTAMP,
    notes TEXT, -- Optional notes from reporter
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_price_reports_station ON fuel_price_reports(station_id);
CREATE INDEX IF NOT EXISTS idx_price_reports_created ON fuel_price_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_reports_verified ON fuel_price_reports(is_verified);

-- Add price_updated_at column to stations table to track last official price update
ALTER TABLE stations ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS price_updated_by VARCHAR(255); -- 'admin' or 'community'

-- Update existing stations to set price_updated_at to created_at
UPDATE stations SET price_updated_at = created_at WHERE price_updated_at IS NULL AND fuel_price IS NOT NULL;
