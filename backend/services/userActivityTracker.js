/**
 * User Activity Tracker Service
 * 
 * Lightweight in-memory tracking of active users without database overhead.
 * Uses a Map-based structure with automatic cleanup of stale sessions.
 * 
 * Features:
 * - Tracks anonymous users via session IDs
 * - Stores general location (city-level, not precise coordinates)
 * - Auto-expires inactive sessions
 * - Provides real-time statistics for admin dashboard
 * - Zero database writes for tracking (memory-only)
 */

const crypto = require('crypto');

class UserActivityTracker {
  constructor() {
    // Map: sessionId -> { sessionId, lastSeen, firstSeen, location, userAgent, pageViews, features }
    this.activeSessions = new Map();
    
    // Configuration
    this.SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity = session expires
    this.CLEANUP_INTERVAL_MS = 60 * 1000; // Run cleanup every 1 minute
    
    // Statistics cache
    this.statsCache = {
      data: null,
      lastUpdated: 0,
      CACHE_TTL_MS: 10 * 1000 // Cache stats for 10 seconds
    };
    
    // Start automatic cleanup
    this.startCleanup();
    
    console.log('👥 User Activity Tracker initialized (in-memory)');
  }
  
  /**
   * Record user activity (heartbeat)
   * @param {Object} data - { sessionId, location, userAgent, page, feature }
   */
  recordActivity(data) {
    const { sessionId, location, userAgent, page, feature } = data;
    
    if (!sessionId) {
      return { error: 'Session ID required' };
    }
    
    const now = Date.now();
    
    if (this.activeSessions.has(sessionId)) {
      // Update existing session
      const session = this.activeSessions.get(sessionId);
      session.lastSeen = now;
      session.pageViews = (session.pageViews || 0) + 1;
      
      // Update location if provided (user might be moving)
      if (location) {
        session.location = this.sanitizeLocation(location);
      }
      
      // Track feature usage
      if (feature) {
        session.features = session.features || {};
        session.features[feature] = (session.features[feature] || 0) + 1;
      }
      
      // Track page visits
      if (page) {
        session.currentPage = page;
      }
    } else {
      // Create new session
      this.activeSessions.set(sessionId, {
        sessionId,
        firstSeen: now,
        lastSeen: now,
        location: location ? this.sanitizeLocation(location) : null,
        userAgent: this.sanitizeUserAgent(userAgent),
        pageViews: 1,
        currentPage: page || 'unknown',
        features: feature ? { [feature]: 1 } : {}
      });
    }
    
    // Invalidate stats cache
    this.statsCache.data = null;
    
    return { success: true, sessionId };
  }
  
  /**
   * Sanitize location data to protect user privacy
   * Only keep city-level information, not precise coordinates
   */
  sanitizeLocation(location) {
    // If location has coordinates, generalize them to ~10km precision
    if (location.lat && location.lng) {
      return {
        lat: Math.round(location.lat * 10) / 10, // Round to 1 decimal place (~10km precision)
        lng: Math.round(location.lng * 10) / 10,
        city: location.city || 'Unknown',
        region: location.region || location.province || 'Unknown'
      };
    }
    
    return {
      city: location.city || 'Unknown',
      region: location.region || location.province || 'Unknown'
    };
  }
  
  /**
   * Sanitize user agent to extract only device type
   */
  sanitizeUserAgent(userAgent) {
    if (!userAgent) return 'Unknown';
    
    // Simple device detection
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'Mobile';
    }
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'Tablet';
    }
    return 'Desktop';
  }
  
  /**
   * Get comprehensive statistics about active users
   */
  getStatistics() {
    // Check cache
    const now = Date.now();
    if (this.statsCache.data && (now - this.statsCache.lastUpdated) < this.statsCache.CACHE_TTL_MS) {
      return this.statsCache.data;
    }
    
    // Clean up expired sessions first
    this.cleanupExpiredSessions();
    
    const sessions = Array.from(this.activeSessions.values());
    const activeCount = sessions.length;
    
    // Device breakdown
    const deviceBreakdown = {
      Mobile: 0,
      Desktop: 0,
      Tablet: 0,
      Unknown: 0
    };
    
    // Location breakdown (by region)
    const locationBreakdown = {};
    
    // Feature usage
    const featureUsage = {};
    
    // Current pages
    const pageBreakdown = {};
    
    // Session duration stats
    let totalDuration = 0;
    let longestSession = 0;
    
    sessions.forEach(session => {
      // Device stats
      const device = session.userAgent || 'Unknown';
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
      
      // Location stats
      if (session.location && session.location.region) {
        const region = session.location.region;
        locationBreakdown[region] = (locationBreakdown[region] || 0) + 1;
      }
      
      // Feature usage stats
      if (session.features) {
        Object.keys(session.features).forEach(feature => {
          featureUsage[feature] = (featureUsage[feature] || 0) + session.features[feature];
        });
      }
      
      // Page breakdown
      if (session.currentPage) {
        pageBreakdown[session.currentPage] = (pageBreakdown[session.currentPage] || 0) + 1;
      }
      
      // Duration stats
      const duration = session.lastSeen - session.firstSeen;
      totalDuration += duration;
      longestSession = Math.max(longestSession, duration);
    });
    
    const stats = {
      activeUsers: activeCount,
      timestamp: now,
      deviceBreakdown,
      locationBreakdown,
      featureUsage,
      pageBreakdown,
      sessionStats: {
        averageDurationMinutes: activeCount > 0 ? Math.round(totalDuration / activeCount / 60000) : 0,
        longestSessionMinutes: Math.round(longestSession / 60000)
      },
      recentSessions: sessions
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, 10)
        .map(s => ({
          sessionId: s.sessionId.substring(0, 8) + '...', // Partial ID for privacy
          device: s.userAgent,
          location: s.location ? `${s.location.city}, ${s.location.region}` : 'Unknown',
          duration: Math.round((s.lastSeen - s.firstSeen) / 60000) + 'm',
          pageViews: s.pageViews,
          currentPage: s.currentPage
        }))
    };
    
    // Cache the results
    this.statsCache.data = stats;
    this.statsCache.lastUpdated = now;
    
    return stats;
  }
  
  /**
   * Get list of active users with basic info (for admin dashboard)
   */
  getActiveUsers() {
    this.cleanupExpiredSessions();
    
    const sessions = Array.from(this.activeSessions.values());
    
    return sessions.map(session => ({
      sessionId: session.sessionId.substring(0, 12) + '...', // Partial for privacy
      device: session.userAgent,
      location: session.location ? {
        lat: session.location.lat,
        lng: session.location.lng,
        display: `${session.location.city}, ${session.location.region}`
      } : null,
      duration: Math.round((session.lastSeen - session.firstSeen) / 60000), // minutes
      pageViews: session.pageViews,
      currentPage: session.currentPage,
      lastActive: new Date(session.lastSeen).toISOString()
    }));
  }
  
  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastSeen > this.SESSION_TIMEOUT_MS) {
        this.activeSessions.delete(sessionId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired user session(s)`);
      // Invalidate stats cache
      this.statsCache.data = null;
    }
  }
  
  /**
   * Start automatic cleanup interval
   */
  startCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL_MS);
  }
  
  /**
   * Get current active user count (lightweight)
   */
  getActiveUserCount() {
    this.cleanupExpiredSessions();
    return this.activeSessions.size;
  }
  
  /**
   * Clear all sessions (for testing/maintenance)
   */
  clearAllSessions() {
    const count = this.activeSessions.size;
    this.activeSessions.clear();
    this.statsCache.data = null;
    return { cleared: count };
  }
}

// Create singleton instance
const userActivityTracker = new UserActivityTracker();

module.exports = userActivityTracker;
