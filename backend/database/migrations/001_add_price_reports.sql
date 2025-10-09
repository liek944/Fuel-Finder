-- Migration: Add Community Price Reporting Tables
-- Date: 2025-10-09
-- Description: Adds fuel_price_reports table and related indexes for community-based price reporting

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

-- Add price tracking columns to stations table
ALTER TABLE stations ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS price_updated_by VARCHAR(255); -- 'admin' or 'community'

-- Update existing stations to set price_updated_at to created_at
UPDATE stations 
SET price_updated_at = created_at 
WHERE price_updated_at IS NULL AND fuel_price IS NOT NULL;

-- Create a view for easy price report analytics
CREATE OR REPLACE VIEW price_report_summary AS
SELECT 
    s.id as station_id,
    s.name as station_name,
    s.brand,
    s.fuel_price as official_price,
    s.price_updated_at,
    s.price_updated_by,
    COUNT(pr.id) as total_reports,
    COUNT(CASE WHEN pr.is_verified THEN 1 END) as verified_reports,
    AVG(pr.price) as avg_reported_price,
    MIN(pr.price) as min_reported_price,
    MAX(pr.price) as max_reported_price,
    MAX(pr.created_at) as last_report_date
FROM stations s
LEFT JOIN fuel_price_reports pr ON s.id = pr.station_id 
    AND pr.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.id, s.name, s.brand, s.fuel_price, s.price_updated_at, s.price_updated_by;

COMMENT ON TABLE fuel_price_reports IS 'Community-submitted fuel price reports for stations';
COMMENT ON COLUMN fuel_price_reports.reporter_ip IS 'IP address of the user who submitted the report (for abuse prevention)';
COMMENT ON COLUMN fuel_price_reports.is_verified IS 'Whether an admin has verified this report as accurate';
COMMENT ON VIEW price_report_summary IS 'Summary view of price reports per station (last 30 days)';
