-- Verification Script: Check Owner Access Control Setup
-- Run this in Supabase SQL Editor to verify migration

-- 1. Check if owners table exists and has data
SELECT 'Owners Table' as check_name, COUNT(*) as count FROM owners;

-- 2. Show all owners with their subdomains and API keys
SELECT 
    name,
    domain,
    api_key,
    email,
    contact_person,
    is_active,
    created_at
FROM owners 
ORDER BY name;

-- 3. Check if owner_activity_logs table exists
SELECT 'Activity Logs Table' as check_name, COUNT(*) as count FROM owner_activity_logs;

-- 4. Check if stations have owner_id column
SELECT 
    COUNT(*) as total_stations,
    COUNT(owner_id) as stations_with_owner,
    COUNT(*) - COUNT(owner_id) as unassigned_stations
FROM stations;

-- 5. Show station ownership assignments
SELECT 
    s.id,
    s.name AS station_name,
    s.brand,
    o.name AS owner_name,
    o.domain
FROM stations s
LEFT JOIN owners o ON o.id = s.owner_id
ORDER BY o.name, s.name;

-- 6. Check if view was created
SELECT 
    owner_name,
    domain,
    total_stations,
    verified_reports,
    pending_reports
FROM owner_dashboard_stats
ORDER BY owner_name;
