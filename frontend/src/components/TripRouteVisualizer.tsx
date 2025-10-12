/**
 * Trip Route Visualizer Component
 * 
 * A reusable React component for visualizing trip routes on Leaflet maps.
 * Features:
 * - Dynamic color gradient along the route
 * - Start and End markers
 * - Auto-fit map bounds
 * - Smooth polyline rendering
 * - Support for multiple trips
 * 
 * @module TripRouteVisualizer
 * @version 3.0.0
 * @since Phase 3
 */

import React, { useEffect, useRef } from 'react';
import { useMap, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Trip, GPSPoint } from '../utils/indexedDB';
import {
  createGradientSegments,
  createRouteMarkerIcon,
  calculateBounds,
  validateRoutePoints,
  DEFAULT_ROUTE_OPTIONS,
  RouteVisualizationOptions,
  calculateRouteStats
} from '../utils/routeVisualizer';

/**
 * Props for TripRouteVisualizer component
 */
export interface TripRouteVisualizerProps {
  /** Trip data to visualize */
  trip: Trip;
  /** Visualization options */
  options?: RouteVisualizationOptions;
  /** Callback when route is clicked */
  onRouteClick?: (trip: Trip) => void;
  /** Whether to show trip info popup on markers */
  showPopup?: boolean;
  /** Custom class name for styling */
  className?: string;
}

/**
 * Hook to auto-fit map bounds to route
 */
function useFitBounds(
  coordinates: GPSPoint[],
  enabled: boolean,
  padding: [number, number]
) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!enabled || hasFitted.current || coordinates.length < 2) return;

    const bounds = calculateBounds(coordinates);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: padding,
        maxZoom: 16,
        animate: true,
        duration: 0.5
      });
      hasFitted.current = true;
    }
  }, [coordinates, enabled, padding, map]);

  // Reset when coordinates change
  useEffect(() => {
    hasFitted.current = false;
  }, [coordinates]);
}

/**
 * TripRouteVisualizer Component
 * 
 * Renders a trip route on a Leaflet map with gradient colors and markers.
 * 
 * @example
 * ```tsx
 * <MapContainer>
 *   <TileLayer />
 *   <TripRouteVisualizer 
 *     trip={myTrip}
 *     options={{
 *       gradient: { start: '#00ff00', end: '#ff0000' },
 *       showStartMarker: true,
 *       showEndMarker: true,
 *       fitBounds: true
 *     }}
 *   />
 * </MapContainer>
 * ```
 */
const TripRouteVisualizer: React.FC<TripRouteVisualizerProps> = ({
  trip,
  options = {},
  onRouteClick,
  showPopup = true,
  className = ''
}) => {
  // Merge with default options
  const opts = { ...DEFAULT_ROUTE_OPTIONS, ...options };

  // Validate route points
  const validation = validateRoutePoints(trip.coordinates);
  if (!validation.valid) {
    console.error('Invalid route points:', validation.errors);
    return null;
  }

  // Calculate route statistics
  const stats = calculateRouteStats(trip.coordinates);

  // Create gradient segments
  const segments = createGradientSegments(trip.coordinates, opts.gradient);

  // Get start and end points
  const startPoint = trip.coordinates[0];
  const endPoint = trip.coordinates[trip.coordinates.length - 1];

  // Auto-fit bounds
  useFitBounds(
    trip.coordinates,
    opts.fitBounds,
    opts.fitBoundsPadding
  );

  // Format duration for popup
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  // Handle route click
  const handlePolylineClick = () => {
    if (onRouteClick) {
      onRouteClick(trip);
    }
  };

  return (
    <div className={`trip-route-visualizer ${className}`}>
      {/* Render gradient polyline segments */}
      {segments.map((segment, index) => (
        <Polyline
          key={`segment-${trip.id}-${index}`}
          positions={segment.coordinates}
          pathOptions={{
            color: segment.color,
            weight: opts.weight,
            opacity: opts.opacity,
            smoothFactor: opts.smoothFactor,
            lineCap: 'round',
            lineJoin: 'round'
          }}
          eventHandlers={{
            click: handlePolylineClick
          }}
        />
      ))}

      {/* Start marker */}
      {opts.showStartMarker && startPoint && (
        <Marker
          position={[startPoint.latitude, startPoint.longitude]}
          icon={createRouteMarkerIcon('start')}
        >
          {showPopup && (
            <Popup>
              <div className="route-marker-popup">
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  🚀 Trip Start
                </h3>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  <div><strong>Trip:</strong> {trip.name}</div>
                  <div><strong>Time:</strong> {stats.startTime.toLocaleString()}</div>
                  <div>
                    <strong>Location:</strong> {startPoint.latitude.toFixed(6)}, {startPoint.longitude.toFixed(6)}
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Marker>
      )}

      {/* End marker */}
      {opts.showEndMarker && endPoint && (
        <Marker
          position={[endPoint.latitude, endPoint.longitude]}
          icon={createRouteMarkerIcon('end')}
        >
          {showPopup && (
            <Popup>
              <div className="route-marker-popup">
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  🏁 Trip End
                </h3>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  <div><strong>Trip:</strong> {trip.name}</div>
                  <div><strong>Time:</strong> {stats.endTime.toLocaleString()}</div>
                  <div><strong>Duration:</strong> {formatDuration(stats.duration)}</div>
                  <div><strong>Points:</strong> {stats.totalPoints}</div>
                  <div>
                    <strong>Location:</strong> {endPoint.latitude.toFixed(6)}, {endPoint.longitude.toFixed(6)}
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Marker>
      )}
    </div>
  );
};

export default TripRouteVisualizer;
