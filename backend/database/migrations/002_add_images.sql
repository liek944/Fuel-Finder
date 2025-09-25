-- Migration: Add images table for station and POI images
-- Run this after the initial schema setup

CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    poi_id INTEGER REFERENCES pois(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    alt_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure image belongs to either a station OR a POI, not both
    CONSTRAINT chk_belongs_to_one CHECK (
        (station_id IS NOT NULL AND poi_id IS NULL) OR
        (station_id IS NULL AND poi_id IS NOT NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_station_id ON images(station_id);
CREATE INDEX IF NOT EXISTS idx_images_poi_id ON images(poi_id);
CREATE INDEX IF NOT EXISTS idx_images_primary ON images(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_images_display_order ON images(station_id, poi_id, display_order);
CREATE INDEX IF NOT EXISTS idx_images_filename ON images(filename);

-- Create views for easier querying
CREATE OR REPLACE VIEW station_images_view AS
SELECT
    s.id as station_id,
    s.name as station_name,
    i.id as image_id,
    i.filename,
    i.original_filename,
    i.mime_type,
    i.size,
    i.width,
    i.height,
    i.display_order,
    i.is_primary,
    i.alt_text,
    i.created_at,
    i.updated_at,
    CONCAT('/api/images/stations/', i.filename) as image_url,
    CONCAT('/api/images/thumbnails/thumb_', i.filename) as thumbnail_url
FROM stations s
LEFT JOIN images i ON s.id = i.station_id
WHERE i.id IS NOT NULL
ORDER BY s.id, i.is_primary DESC, i.display_order ASC;

CREATE OR REPLACE VIEW poi_images_view AS
SELECT
    p.id as poi_id,
    p.name as poi_name,
    i.id as image_id,
    i.filename,
    i.original_filename,
    i.mime_type,
    i.size,
    i.width,
    i.height,
    i.display_order,
    i.is_primary,
    i.alt_text,
    i.created_at,
    i.updated_at,
    CONCAT('/api/images/pois/', i.filename) as image_url,
    CONCAT('/api/images/thumbnails/thumb_', i.filename) as thumbnail_url
FROM pois p
LEFT JOIN images i ON p.id = i.poi_id
WHERE i.id IS NOT NULL
ORDER BY p.id, i.is_primary DESC, i.display_order ASC;

-- Helper functions for image management
CREATE OR REPLACE FUNCTION get_station_images(station_id_param INTEGER)
RETURNS TABLE (
    id INTEGER,
    filename VARCHAR,
    original_filename VARCHAR,
    mime_type VARCHAR,
    size INTEGER,
    width INTEGER,
    height INTEGER,
    display_order INTEGER,
    is_primary BOOLEAN,
    alt_text TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.filename,
        i.original_filename,
        i.mime_type,
        i.size,
        i.width,
        i.height,
        i.display_order,
        i.is_primary,
        i.alt_text,
        CONCAT('/api/images/stations/', i.filename)::TEXT as image_url,
        CONCAT('/api/images/thumbnails/thumb_', i.filename)::TEXT as thumbnail_url,
        i.created_at,
        i.updated_at
    FROM images i
    WHERE i.station_id = station_id_param
    ORDER BY i.is_primary DESC, i.display_order ASC, i.created_at ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_poi_images(poi_id_param INTEGER)
RETURNS TABLE (
    id INTEGER,
    filename VARCHAR,
    original_filename VARCHAR,
    mime_type VARCHAR,
    size INTEGER,
    width INTEGER,
    height INTEGER,
    display_order INTEGER,
    is_primary BOOLEAN,
    alt_text TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.filename,
        i.original_filename,
        i.mime_type,
        i.size,
        i.width,
        i.height,
        i.display_order,
        i.is_primary,
        i.alt_text,
        CONCAT('/api/images/pois/', i.filename)::TEXT as image_url,
        CONCAT('/api/images/thumbnails/thumb_', i.filename)::TEXT as thumbnail_url,
        i.created_at,
        i.updated_at
    FROM images i
    WHERE i.poi_id = poi_id_param
    ORDER BY i.is_primary DESC, i.display_order ASC, i.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to set primary image (ensures only one primary per entity)
CREATE OR REPLACE FUNCTION set_primary_image(image_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    target_station_id INTEGER;
    target_poi_id INTEGER;
BEGIN
    -- Check if image exists and get its station/poi reference
    SELECT station_id, poi_id INTO target_station_id, target_poi_id
    FROM images WHERE id = image_id_param;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Clear existing primary flags for the same entity
    IF target_station_id IS NOT NULL THEN
        UPDATE images SET is_primary = FALSE, updated_at = NOW()
        WHERE station_id = target_station_id;
    ELSIF target_poi_id IS NOT NULL THEN
        UPDATE images SET is_primary = FALSE, updated_at = NOW()
        WHERE poi_id = target_poi_id;
    END IF;

    -- Set new primary image
    UPDATE images
    SET is_primary = TRUE, updated_at = NOW()
    WHERE id = image_id_param;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up orphaned images (images without valid station/poi references)
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    DELETE FROM images
    WHERE (station_id IS NOT NULL AND station_id NOT IN (SELECT id FROM stations))
       OR (poi_id IS NOT NULL AND poi_id NOT IN (SELECT id FROM pois));

    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_images_updated_at
    BEFORE UPDATE ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_images_updated_at();

-- Add comments for documentation
COMMENT ON TABLE images IS 'Stores image metadata and references for stations and POIs';
COMMENT ON COLUMN images.filename IS 'Processed filename stored on disk';
COMMENT ON COLUMN images.original_filename IS 'Original filename from upload';
COMMENT ON COLUMN images.station_id IS 'Reference to fuel_stations table (nullable)';
COMMENT ON COLUMN images.poi_id IS 'Reference to pois table (nullable)';
COMMENT ON COLUMN images.display_order IS 'Order for displaying images (0 = first)';
COMMENT ON COLUMN images.is_primary IS 'Whether this is the primary image for the entity';
COMMENT ON COLUMN images.alt_text IS 'Alternative text for accessibility';

-- Insert completion log
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('002', 'Add images table for station and POI images', NOW())
ON CONFLICT (version) DO NOTHING;
