-- Migration: Add owner magic links table for passwordless authentication
-- This table stores one-time login tokens sent via email

CREATE TABLE IF NOT EXISTS owner_magic_links (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_owner_magic_links_token ON owner_magic_links(token);

-- Index for cleanup queries by owner
CREATE INDEX IF NOT EXISTS idx_owner_magic_links_owner_id ON owner_magic_links(owner_id);

-- Index for expired token cleanup
CREATE INDEX IF NOT EXISTS idx_owner_magic_links_expires_at ON owner_magic_links(expires_at);

COMMENT ON TABLE owner_magic_links IS 'Stores one-time magic link tokens for passwordless owner authentication';
COMMENT ON COLUMN owner_magic_links.token IS '64-character hex token (32 bytes)';
COMMENT ON COLUMN owner_magic_links.expires_at IS 'Token expires 15 minutes after creation';
COMMENT ON COLUMN owner_magic_links.used_at IS 'Set when token is verified - prevents reuse';
