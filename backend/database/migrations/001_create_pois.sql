-- Migration: Create POIs table with spatial index
-- Ensures availability before images migration that references pois

-- Enable PostGIS (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create the pois table
CREATE TABLE IF NOT EXISTS pois (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('gas','convenience','repair')),
    geom geometry(Point, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_pois_type ON pois(type);
CREATE INDEX IF NOT EXISTS idx_pois_geom ON pois USING GIST (geom);

-- Trigger function to maintain updated_at
CREATE OR REPLACE FUNCTION update_pois_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_pois_updated_at
    BEFORE UPDATE ON pois
    FOR EACH ROW EXECUTE FUNCTION update_pois_updated_at();

-- Mark migration as applied
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('001', 'Create pois table with spatial index and updated_at trigger', NOW())
ON CONFLICT (version) DO NOTHING;
