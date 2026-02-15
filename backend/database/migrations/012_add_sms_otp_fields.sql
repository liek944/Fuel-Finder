-- Add SMS OTP fields to owner_magic_links table
-- This allows reusing the same table for both magic links and SMS OTP codes

ALTER TABLE owner_magic_links ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
ALTER TABLE owner_magic_links ADD COLUMN IF NOT EXISTS otp_phone VARCHAR(50);

COMMENT ON COLUMN owner_magic_links.otp_code IS '6-digit OTP code for SMS login';
COMMENT ON COLUMN owner_magic_links.otp_phone IS 'Phone number that received the OTP';

-- Track migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('012', 'Add SMS OTP fields to owner_magic_links', NOW())
ON CONFLICT (version) DO NOTHING;
