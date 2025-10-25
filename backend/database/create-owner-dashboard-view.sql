-- Create Owner Dashboard Stats View
-- This view provides aggregated statistics for the owner dashboard

-- Drop the view if it exists
DROP VIEW IF EXISTS owner_dashboard_stats;

-- Create the view
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

-- Add comment
COMMENT ON VIEW owner_dashboard_stats IS 'Aggregated statistics for owner dashboard - provides station counts, report statistics, and activity metrics';

-- Test the view
SELECT 'View created successfully' as status;
SELECT COUNT(*) as total_owners FROM owner_dashboard_stats;
