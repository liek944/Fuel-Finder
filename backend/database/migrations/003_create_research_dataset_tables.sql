-- Migration: Create Research Dataset Tables
-- Purpose: Store anonymized trip data for academic research
-- Created: October 15, 2025
-- Phase: 1 - Core Infrastructure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- Table: research_trips
-- Stores anonymized trip metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Anonymized identifiers
    anonymous_user_id VARCHAR(64) NOT NULL,  -- SHA256 hash
    
    -- Temporal data (rounded for privacy)
    trip_date DATE NOT NULL,
    trip_hour INTEGER CHECK (trip_hour >= 0 AND trip_hour <= 23),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Trip characteristics
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    distance_meters NUMERIC(10, 2),
    avg_speed_kmh NUMERIC(5, 2) CHECK (avg_speed_kmh >= 0),
    max_speed_kmh NUMERIC(5, 2) CHECK (max_speed_kmh >= 0),
    total_points INTEGER NOT NULL CHECK (total_points >= 2),
    
    -- Bounding box (general area, not precise)
    bbox_min_lat NUMERIC(9, 6) CHECK (bbox_min_lat >= -90 AND bbox_min_lat <= 90),
    bbox_min_lon NUMERIC(9, 6) CHECK (bbox_min_lon >= -180 AND bbox_min_lon <= 180),
    bbox_max_lat NUMERIC(9, 6) CHECK (bbox_max_lat >= -90 AND bbox_max_lat <= 90),
    bbox_max_lon NUMERIC(9, 6) CHECK (bbox_max_lon >= -180 AND bbox_max_lon <= 180),
    
    -- Quality metrics
    avg_accuracy_meters NUMERIC(6, 2),
    is_high_quality BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_version VARCHAR(10) DEFAULT '1.0',
    
    -- Ensure bounding box is valid
    CONSTRAINT valid_bbox CHECK (bbox_max_lat >= bbox_min_lat AND bbox_max_lon >= bbox_min_lon)
);

-- Indexes for efficient querying
CREATE INDEX idx_research_trips_date ON research_trips(trip_date);
CREATE INDEX idx_research_trips_hour ON research_trips(trip_hour);
CREATE INDEX idx_research_trips_dow ON research_trips(day_of_week);
CREATE INDEX idx_research_trips_quality ON research_trips(is_high_quality);
CREATE INDEX idx_research_trips_submitted ON research_trips(submitted_at);
CREATE INDEX idx_research_trips_user ON research_trips(anonymous_user_id);

-- ============================================================================
-- Table: research_trip_points
-- Stores anonymized GPS coordinates for each trip
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_trip_points (
    id BIGSERIAL PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES research_trips(id) ON DELETE CASCADE,
    
    -- Spatial data (cloaked to ~100m precision)
    geom GEOMETRY(Point, 4326) NOT NULL,
    sequence INTEGER NOT NULL CHECK (sequence >= 0),
    
    -- Temporal data (relative to trip start)
    relative_time_seconds INTEGER NOT NULL CHECK (relative_time_seconds >= 0),
    
    -- Movement data
    speed_kmh NUMERIC(5, 2) CHECK (speed_kmh >= 0),
    heading NUMERIC(5, 2) CHECK (heading >= 0 AND heading <= 360),
    accuracy_meters NUMERIC(6, 2) CHECK (accuracy_meters > 0),
    
    -- Context (optional)
    elevation_meters NUMERIC(7, 2),
    
    -- Ensure unique sequence per trip
    CONSTRAINT unique_trip_sequence UNIQUE (trip_id, sequence)
);

-- Spatial index for geographic queries
CREATE INDEX idx_research_points_geom ON research_trip_points USING GIST(geom);
CREATE INDEX idx_research_points_trip ON research_trip_points(trip_id);
CREATE INDEX idx_research_points_sequence ON research_trip_points(trip_id, sequence);

-- ============================================================================
-- Table: research_access_logs
-- Tracks API usage for accountability and analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_access_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Requester info
    api_key_hash VARCHAR(64),  -- Optional: for registered researchers
    requester_ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    
    -- Request details
    endpoint VARCHAR(255) NOT NULL,
    query_params JSONB,
    
    -- Response
    rows_returned INTEGER,
    response_time_ms INTEGER,
    status_code INTEGER,
    
    -- Usage metadata
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Purpose (optional, user-provided)
    research_purpose TEXT,
    institution TEXT
);

CREATE INDEX idx_research_logs_timestamp ON research_access_logs(request_timestamp);
CREATE INDEX idx_research_logs_ip ON research_access_logs(requester_ip);
CREATE INDEX idx_research_logs_endpoint ON research_access_logs(endpoint);

-- ============================================================================
-- Table: research_user_consents
-- Tracks which users have opted into data sharing
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_user_consents (
    id SERIAL PRIMARY KEY,
    anonymous_user_id VARCHAR(64) NOT NULL UNIQUE,  -- SHA256 hash
    
    -- Consent details
    consent_given BOOLEAN DEFAULT TRUE,
    consent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consent_withdrawn_date TIMESTAMP,
    
    -- Version of terms accepted
    terms_version VARCHAR(10) DEFAULT '1.0',
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_consents_user ON research_user_consents(anonymous_user_id);
CREATE INDEX idx_consents_status ON research_user_consents(consent_given);

-- ============================================================================
-- Views for easier querying
-- ============================================================================

-- View: Recent trips summary
CREATE OR REPLACE VIEW research_trips_summary AS
SELECT 
    trip_date,
    day_of_week,
    COUNT(*) as trip_count,
    AVG(duration_seconds) as avg_duration_sec,
    AVG(distance_meters) as avg_distance_m,
    AVG(avg_speed_kmh) as avg_speed,
    SUM(total_points) as total_gps_points
FROM research_trips
WHERE is_high_quality = TRUE
GROUP BY trip_date, day_of_week
ORDER BY trip_date DESC;

-- View: Dataset statistics
CREATE OR REPLACE VIEW research_dataset_stats AS
SELECT
    COUNT(DISTINCT id) as total_trips,
    COUNT(DISTINCT anonymous_user_id) as unique_users,
    MIN(trip_date) as earliest_trip,
    MAX(trip_date) as latest_trip,
    SUM(distance_meters) / 1000 as total_km,
    AVG(duration_seconds) / 60 as avg_duration_min,
    SUM(total_points) as total_gps_points
FROM research_trips
WHERE is_high_quality = TRUE;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Get trips within bounding box
CREATE OR REPLACE FUNCTION get_trips_in_bbox(
    min_lat NUMERIC,
    min_lon NUMERIC,
    max_lat NUMERIC,
    max_lon NUMERIC
)
RETURNS TABLE (
    trip_id UUID,
    trip_date DATE,
    duration_seconds INTEGER,
    distance_meters NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        research_trips.trip_date,
        research_trips.duration_seconds,
        research_trips.distance_meters
    FROM research_trips
    WHERE 
        bbox_max_lat >= min_lat AND
        bbox_min_lat <= max_lat AND
        bbox_max_lon >= min_lon AND
        bbox_min_lon <= max_lon AND
        is_high_quality = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate dataset statistics for date range
CREATE OR REPLACE FUNCTION get_dataset_stats(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    total_trips BIGINT,
    total_distance_km NUMERIC,
    avg_trip_duration_min NUMERIC,
    total_gps_points BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        (SUM(distance_meters) / 1000)::NUMERIC(10, 2),
        (AVG(duration_seconds) / 60)::NUMERIC(10, 2),
        SUM(total_points)::BIGINT
    FROM research_trips
    WHERE 
        trip_date >= start_date AND
        trip_date <= end_date AND
        is_high_quality = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE research_trips IS 'Anonymized trip metadata for academic research';
COMMENT ON TABLE research_trip_points IS 'Anonymized GPS points with ~100m spatial cloaking';
COMMENT ON TABLE research_access_logs IS 'API usage tracking for accountability';
COMMENT ON TABLE research_user_consents IS 'User consent tracking for GDPR compliance';

COMMENT ON COLUMN research_trips.anonymous_user_id IS 'SHA256 hash of user identifier + salt';
COMMENT ON COLUMN research_trips.trip_hour IS 'Hour of day (0-23), rounded for privacy';
COMMENT ON COLUMN research_trip_points.relative_time_seconds IS 'Seconds elapsed from trip start';
COMMENT ON COLUMN research_trip_points.geom IS 'Spatially cloaked GPS point (~100m precision)';

-- ============================================================================
-- Grant permissions (adjust as needed)
-- ============================================================================

-- Grant read-only access to research_api user (create this user separately)
-- GRANT SELECT ON research_trips, research_trip_points TO research_api_user;
-- GRANT INSERT ON research_access_logs TO research_api_user;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('research_trips', 'research_trip_points', 'research_access_logs', 'research_user_consents');
    
    IF table_count = 4 THEN
        RAISE NOTICE '✅ All research dataset tables created successfully';
    ELSE
        RAISE WARNING '⚠️  Expected 4 tables, found %', table_count;
    END IF;
END $$;
