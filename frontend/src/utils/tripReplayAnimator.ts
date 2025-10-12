/**
 * Trip Replay Animator
 * 
 * Provides smooth animation for replaying recorded trip routes using requestAnimationFrame.
 * Features:
 * - Smooth interpolation between GPS points
 * - Adjustable playback speed (1x-4x)
 * - Play/Pause/Restart controls
 * - Progress tracking
 * - Event-based state updates
 * 
 * @module tripReplayAnimator
 * @version 4.0.0
 * @since Phase 4
 */

import { GPSPoint } from './indexedDB';

/**
 * Animation state
 */
export type AnimationState = 'idle' | 'playing' | 'paused' | 'completed';

/**
 * Playback speed multiplier
 */
export type PlaybackSpeed = 1 | 1.5 | 2 | 3 | 4;

/**
 * Current position during animation
 */
export interface AnimationPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  progress: number; // 0-1
  segmentIndex: number;
  heading?: number;
  speed?: number;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Playback speed multiplier (1x-4x) */
  speed: PlaybackSpeed;
  /** Whether to loop animation when completed */
  loop: boolean;
  /** Minimum time between frames (ms) - for performance throttling */
  minFrameInterval: number;
  /** Whether to interpolate between points for smoother animation */
  interpolate: boolean;
  /** Number of interpolation steps between GPS points */
  interpolationSteps: number;
}

/**
 * Default animation configuration
 */
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  speed: 1,
  loop: false,
  minFrameInterval: 16, // ~60fps
  interpolate: true,
  interpolationSteps: 10
};

/**
 * Animation event listener
 */
export type AnimationListener = (position: AnimationPosition, state: AnimationState) => void;

/**
 * Trip Replay Animator Class
 * 
 * Manages animation state and provides smooth playback of trip routes.
 * Uses requestAnimationFrame for optimal performance.
 */
export class TripReplayAnimator {
  private coordinates: GPSPoint[];
  private config: AnimationConfig;
  private state: AnimationState = 'idle';
  private listeners: Set<AnimationListener> = new Set();
  
  // Animation state
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private currentSegmentIndex: number = 0;
  private lastFrameTime: number = 0;
  
  // Interpolated points for smooth animation
  private interpolatedPoints: GPSPoint[] = [];
  private totalDuration: number = 0;

  constructor(coordinates: GPSPoint[], config: Partial<AnimationConfig> = {}) {
    this.coordinates = coordinates;
    this.config = { ...DEFAULT_ANIMATION_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initialize animation data
   */
  private initialize(): void {
    if (this.coordinates.length < 2) {
      console.warn('TripReplayAnimator: Need at least 2 coordinates');
      return;
    }

    // Calculate total duration
    this.totalDuration = this.coordinates[this.coordinates.length - 1].timestamp - 
                         this.coordinates[0].timestamp;

    // Create interpolated points if enabled
    if (this.config.interpolate) {
      this.interpolatedPoints = this.createInterpolatedPoints();
    } else {
      this.interpolatedPoints = [...this.coordinates];
    }
  }

  /**
   * Create interpolated points between GPS coordinates for smoother animation
   */
  private createInterpolatedPoints(): GPSPoint[] {
    const interpolated: GPSPoint[] = [];

    for (let i = 0; i < this.coordinates.length - 1; i++) {
      const start = this.coordinates[i];
      const end = this.coordinates[i + 1];
      const steps = this.config.interpolationSteps;

      // Add start point
      interpolated.push(start);

      // Add interpolated points
      for (let j = 1; j < steps; j++) {
        const factor = j / steps;
        interpolated.push({
          latitude: start.latitude + (end.latitude - start.latitude) * factor,
          longitude: start.longitude + (end.longitude - start.longitude) * factor,
          timestamp: start.timestamp + (end.timestamp - start.timestamp) * factor,
          accuracy: start.accuracy,
          altitude: start.altitude !== null && end.altitude !== null
            ? start.altitude + (end.altitude - start.altitude) * factor
            : null,
          heading: this.calculateHeading(start, end),
          speed: start.speed || end.speed || null
        });
      }
    }

    // Add final point
    interpolated.push(this.coordinates[this.coordinates.length - 1]);

    return interpolated;
  }

  /**
   * Calculate heading (bearing) between two points
   */
  private calculateHeading(start: GPSPoint, end: GPSPoint): number {
    const lat1 = start.latitude * Math.PI / 180;
    const lat2 = end.latitude * Math.PI / 180;
    const dLon = (end.longitude - start.longitude) * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    const heading = Math.atan2(y, x) * 180 / Math.PI;
    return (heading + 360) % 360; // Normalize to 0-360
  }

  /**
   * Get current position based on elapsed time
   */
  private getCurrentPosition(elapsedTime: number): AnimationPosition | null {
    if (this.interpolatedPoints.length === 0) return null;

    // Calculate actual elapsed time considering speed multiplier
    const scaledTime = elapsedTime * this.config.speed;
    const startTimestamp = this.interpolatedPoints[0].timestamp;
    const currentTimestamp = startTimestamp + scaledTime;

    // Find the segment we're currently in
    let segmentIndex = 0;
    for (let i = 0; i < this.interpolatedPoints.length - 1; i++) {
      if (currentTimestamp >= this.interpolatedPoints[i].timestamp &&
          currentTimestamp <= this.interpolatedPoints[i + 1].timestamp) {
        segmentIndex = i;
        break;
      }
    }

    // Check if animation is complete
    if (currentTimestamp >= this.interpolatedPoints[this.interpolatedPoints.length - 1].timestamp) {
      const lastPoint = this.interpolatedPoints[this.interpolatedPoints.length - 1];
      return {
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
        timestamp: lastPoint.timestamp,
        progress: 1,
        segmentIndex: this.interpolatedPoints.length - 1,
        heading: lastPoint.heading,
        speed: lastPoint.speed || undefined
      };
    }

    // Interpolate between segment points
    const start = this.interpolatedPoints[segmentIndex];
    const end = this.interpolatedPoints[segmentIndex + 1];
    const segmentDuration = end.timestamp - start.timestamp;
    const segmentProgress = segmentDuration > 0
      ? (currentTimestamp - start.timestamp) / segmentDuration
      : 0;

    const latitude = start.latitude + (end.latitude - start.latitude) * segmentProgress;
    const longitude = start.longitude + (end.longitude - start.longitude) * segmentProgress;
    const overallProgress = (currentTimestamp - startTimestamp) / this.totalDuration;

    return {
      latitude,
      longitude,
      timestamp: currentTimestamp,
      progress: Math.min(1, Math.max(0, overallProgress)),
      segmentIndex,
      heading: this.calculateHeading(start, end),
      speed: start.speed || end.speed || undefined
    };
  }

  /**
   * Animation loop using requestAnimationFrame
   */
  private animate = (timestamp: number): void => {
    // Throttle frame rate if needed
    if (timestamp - this.lastFrameTime < this.config.minFrameInterval) {
      this.animationFrameId = requestAnimationFrame(this.animate);
      return;
    }
    this.lastFrameTime = timestamp;

    // Calculate elapsed time
    const elapsedTime = timestamp - this.startTime;
    
    // Get current position
    const position = this.getCurrentPosition(elapsedTime);
    
    if (!position) {
      this.stop();
      return;
    }

    // Update current segment index
    this.currentSegmentIndex = position.segmentIndex;

    // Notify listeners
    this.notifyListeners(position, this.state);

    // Check if animation is complete
    if (position.progress >= 1) {
      if (this.config.loop) {
        this.restart();
      } else {
        this.complete();
      }
      return;
    }

    // Continue animation
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Start or resume animation
   */
  play(): void {
    if (this.state === 'playing') return;

    if (this.state === 'idle' || this.state === 'completed') {
      // Start from beginning
      this.startTime = performance.now();
      this.pausedTime = 0;
      this.currentSegmentIndex = 0;
    } else if (this.state === 'paused') {
      // Resume from paused position
      this.startTime = performance.now() - this.pausedTime;
    }

    this.state = 'playing';
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Pause animation
   */
  pause(): void {
    if (this.state !== 'playing') return;

    this.pausedTime = performance.now() - this.startTime;
    this.state = 'paused';
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Stop animation and reset to beginning
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.state = 'idle';
    this.startTime = 0;
    this.pausedTime = 0;
    this.currentSegmentIndex = 0;
  }

  /**
   * Restart animation from beginning
   */
  restart(): void {
    this.stop();
    this.play();
  }

  /**
   * Mark animation as completed
   */
  private complete(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.state = 'completed';
    
    // Notify listeners with final position
    const finalPoint = this.interpolatedPoints[this.interpolatedPoints.length - 1];
    this.notifyListeners({
      latitude: finalPoint.latitude,
      longitude: finalPoint.longitude,
      timestamp: finalPoint.timestamp,
      progress: 1,
      segmentIndex: this.interpolatedPoints.length - 1,
      heading: finalPoint.heading,
      speed: finalPoint.speed || undefined
    }, 'completed');
  }

  /**
   * Seek to specific progress (0-1)
   */
  seek(progress: number): void {
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const targetTime = this.totalDuration * clampedProgress;
    
    const wasPlaying = this.state === 'playing';
    if (wasPlaying) {
      this.pause();
    }

    this.pausedTime = targetTime;
    this.startTime = performance.now() - targetTime;

    // Get position at target time
    const position = this.getCurrentPosition(targetTime);
    if (position) {
      this.currentSegmentIndex = position.segmentIndex;
      this.notifyListeners(position, this.state);
    }

    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Update playback speed
   */
  setSpeed(speed: PlaybackSpeed): void {
    const wasPlaying = this.state === 'playing';
    const currentProgress = this.getCurrentProgress();

    this.config.speed = speed;

    // Adjust timing to maintain current position
    if (wasPlaying) {
      this.pause();
      this.seek(currentProgress);
      this.play();
    }
  }

  /**
   * Get current playback speed
   */
  getSpeed(): PlaybackSpeed {
    return this.config.speed;
  }

  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return this.state;
  }

  /**
   * Get current progress (0-1)
   */
  getCurrentProgress(): number {
    if (this.state === 'idle') return 0;
    if (this.state === 'completed') return 1;

    const elapsedTime = this.state === 'paused' 
      ? this.pausedTime 
      : performance.now() - this.startTime;
    
    const position = this.getCurrentPosition(elapsedTime);
    return position ? position.progress : 0;
  }

  /**
   * Get current position
   */
  getCurrentAnimationPosition(): AnimationPosition | null {
    if (this.state === 'idle') {
      const firstPoint = this.interpolatedPoints[0];
      return firstPoint ? {
        latitude: firstPoint.latitude,
        longitude: firstPoint.longitude,
        timestamp: firstPoint.timestamp,
        progress: 0,
        segmentIndex: 0,
        heading: firstPoint.heading,
        speed: firstPoint.speed || undefined
      } : null;
    }

    const elapsedTime = this.state === 'paused' 
      ? this.pausedTime 
      : performance.now() - this.startTime;
    
    return this.getCurrentPosition(elapsedTime);
  }

  /**
   * Subscribe to animation updates
   */
  subscribe(listener: AnimationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of position update
   */
  private notifyListeners(position: AnimationPosition, state: AnimationState): void {
    this.listeners.forEach(listener => {
      try {
        listener(position, state);
      } catch (error) {
        console.error('Error in animation listener:', error);
      }
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnimationConfig>): void {
    const oldSpeed = this.config.speed;
    this.config = { ...this.config, ...config };

    // Reinitialize if interpolation settings changed
    if (config.interpolate !== undefined || config.interpolationSteps !== undefined) {
      const wasPlaying = this.state === 'playing';
      const currentProgress = this.getCurrentProgress();
      
      this.stop();
      this.initialize();
      
      if (currentProgress > 0) {
        this.seek(currentProgress);
      }
      
      if (wasPlaying) {
        this.play();
      }
    }

    // Adjust speed if changed
    if (config.speed !== undefined && config.speed !== oldSpeed) {
      this.setSpeed(config.speed);
    }
  }

  /**
   * Get total animation duration (in milliseconds)
   */
  getTotalDuration(): number {
    return this.totalDuration;
  }

  /**
   * Get total number of points (including interpolated)
   */
  getTotalPoints(): number {
    return this.interpolatedPoints.length;
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.interpolatedPoints = [];
  }
}

/**
 * Create a trip replay animator instance
 * 
 * @param coordinates - GPS coordinates to animate
 * @param config - Animation configuration
 * @returns TripReplayAnimator instance
 */
export function createTripReplayAnimator(
  coordinates: GPSPoint[],
  config?: Partial<AnimationConfig>
): TripReplayAnimator {
  return new TripReplayAnimator(coordinates, config);
}
