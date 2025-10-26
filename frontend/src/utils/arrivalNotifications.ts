/**
 * Arrival Notifications System
 * Provides visual notifications and voice announcements when user approaches/arrives at destination
 */

interface Destination {
  name: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface NotificationState {
  notified500m: boolean;
  notified200m: boolean;
  notified100m: boolean;
  notifiedArrival: boolean;
  lastDistance: number;
}

class ArrivalNotificationManager {
  private notificationState: NotificationState | null = null;
  private currentDestination: Destination | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private permissionGranted: boolean = false;
  private voiceEnabled: boolean = true;
  private notificationsEnabled: boolean = true;

  constructor() {
    // Check if Speech Synthesis is available
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }

    // Request notification permission on first use
    this.requestNotificationPermission();
  }

  /**
   * Request notification permission from user
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    }

    return false;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Show browser notification
   */
  private showNotification(title: string, body: string, icon?: string): void {
    if (!this.notificationsEnabled || !this.permissionGranted) return;

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/logo192.png',
        badge: '/logo192.png',
        tag: 'fuel-finder-arrival',
        requireInteraction: false,
        vibrate: [200, 100, 200],
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Speak message using Web Speech API
   */
  private speak(message: string): void {
    if (!this.voiceEnabled || !this.speechSynthesis) return;

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    try {
      this.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to speak:', error);
    }
  }

  /**
   * Set destination for arrival tracking
   */
  setDestination(destination: Destination | null): void {
    if (!destination) {
      this.clearDestination();
      return;
    }

    this.currentDestination = destination;
    this.notificationState = {
      notified500m: false,
      notified200m: false,
      notified100m: false,
      notifiedArrival: false,
      lastDistance: Infinity,
    };

    console.log('🎯 Destination set:', destination.name);
  }

  /**
   * Clear current destination
   */
  clearDestination(): void {
    this.currentDestination = null;
    this.notificationState = null;
    
    // Cancel any ongoing speech
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
  }

  /**
   * Update user position and check for arrival notifications
   */
  updatePosition(userLat: number, userLng: number): void {
    if (!this.currentDestination || !this.notificationState) return;

    const distance = this.calculateDistance(
      userLat,
      userLng,
      this.currentDestination.location.lat,
      this.currentDestination.location.lng
    );

    const destName = this.currentDestination.name;

    // Check if we're getting closer (prevent notifications when moving away)
    const gettingCloser = distance < this.notificationState.lastDistance;
    this.notificationState.lastDistance = distance;

    if (!gettingCloser) return;

    // Arrival notification (within 20 meters)
    if (distance <= 20 && !this.notificationState.notifiedArrival) {
      this.notificationState.notifiedArrival = true;
      this.showNotification(
        '🎉 You have arrived!',
        `You've reached ${destName}`,
        '/logo192.png'
      );
      this.speak(`You have arrived at ${destName}`);
      console.log('🎉 Arrival notification triggered');
    }
    // 100m notification
    else if (
      distance <= 100 &&
      distance > 20 &&
      !this.notificationState.notified100m
    ) {
      this.notificationState.notified100m = true;
      this.showNotification(
        '📍 Almost there!',
        `${destName} is 100 meters ahead`,
        '/logo192.png'
      );
      this.speak(`${destName} is 100 meters ahead`);
      console.log('📍 100m notification triggered');
    }
    // 200m notification
    else if (
      distance <= 200 &&
      distance > 100 &&
      !this.notificationState.notified200m
    ) {
      this.notificationState.notified200m = true;
      this.showNotification(
        '🚗 Approaching destination',
        `${destName} is 200 meters ahead`,
        '/logo192.png'
      );
      this.speak(`Approaching ${destName}, 200 meters ahead`);
      console.log('🚗 200m notification triggered');
    }
    // 500m notification
    else if (
      distance <= 500 &&
      distance > 200 &&
      !this.notificationState.notified500m
    ) {
      this.notificationState.notified500m = true;
      this.showNotification(
        '🎯 Destination nearby',
        `${destName} is 500 meters ahead`,
        '/logo192.png'
      );
      this.speak(`${destName} is 500 meters ahead`);
      console.log('🎯 500m notification triggered');
    }
  }

  /**
   * Get current distance to destination
   */
  getDistanceToDestination(userLat: number, userLng: number): number | null {
    if (!this.currentDestination) return null;

    return this.calculateDistance(
      userLat,
      userLng,
      this.currentDestination.location.lat,
      this.currentDestination.location.lng
    );
  }

  /**
   * Enable/disable voice announcements
   */
  setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    
    if (!enabled && this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
  }

  /**
   * Enable/disable visual notifications
   */
  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  /**
   * Get current settings
   */
  getSettings(): { voice: boolean; notifications: boolean; permission: boolean } {
    return {
      voice: this.voiceEnabled,
      notifications: this.notificationsEnabled,
      permission: this.permissionGranted,
    };
  }

  /**
   * Test notification (for user to verify it works)
   */
  testNotification(): void {
    this.showNotification(
      '🔔 Test Notification',
      'Arrival notifications are working!',
      '/logo192.png'
    );
    this.speak('Test notification. Arrival alerts are working.');
  }
}

// Export singleton instance
export const arrivalNotifications = new ArrivalNotificationManager();
