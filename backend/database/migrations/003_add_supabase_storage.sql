-- Migration: Add Supabase Storage URL columns
-- This migration adds columns to store Supabase Storage URLs for images

-- Add new columns for Supabase Storage
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_storage_path TEXT;

-- Add index for storage paths (for cleanup operations)
CREATE INDEX IF NOT EXISTS idx_images_storage_path ON images(storage_path);

-- Add comments for documentation
COMMENT ON COLUMN images.image_url IS 'Public URL for the main image in Supabase Storage';
COMMENT ON COLUMN images.thumbnail_url IS 'Public URL for the thumbnail in Supabase Storage';
COMMENT ON COLUMN images.storage_path IS 'Storage path in Supabase bucket (e.g., station-3/uuid.jpeg)';
COMMENT ON COLUMN images.thumbnail_storage_path IS 'Storage path for thumbnail in Supabase bucket';

-- Update views to include new URL columns
DROP VIEW IF EXISTS station_images_view;
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
    -- Use Supabase URLs if available, fallback to local paths
    COALESCE(i.image_url, CONCAT('/api/images/stations/', i.filename)) as image_url,
    COALESCE(i.thumbnail_url, CONCAT('/api/images/thumbnails/thumb_', i.filename)) as thumbnail_url,
    i.storage_path,
    i.thumbnail_storage_path
FROM stations s
LEFT JOIN images i ON s.id = i.station_id
WHERE i.id IS NOT NULL
ORDER BY s.id, i.is_primary DESC, i.display_order ASC;

DROP VIEW IF EXISTS poi_images_view;
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
    -- Use Supabase URLs if available, fallback to local paths
    COALESCE(i.image_url, CONCAT('/api/images/pois/', i.filename)) as image_url,
    COALESCE(i.thumbnail_url, CONCAT('/api/images/thumbnails/thumb_', i.filename)) as thumbnail_url,
    i.storage_path,
    i.thumbnail_storage_path
FROM pois p
LEFT JOIN images i ON p.id = i.poi_id
WHERE i.id IS NOT NULL
ORDER BY p.id, i.is_primary DESC, i.display_order ASC;

-- Update helper functions to return new URL columns
DROP FUNCTION IF EXISTS get_station_images(INTEGER);
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
    storage_path TEXT,
    thumbnail_storage_path TEXT,
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
        -- Use Supabase URLs if available, fallback to local paths
        COALESCE(i.image_url, CONCAT('/api/images/stations/', i.filename))::TEXT as image_url,
        COALESCE(i.thumbnail_url, CONCAT('/api/images/thumbnails/thumb_', i.filename))::TEXT as thumbnail_url,
        i.storage_path,
        i.thumbnail_storage_path,
        i.created_at,
        i.updated_at
    FROM images i
    WHERE i.station_id = station_id_param
    ORDER BY i.is_primary DESC, i.display_order ASC, i.created_at ASC;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_poi_images(INTEGER);
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
    storage_path TEXT,
    thumbnail_storage_path TEXT,
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
        -- Use Supabase URLs if available, fallback to local paths
        COALESCE(i.image_url, CONCAT('/api/images/pois/', i.filename))::TEXT as image_url,
        COALESCE(i.thumbnail_url, CONCAT('/api/images/thumbnails/thumb_', i.filename))::TEXT as thumbnail_url,
        i.storage_path,
        i.thumbnail_storage_path,
        i.created_at,
        i.updated_at
    FROM images i
    WHERE i.poi_id = poi_id_param
    ORDER BY i.is_primary DESC, i.display_order ASC, i.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Insert migration log
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('003', 'Add Supabase Storage URL columns to images table', NOW())
ON CONFLICT (version) DO NOTHING;
