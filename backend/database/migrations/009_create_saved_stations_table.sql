-- Migration: Create saved_stations table for user favorites
-- Created: 2026-01-23

-- Junction table linking users to their saved stations
CREATE TABLE IF NOT EXISTS saved_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_id INTEGER NOT NULL,
  notes TEXT,                    -- Optional user notes about the station
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, station_id)    -- Prevent duplicate saves
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_saved_stations_user ON saved_stations(user_id);

-- Index for checking if a specific station is saved
CREATE INDEX IF NOT EXISTS idx_saved_stations_station ON saved_stations(station_id);
