-- Migration: Add session tracking for cross-device magic link authentication
-- This allows the PC to poll for login status after phone clicks the magic link

-- Add session_token for PC to poll with
ALTER TABLE owner_magic_links 
ADD COLUMN IF NOT EXISTS session_token VARCHAR(64) UNIQUE;

-- Add verified_api_key to store the API key when phone verifies
ALTER TABLE owner_magic_links 
ADD COLUMN IF NOT EXISTS verified_api_key VARCHAR(64);

-- Index for fast session token lookups (polling endpoint)
CREATE INDEX IF NOT EXISTS idx_owner_magic_links_session_token 
ON owner_magic_links(session_token) WHERE session_token IS NOT NULL;

COMMENT ON COLUMN owner_magic_links.session_token IS 'Unique token for PC to poll login status';
COMMENT ON COLUMN owner_magic_links.verified_api_key IS 'Stores owner API key after phone verification';
