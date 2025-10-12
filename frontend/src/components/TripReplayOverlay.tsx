/**
 * Trip Replay Overlay Component
 * 
 * Displays real-time information during trip replay animation.
 * Features:
 * - Trip title display
 * - Current speed indicator
 * - Current timestamp
 * - Progress percentage
 * - Distance traveled
 * - Customizable positioning
 * 
 * @module TripReplayOverlay
 * @version 7.0.0
 * @since Phase 7
 */

import React from 'react';
import { AnimationPosition } from '../utils/tripReplayAnimator';
import { Trip } from '../utils/indexedDB';

/**
 * Props for TripReplayOverlay component
 */
export interface TripReplayOverlayProps {
  /** Trip being replayed */
  trip: Trip;
  /** Current animation position */
  position: AnimationPosition | null;
  /** Whether to show trip title */
  showTitle?: boolean;
  /** Whether to show speed indicator */
  showSpeed?: boolean;
  /** Whether to show timestamp */
  showTimestamp?: boolean;
  /** Whether to show progress percentage */
  showProgress?: boolean;
  /** Whether to show distance traveled */
  showDistance?: boolean;
  /** Custom class name */
  className?: string;
  /** Overlay position */
  position_style?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
}

/**
 * Format speed for display
 */
function formatSpeed(kmh: number | undefined): string {
  if (kmh === undefined || kmh === null) return '--';
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Calculate distance traveled from start
 */
function calculateDistanceTraveled(
  coordinates: { latitude: number; longitude: number }[],
  currentIndex: number
): number {
  let distance = 0;
  
  for (let i = 0; i < Math.min(currentIndex, coordinates.length - 1); i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    distance += haversineDistance(
      start.latitude,
      start.longitude,
      end.latitude,
      end.longitude
    );
  }
  
  return distance;
}

/**
 * Haversine distance formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)} m`;
  }
  return `${km.toFixed(2)} km`;
}

/**
 * TripReplayOverlay Component
 * 
 * Renders an information overlay during trip replay.
 * 
 * @example
 * ```tsx
 * <TripReplayOverlay
 *   trip={myTrip}
 *   position={currentPosition}
 *   showTitle={true}
 *   showSpeed={true}
 *   showTimestamp={true}
 *   position_style="top-left"
 * />
 * ```
 */
const TripReplayOverlay: React.FC<TripReplayOverlayProps> = ({
  trip,
  position,
  showTitle = true,
  showSpeed = true,
  showTimestamp = true,
  showProgress = true,
  showDistance = false,
  className = '',
  position_style = 'top-left'
}) => {
  if (!position) return null;

  const distanceTraveled = showDistance
    ? calculateDistanceTraveled(trip.coordinates, position.segmentIndex)
    : 0;

  const progressPercent = (position.progress * 100).toFixed(1);

  return (
    <div className={`trip-replay-overlay trip-replay-overlay-${position_style} ${className}`}>
      {/* Trip Title */}
      {showTitle && (
        <div className="overlay-section overlay-title">
          <div className="overlay-title-text">{trip.name || 'Untitled Trip'}</div>
          <div className="overlay-subtitle">{formatDate(trip.startTime)}</div>
        </div>
      )}

      {/* Current Stats */}
      <div className="overlay-section overlay-stats">
        {/* Speed Indicator */}
        {showSpeed && (
          <div className="overlay-stat overlay-speed">
            <div className="overlay-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="overlay-stat-content">
              <div className="overlay-stat-label">Speed</div>
              <div className="overlay-stat-value">{formatSpeed(position.speed)}</div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        {showTimestamp && (
          <div className="overlay-stat overlay-time">
            <div className="overlay-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="overlay-stat-content">
              <div className="overlay-stat-label">Time</div>
              <div className="overlay-stat-value">{formatTimestamp(position.timestamp)}</div>
            </div>
          </div>
        )}

        {/* Progress */}
        {showProgress && (
          <div className="overlay-stat overlay-progress">
            <div className="overlay-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            </div>
            <div className="overlay-stat-content">
              <div className="overlay-stat-label">Progress</div>
              <div className="overlay-stat-value">{progressPercent}%</div>
            </div>
          </div>
        )}

        {/* Distance Traveled */}
        {showDistance && (
          <div className="overlay-stat overlay-distance">
            <div className="overlay-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </div>
            <div className="overlay-stat-content">
              <div className="overlay-stat-label">Traveled</div>
              <div className="overlay-stat-value">{formatDistance(distanceTraveled)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Mini Progress Bar */}
      {showProgress && (
        <div className="overlay-mini-progress">
          <div className="overlay-mini-progress-bar">
            <div 
              className="overlay-mini-progress-fill"
              style={{ width: `${position.progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TripReplayOverlay;
