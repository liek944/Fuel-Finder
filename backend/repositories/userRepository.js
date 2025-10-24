/**
 * User Analytics Repository
 * Handles user analytics and activity tracking queries
 * 
 * ⚠️ DEPRECATED: This file returns MOCK DATA and is no longer used.
 * 
 * Real tracking is now handled by:
 * - services/userActivityTracker.js (in-memory real-time tracking)
 * - routes/userRoutes.js (heartbeat endpoint)
 * - controllers/adminController.js (uses userActivityTracker)
 * 
 * This file is kept for reference only.
 * 
 * NOTE: Original implementation used placeholder data. For production, integrate with:
 * - Google Analytics API
 * - Custom analytics tracking system
 * - Session tracking middleware
 */

const { pool } = require("../config/database");

/**
 * Get user statistics
 * Returns mock data for now - integrate with real analytics service
 */
async function getUserStats() {
  // This is a placeholder implementation
  // TODO: Integrate with real analytics service (Google Analytics, custom tracking, etc.)
  
  // For now, return mock data based on database activity
  const query = `
    SELECT
      COUNT(DISTINCT reporter_ip) as unique_visitors,
      COUNT(*) as total_interactions,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as interactions_24h
    FROM fuel_price_reports
  `;
  
  const result = await pool.query(query);
  const data = result.rows[0];
  
  // Return mock statistics structure expected by frontend
  return {
    activeUsers: parseInt(data.unique_visitors) || 0,
    timestamp: Date.now(),
    deviceBreakdown: {
      Mobile: Math.floor(Math.random() * 50) + 20,
      Desktop: Math.floor(Math.random() * 30) + 10,
      Tablet: Math.floor(Math.random() * 10) + 5,
      Unknown: Math.floor(Math.random() * 5)
    },
    locationBreakdown: {
      "Calapan City": Math.floor(Math.random() * 40) + 30,
      "Naujan": Math.floor(Math.random() * 20) + 10,
      "Victoria": Math.floor(Math.random() * 15) + 8,
      "Pinamalayan": Math.floor(Math.random() * 10) + 5,
      "Other": Math.floor(Math.random() * 10) + 3
    },
    featureUsage: {
      "Station Search": parseInt(data.total_interactions) || 0,
      "Price Reporting": parseInt(data.interactions_24h) || 0,
      "Navigation": Math.floor(Math.random() * 50) + 20,
      "POI Search": Math.floor(Math.random() * 30) + 10
    },
    pageBreakdown: {
      "/": Math.floor(Math.random() * 100) + 50,
      "/stations": Math.floor(Math.random() * 80) + 40,
      "/pois": Math.floor(Math.random() * 60) + 30,
      "/about": Math.floor(Math.random() * 20) + 10
    },
    sessionStats: {
      averageDurationMinutes: 8.5,
      longestSessionMinutes: 45.2
    },
    recentSessions: await getRecentSessions(5)
  };
}

/**
 * Get active users
 * Returns mock data for now - integrate with real session tracking
 */
async function getActiveUsers() {
  // This is a placeholder implementation
  // TODO: Integrate with real-time session tracking (Redis, WebSocket, etc.)
  
  // For now, get recent price report submissions as a proxy for activity
  const query = `
    SELECT DISTINCT
      reporter_ip,
      reporter_identifier,
      created_at
    FROM fuel_price_reports
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 20
  `;
  
  const result = await pool.query(query);
  
  // Transform to expected format
  return result.rows.map((row, index) => ({
    sessionId: `session_${index}_${Date.now()}`,
    device: ['Mobile', 'Desktop', 'Tablet'][Math.floor(Math.random() * 3)],
    location: {
      lat: 13.4 + (Math.random() * 0.2 - 0.1),
      lng: 121.1 + (Math.random() * 0.2 - 0.1),
      display: "Calapan City, Oriental Mindoro"
    },
    duration: Math.floor(Math.random() * 1800), // seconds
    pageViews: Math.floor(Math.random() * 10) + 1,
    currentPage: ['/stations', '/pois', '/navigation'][Math.floor(Math.random() * 3)],
    lastActive: row.created_at
  }));
}

/**
 * Get recent user sessions
 */
async function getRecentSessions(limit = 10) {
  // Placeholder based on recent database activity
  const query = `
    SELECT 
      reporter_ip,
      reporter_identifier,
      COUNT(*) as interactions,
      MIN(created_at) as first_seen,
      MAX(created_at) as last_seen
    FROM fuel_price_reports
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY reporter_ip, reporter_identifier
    ORDER BY last_seen DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limit]);
  
  return result.rows.map((row, index) => {
    const duration = new Date(row.last_seen) - new Date(row.first_seen);
    const durationMinutes = Math.floor(duration / 60000);
    
    return {
      sessionId: `${row.reporter_ip || 'anon'}_${index}`,
      device: ['Mobile', 'Desktop', 'Tablet'][Math.floor(Math.random() * 3)],
      location: "Calapan City, Oriental Mindoro",
      duration: `${durationMinutes}m`,
      pageViews: parseInt(row.interactions),
      currentPage: "/stations"
    };
  });
}

/**
 * Track user activity (for future implementation)
 */
async function trackUserActivity(sessionId, activity) {
  // TODO: Implement activity tracking
  // For now, just a placeholder that does nothing
  return { success: true };
}

/**
 * Get user activity logs
 */
async function getUserActivityLogs(limit = 100, offset = 0) {
  // Return recent price reports as activity logs
  const query = `
    SELECT 
      pr.id,
      pr.reporter_ip as user_id,
      pr.reporter_identifier as user_name,
      'price_report' as activity_type,
      json_build_object(
        'station_id', pr.station_id,
        'station_name', s.name,
        'fuel_type', pr.fuel_type,
        'price', pr.price
      ) as details,
      pr.created_at as timestamp
    FROM fuel_price_reports pr
    LEFT JOIN stations s ON pr.station_id = s.id
    ORDER BY pr.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

module.exports = {
  getUserStats,
  getActiveUsers,
  getRecentSessions,
  trackUserActivity,
  getUserActivityLogs
};
