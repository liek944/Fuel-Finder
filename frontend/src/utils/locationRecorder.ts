/**
 * Location Recorder Service
 * Real-time GPS tracking using navigator.geolocation.watchPosition()
 * Optimized for battery efficiency and accuracy
 */

import { tripDB, GPSPoint, Trip } from './indexedDB';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'error';

export interface RecorderConfig {
  updateInterval?: number; // Minimum time between updates (ms)
  highAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  minAccuracy?: number; // Minimum accuracy threshold (meters)
}

export interface RecorderState {
  status: RecordingStatus;
  currentTrip: Trip | null;
  pointsRecorded: number;
  lastPoint: GPSPoint | null;
  error: string | null;
}

class LocationRecorder {
  private watchId: number | null = null;
  private currentTripId: string | null = null;
  private lastUpdateTime: number = 0;
  private config: Required<RecorderConfig>;
  private state: RecorderState;
  private listeners: Set<(state: RecorderState) => void> = new Set();

  constructor(config: RecorderConfig = {}) {
    this.config = {
      updateInterval: config.updateInterval || 1000, // 1 second for better path tracking
      highAccuracy: config.highAccuracy !== undefined ? config.highAccuracy : true,
      maximumAge: config.maximumAge || 2000, // Reduced for fresher data
      timeout: config.timeout || 10000,
      minAccuracy: config.minAccuracy || 100, // 100 meters - more lenient to capture more points
    };

    this.state = {
      status: 'idle',
      currentTrip: null,
      pointsRecorded: 0,
      lastPoint: null,
      error: null,
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: RecorderState) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Update internal state
   */
  private updateState(updates: Partial<RecorderState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Request location permissions
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      this.updateState({
        status: 'error',
        error: 'Geolocation is not supported by this browser',
      });
      return false;
    }

    try {
      // Try to get current position to trigger permission prompt
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: this.config.highAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge,
        });
      });
      return true;
    } catch (error: any) {
      const errorMessage = this.getGeolocationErrorMessage(error);
      this.updateState({
        status: 'error',
        error: errorMessage,
      });
      return false;
    }
  }

  /**
   * Start recording a new trip
   */
  async startRecording(tripName?: string): Promise<boolean> {
    if (this.state.status === 'recording') {
      console.warn('Recording already in progress');
      return false;
    }

    if (!this.isSupported()) {
      this.updateState({
        status: 'error',
        error: 'Geolocation is not supported',
      });
      return false;
    }

    try {
      // Check for existing active trip
      const existingTrip = await tripDB.getActiveTrip();
      if (existingTrip) {
        await tripDB.endTrip(existingTrip.id);
      }

      // Create new trip
      const trip = await tripDB.createTrip(tripName);
      this.currentTripId = trip.id;

      this.updateState({
        status: 'recording',
        currentTrip: trip,
        pointsRecorded: 0,
        lastPoint: null,
        error: null,
      });

      // Start watching position
      this.watchId = navigator.geolocation.watchPosition(
        this.handlePositionSuccess.bind(this),
        this.handlePositionError.bind(this),
        {
          enableHighAccuracy: this.config.highAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge,
        }
      );

      console.log('Recording started:', trip.id);
      return true;
    } catch (error: any) {
      this.updateState({
        status: 'error',
        error: error.message || 'Failed to start recording',
      });
      return false;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<Trip | null> {
    if (this.state.status !== 'recording') {
      console.warn('No recording in progress');
      return null;
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.currentTripId) {
      await tripDB.endTrip(this.currentTripId);
      const trip = await tripDB.getTrip(this.currentTripId);
      
      this.updateState({
        status: 'idle',
        currentTrip: null,
        pointsRecorded: 0,
        lastPoint: null,
      });

      console.log('Recording stopped:', this.currentTripId);
      this.currentTripId = null;
      
      return trip;
    }

    this.updateState({ status: 'idle' });
    return null;
  }

  /**
   * Handle successful position update
   */
  private async handlePositionSuccess(position: GeolocationPosition): Promise<void> {
    const now = Date.now();

    // Throttle updates based on configured interval
    if (now - this.lastUpdateTime < this.config.updateInterval) {
      return;
    }

    // Filter out low accuracy readings
    if (position.coords.accuracy > this.config.minAccuracy) {
      console.warn(`Low accuracy reading: ${position.coords.accuracy}m, skipping`);
      return;
    }

    const point: GPSPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    };

    if (this.currentTripId) {
      try {
        await tripDB.addGPSPoint(this.currentTripId, point);
        this.lastUpdateTime = now;

        const updatedTrip = await tripDB.getTrip(this.currentTripId);
        
        this.updateState({
          currentTrip: updatedTrip,
          pointsRecorded: updatedTrip?.coordinates.length || 0,
          lastPoint: point,
        });

        console.log('GPS point recorded:', {
          lat: point.latitude.toFixed(6),
          lng: point.longitude.toFixed(6),
          accuracy: point.accuracy?.toFixed(1),
          total: updatedTrip?.coordinates.length,
        });
      } catch (error: any) {
        console.error('Failed to save GPS point:', error);
        this.updateState({
          status: 'error',
          error: 'Failed to save location data',
        });
      }
    }
  }

  /**
   * Handle position error
   */
  private handlePositionError(error: GeolocationPositionError): void {
    const errorMessage = this.getGeolocationErrorMessage(error);
    console.error('Geolocation error:', errorMessage);
    
    this.updateState({
      status: 'error',
      error: errorMessage,
    });
  }

  /**
   * Get user-friendly error message
   */
  private getGeolocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable. Please check your GPS.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'An unknown error occurred while getting location.';
    }
  }

  /**
   * Get current state
   */
  getState(): RecorderState {
    return { ...this.state };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RecorderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RecorderConfig {
    return { ...this.config };
  }

  /**
   * Pause recording (stop watching but keep trip active)
   */
  pauseRecording(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.updateState({ status: 'paused' });
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.state.status !== 'paused' || !this.currentTripId) {
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      this.handlePositionSuccess.bind(this),
      this.handlePositionError.bind(this),
      {
        enableHighAccuracy: this.config.highAccuracy,
        timeout: this.config.timeout,
        maximumAge: this.config.maximumAge,
      }
    );

    this.updateState({ status: 'recording' });
  }
}

// Export singleton instance
export const locationRecorder = new LocationRecorder({
  updateInterval: 3000, // 3 seconds
  highAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
  minAccuracy: 50, // 50 meters
});
