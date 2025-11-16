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

interface VisualAlertCallback {
  (title: string, message: string, icon: string): void;
}

class ArrivalNotificationManager {
  private notificationState: NotificationState | null = null;
  private currentDestination: Destination | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private voiceEnabled: boolean = true;
  private notificationsEnabled: boolean = false; // Visual notifications (in-app alerts)
  private keepScreenOn: boolean = false;
  private wakeLock: any | null = null;
  private visualAlertCallback: VisualAlertCallback | null = null;
  private handleWakeLockVisibilityChange = async (): Promise<void> => {
    if (!this.keepScreenOn) return;
    if (document.hidden) {
      await this.releaseWakeLock();
    } else {
      await this.requestWakeLock();
    }
  };
  private handlePageHide = async (): Promise<void> => {
    await this.releaseWakeLock();
  };

  constructor() {
    // Check if Speech Synthesis is available
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
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
   * Show visual alert (in-app notification)
   */
  private showVisualAlert(title: string, message: string, icon: string): void {
    if (!this.notificationsEnabled) {
      console.log('🔕 Visual alerts disabled by user');
      return;
    }

    if (!this.visualAlertCallback) {
      console.warn('⚠️ Visual alert callback not registered');
      return;
    }

    try {
      console.log('📢 Showing visual alert:', title);
      this.visualAlertCallback(title, message, icon);
      console.log('✅ Visual alert displayed successfully');
    } catch (error) {
      console.error('❌ Failed to show visual alert:', error);
    }
  }

  /**
   * Register callback for visual alerts
   */
  setVisualAlertCallback(callback: VisualAlertCallback | null): void {
    this.visualAlertCallback = callback;
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
    if (this.keepScreenOn) {
      this.requestWakeLock();
    }
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
    if (this.keepScreenOn) {
      this.releaseWakeLock();
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
      this.showVisualAlert(
        '🎉 You have arrived!',
        `You've reached ${destName}`,
        '🎉'
      );
      this.speak(`You have arrived at ${destName}`);
      (navigator as any).vibrate && (navigator as any).vibrate(200);
      console.log('🎉 Arrival notification triggered');
    }
    // 100m notification
    else if (
      distance <= 100 &&
      distance > 20 &&
      !this.notificationState.notified100m
    ) {
      this.notificationState.notified100m = true;
      this.showVisualAlert(
        '📍 Almost there!',
        `${destName} is 100 meters ahead`,
        '📍'
      );
      this.speak(`${destName} is 100 meters ahead`);
      (navigator as any).vibrate && (navigator as any).vibrate(200);
      console.log('📍 100m notification triggered');
    }
    // 200m notification
    else if (
      distance <= 200 &&
      distance > 100 &&
      !this.notificationState.notified200m
    ) {
      this.notificationState.notified200m = true;
      this.showVisualAlert(
        '🚗 Approaching destination',
        `${destName} is 200 meters ahead`,
        '🚗'
      );
      this.speak(`Approaching ${destName}, 200 meters ahead`);
      (navigator as any).vibrate && (navigator as any).vibrate(200);
      console.log('🚗 200m notification triggered');
    }
    // 500m notification
    else if (
      distance <= 500 &&
      distance > 200 &&
      !this.notificationState.notified500m
    ) {
      this.notificationState.notified500m = true;
      this.showVisualAlert(
        '🎯 Destination nearby',
        `${destName} is 500 meters ahead`,
        '🎯'
      );
      this.speak(`${destName} is 500 meters ahead`);
      (navigator as any).vibrate && (navigator as any).vibrate(200);
      console.log('🎯 500m notification triggered');
    }
  }

  setKeepScreenOn(enabled: boolean): void {
    this.keepScreenOn = enabled;
    if (enabled) {
      document.addEventListener('visibilitychange', this.handleWakeLockVisibilityChange);
      window.addEventListener('pagehide', this.handlePageHide);
      this.requestWakeLock();
    } else {
      document.removeEventListener('visibilitychange', this.handleWakeLockVisibilityChange);
      window.removeEventListener('pagehide', this.handlePageHide);
      this.releaseWakeLock();
    }
  }

  private async requestWakeLock(): Promise<void> {
    try {
      const nav: any = navigator as any;
      if (!nav.wakeLock) return;
      if (this.wakeLock) return;
      const sentinel = await nav.wakeLock.request('screen');
      this.wakeLock = sentinel;
      if (this.wakeLock && this.wakeLock.addEventListener) {
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch (e) {}
  }

  private async releaseWakeLock(): Promise<void> {
    try {
      if (this.wakeLock && this.wakeLock.release) {
        await this.wakeLock.release();
      }
    } catch (e) {
    } finally {
      this.wakeLock = null;
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
  getSettings(): { voice: boolean; notifications: boolean } {
    return {
      voice: this.voiceEnabled,
      notifications: this.notificationsEnabled,
    };
  }

  /**
   * Test visual alert (for user to verify it works)
   */
  testNotification(): void {
    this.showVisualAlert(
      '🔔 Test Alert',
      'Visual alerts are working!',
      '🔔'
    );
    this.speak('Test alert. Visual notifications are working.');
  }

  /**
   * Test voice announcement (public method for external testing)
   */
  testVoice(message: string): void {
    this.speak(message);
  }
}

// Export singleton instance
export const arrivalNotifications = new ArrivalNotificationManager();
