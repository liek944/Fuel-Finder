/**
 * User Activity Tracking Utility
 * 
 * Lightweight client-side tracking that sends periodic heartbeats to the backend
 * to enable real-time user statistics in the admin dashboard.
 * 
 * Features:
 * - Generates and persists session ID in localStorage
 * - Sends heartbeat pings every 60 seconds
 * - Tracks current page and feature usage
 * - Includes approximate location (city-level, not precise)
 * - Automatically cleans up on page unload
 */

import { getApiUrl } from './api';

class UserActivityTracker {
  private sessionId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentPage: string = 'main';
  private isTracking: boolean = false;
  private heartbeatIntervalMs: number = 60000; // 60 seconds
  
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }
  
  /**
   * Get or create a persistent session ID
   */
  private getOrCreateSessionId(): string {
    const storageKey = 'fuel_finder_session_id';
    let sessionId = localStorage.getItem(storageKey);
    
    if (!sessionId) {
      // Generate a new session ID
      sessionId = this.generateSessionId();
      localStorage.setItem(storageKey, sessionId);
    }
    
    return sessionId;
  }
  
  /**
   * Generate a random session ID
   */
  private generateSessionId(): string {
    return 'session_' + 
           Date.now().toString(36) + 
           '_' + 
           Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Send heartbeat to server
   */
  private async sendHeartbeat(page?: string, feature?: string): Promise<void> {
    try {
      // Get approximate location (city-level)
      const location = await this.getApproximateLocation();
      
      const url = getApiUrl('/api/user/heartbeat');
      console.log('📡 Sending heartbeat to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          location,
          page: page || this.currentPage,
          feature
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Heartbeat successful - Active users:', data.activeUsers);
      } else {
        console.warn('❌ Heartbeat failed:', response.status, response.statusText);
      }
    } catch (error) {
      // Log errors visibly for debugging
      console.error('❌ Heartbeat error:', error);
    }
  }
  
  /**
   * Get approximate location (city-level, not precise coordinates)
   */
  private async getApproximateLocation(): Promise<any> {
    try {
      // Try to get position from geolocation API
      if ('geolocation' in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Round to 1 decimal place for privacy (~10km precision)
              resolve({
                lat: Math.round(position.coords.latitude * 10) / 10,
                lng: Math.round(position.coords.longitude * 10) / 10,
                city: 'Unknown', // Will be geocoded on server if needed
                region: 'Unknown'
              });
            },
            () => {
              // Geolocation denied or failed
              resolve(null);
            },
            { timeout: 5000, maximumAge: 300000 } // 5 second timeout, 5 min cache
          );
        });
      }
    } catch (error) {
      console.debug('Geolocation not available');
    }
    
    return null;
  }
  
  /**
   * Start tracking user activity
   */
  public startTracking(page: string = 'main'): void {
    if (this.isTracking) {
      return; // Already tracking
    }
    
    this.currentPage = page;
    this.isTracking = true;
    
    // Send immediate heartbeat on start
    this.sendHeartbeat(page);
    
    // Set up periodic heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);
    
    // Send heartbeat on page visibility change (return from background)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    console.log('🔄 User tracking started - Session ID:', this.sessionId, '| Heartbeat interval:', this.heartbeatIntervalMs / 1000, 'seconds');
  }
  
  /**
   * Stop tracking user activity
   */
  public stopTracking(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    this.isTracking = false;
    console.log('⏹️ User tracking stopped');
  }
  
  /**
   * Update current page
   */
  public setPage(page: string): void {
    this.currentPage = page;
    // Send immediate heartbeat when page changes
    if (this.isTracking) {
      this.sendHeartbeat(page);
    }
  }
  
  /**
   * Track feature usage
   */
  public trackFeature(feature: string): void {
    if (this.isTracking) {
      this.sendHeartbeat(this.currentPage, feature);
    }
  }
  
  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange = (): void => {
    if (!document.hidden && this.isTracking) {
      // Page became visible again, send heartbeat
      this.sendHeartbeat();
    }
  };
  
  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }
}

// Create singleton instance
const userActivityTracker = new UserActivityTracker();

export default userActivityTracker;
