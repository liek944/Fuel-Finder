-- Migration 006: Add Owner-Based Access Control
-- This migration implements multi-owner system with subdomain-based authentication

-- =====================================================
-- 1. Create owners table
-- =====================================================
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL UNIQUE, -- Subdomain identifier (e.g., 'castillonfuels')
    api_key TEXT NOT NULL UNIQUE, -- Secure API key for authentication
    email VARCHAR(255),
    phone VARCHAR(50),
    contact_person VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE, -- For deactivating owners without deleting data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE owners IS 'Station owners who can manage their own stations via subdomain access';
COMMENT ON COLUMN owners.domain IS 'Subdomain identifier used in URL (e.g., castillonfuels for castillonfuels.fuelfinder.com)';
COMMENT ON COLUMN owners.api_key IS 'Unique API key for authenticating owner requests';
COMMENT ON COLUMN owners.is_active IS 'Flag to enable/disable owner access without deleting their data';

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_owners_domain ON owners(domain);
CREATE INDEX IF NOT EXISTS idx_owners_api_key ON owners(api_key);
CREATE INDEX IF NOT EXISTS idx_owners_is_active ON owners(is_active);

-- =====================================================
-- 2. Add owner_id to stations table
-- =====================================================
ALTER TABLE stations 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES owners(id) ON DELETE SET NULL;

-- Add index for efficient filtering by owner
CREATE INDEX IF NOT EXISTS idx_stations_owner_id ON stations(owner_id);

-- Add comment
COMMENT ON COLUMN stations.owner_id IS 'Reference to the owner who manages this station';

-- =====================================================
-- 3. Update fuel_price_reports to track verification by owner
-- =====================================================
-- Add owner verification tracking
ALTER TABLE fuel_price_reports
ADD COLUMN IF NOT EXISTS verified_by_owner_id UUID REFERENCES owners(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN fuel_price_reports.verified_by_owner_id IS 'Owner who verified this price report';

-- Create index for owner verification queries
CREATE INDEX IF NOT EXISTS idx_price_reports_verified_by_owner ON fuel_price_reports(verified_by_owner_id);

-- =====================================================
-- 4. Create owner_activity_logs table for audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS owner_activity_logs (
    id SERIAL PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'login', 'verify_price', 'update_station', 'create_station', 'delete_station'
    station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    price_report_id INTEGER REFERENCES fuel_price_reports(id) ON DELETE SET NULL,
    request_ip VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT,
    details JSONB, -- Additional action details
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE owner_activity_logs IS 'Audit trail of all owner actions for security and analytics';
COMMENT ON COLUMN owner_activity_logs.action_type IS 'Type of action performed (login, verify_price, update_station, etc.)';

-- Create indexes for efficient log queries
CREATE INDEX IF NOT EXISTS idx_owner_logs_owner_id ON owner_activity_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_logs_created_at ON owner_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_logs_action_type ON owner_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_owner_logs_success ON owner_activity_logs(success);

-- =====================================================
-- 5. Create trigger to update owners.updated_at
-- =====================================================
CREATE TRIGGER update_owners_updated_at 
    BEFORE UPDATE ON owners
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Insert sample owners for testing
-- =====================================================
-- Generate secure API keys using PostgreSQL's encode + gen_random_bytes
-- Format: base64-encoded 32-byte random value

INSERT INTO owners (name, domain, api_key, email, contact_person, phone) VALUES
    (
        'Castillon Fuels Corporation',
        'castillonfuels',
        encode(gen_random_bytes(32), 'base64'),
        'admin@castillonfuels.com',
        'Juan Castillon',
        '+63-917-123-4567'
    ),
    (
        'Santos Gas Stations',
        'santosgas',
        encode(gen_random_bytes(32), 'base64'),
        'owner@santosgas.com',
        'Maria Santos',
        '+63-918-234-5678'
    ),
    (
        'Roxas Petroleum Services',
        'roxaspetro',
        encode(gen_random_bytes(32), 'base64'),
        'contact@roxaspetro.com',
        'Pedro Roxas',
        '+63-919-345-6789'
    )
ON CONFLICT (domain) DO NOTHING;

-- =====================================================
-- 7. Assign existing stations to sample owners (for testing)
-- =====================================================
-- Note: In production, you would assign stations manually or through admin interface

-- Assign some stations to Castillon Fuels
UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'castillonfuels' LIMIT 1)
WHERE name IN ('Shell', 'Petron Station');

-- Assign some stations to Santos Gas Stations
UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'santosgas' LIMIT 1)
WHERE name IN ('Kings Gas Station', 'Alliance');

-- Assign some stations to Roxas Petroleum
UPDATE stations 
SET owner_id = (SELECT id FROM owners WHERE domain = 'roxaspetro' LIMIT 1)
WHERE name IN ('iFUEL Dangay', 'STOP N GAS');

-- =====================================================
-- 8. Create helper function to log owner activity
-- =====================================================
CREATE OR REPLACE FUNCTION log_owner_activity(
    p_owner_id UUID,
    p_action_type VARCHAR,
    p_station_id INTEGER DEFAULT NULL,
    p_price_report_id INTEGER DEFAULT NULL,
    p_request_ip VARCHAR DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO owner_activity_logs (
        owner_id, action_type, station_id, price_report_id,
        request_ip, user_agent, details, success, error_message
    ) VALUES (
        p_owner_id, p_action_type, p_station_id, p_price_report_id,
        p_request_ip, p_user_agent, p_details, p_success, p_error_message
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_owner_activity IS 'Helper function to log owner activities for audit trail';

-- =====================================================
-- 9. Create view for owner dashboard analytics
-- =====================================================
CREATE OR REPLACE VIEW owner_dashboard_stats AS
SELECT 
    o.id AS owner_id,
    o.name AS owner_name,
    o.domain,
    COUNT(DISTINCT s.id) AS total_stations,
    COUNT(DISTINCT CASE WHEN fpr.is_verified = TRUE AND fpr.verified_by_owner_id = o.id THEN fpr.id END) AS verified_reports,
    COUNT(DISTINCT CASE WHEN fpr.is_verified = FALSE THEN fpr.id END) AS pending_reports,
    COUNT(DISTINCT oal.id) AS total_actions,
    MAX(oal.created_at) AS last_activity
FROM owners o
LEFT JOIN stations s ON s.owner_id = o.id
LEFT JOIN fuel_price_reports fpr ON fpr.station_id = s.id
LEFT JOIN owner_activity_logs oal ON oal.owner_id = o.id
WHERE o.is_active = TRUE
GROUP BY o.id, o.name, o.domain;

COMMENT ON VIEW owner_dashboard_stats IS 'Aggregated statistics for owner dashboard';

-- =====================================================
-- Migration complete
-- =====================================================
-- To verify the migration was successful, run:
-- SELECT * FROM owners;
-- SELECT name, brand, owner_id FROM stations WHERE owner_id IS NOT NULL;
