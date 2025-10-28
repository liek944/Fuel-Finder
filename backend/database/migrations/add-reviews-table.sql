-- Add reviews table for ratings and comments on stations and POIs
-- Migration: add-reviews-table.sql
-- Date: 2025-01-28

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('station', 'poi')),
  target_id INTEGER NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending', 'rejected')),
  display_name TEXT NULL,
  session_id TEXT NULL,
  ip INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_session_target ON reviews(session_id, target_type, target_id, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Add comment constraints
ALTER TABLE reviews ADD CONSTRAINT reviews_comment_length CHECK (comment IS NULL OR LENGTH(comment) <= 500);

COMMENT ON TABLE reviews IS 'User reviews and ratings for stations and POIs';
COMMENT ON COLUMN reviews.target_type IS 'Type of entity being reviewed: station or poi';
COMMENT ON COLUMN reviews.target_id IS 'ID of the station or POI';
COMMENT ON COLUMN reviews.rating IS 'Star rating from 1 to 5';
COMMENT ON COLUMN reviews.comment IS 'Optional text comment, max 500 characters';
COMMENT ON COLUMN reviews.status IS 'Moderation status: published (default), pending, or rejected';
COMMENT ON COLUMN reviews.display_name IS 'Optional display name provided by reviewer';
COMMENT ON COLUMN reviews.session_id IS 'Session ID for anti-spam deduplication';
COMMENT ON COLUMN reviews.ip IS 'IP address for anti-spam tracking';
COMMENT ON COLUMN reviews.user_agent IS 'User agent for anti-spam tracking';
