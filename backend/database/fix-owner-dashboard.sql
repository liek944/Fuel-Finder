-- Fix Owner Dashboard Issues
-- This script fixes:
-- 1. Total Actions counter incrementing on every refresh
-- 2. Missing reporter_name column in fuel_price_reports
-- 3. View to exclude auth logs from total_actions

-- =====================================================
-- 1. Add reporter_name column to fuel_price_reports
-- =====================================================
ALTER TABLE fuel_price_reports
ADD COLUMN IF NOT EXISTS reporter_name VARCHAR(255) DEFAULT 'Anonymous';

COMMENT ON COLUMN fuel_price_reports.reporter_name IS 'Name or identifier of the person who reported the price';

-- =====================================================
-- 2. Update existing reports to have reporter_name
-- =====================================================
UPDATE fuel_price_reports
SET reporter_name = COALESCE(reporter_identifier, 'Anonymous')
WHERE reporter_name IS NULL OR reporter_name = '';

-- =====================================================
-- 3. Recreate owner_dashboard_stats view
-- =====================================================
DROP VIEW IF EXISTS owner_dashboard_stats CASCADE;

CREATE VIEW owner_dashboard_stats AS
SELECT 
    o.id AS owner_id,
    o.name AS owner_name,
    o.domain,
    COUNT(DISTINCT s.id) AS total_stations,
    COUNT(DISTINCT CASE WHEN fpr.is_verified = TRUE AND fpr.verified_by_owner_id = o.id THEN fpr.id END) AS verified_reports,
    COUNT(DISTINCT CASE WHEN fpr.is_verified = FALSE THEN fpr.id END) AS pending_reports,
    COUNT(DISTINCT CASE WHEN oal.action_type NOT IN ('auth_success', 'auth_attempt', 'view_dashboard') THEN oal.id END) AS total_actions,
    MAX(CASE WHEN oal.action_type NOT IN ('auth_success', 'auth_attempt') THEN oal.created_at END) AS last_activity
FROM owners o
LEFT JOIN stations s ON s.owner_id = o.id
LEFT JOIN fuel_price_reports fpr ON fpr.station_id = s.id
LEFT JOIN owner_activity_logs oal ON oal.owner_id = o.id
WHERE o.is_active = TRUE
GROUP BY o.id, o.name, o.domain;

COMMENT ON VIEW owner_dashboard_stats IS 'Aggregated statistics for owner dashboard - excludes auth logs from total_actions';

-- =====================================================
-- 4. Verify the fix
-- =====================================================
SELECT 'Owner dashboard view recreated successfully' as status;
SELECT 'Reporter name column added to fuel_price_reports' as status;

-- Test the view
SELECT 
    owner_name,
    domain,
    total_stations,
    pending_reports,
    verified_reports,
    total_actions
FROM owner_dashboard_stats;
