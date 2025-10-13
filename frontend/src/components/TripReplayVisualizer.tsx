/**
 * Trip Replay Visualizer Component
 * 
 * Integrates trip replay animation with Leaflet map visualization.
 * Features:
 * - Animated vehicle marker following route
 * - Route visualization with gradient
 * - Playback controls
 * - Smooth marker movement
 * - Auto-follow camera option
 * - Trip summary analytics (Phase 6)
 * - Geometry simplification for performance (Phase 7)
 * - Throttled map updates (Phase 7)
 * - Visual overlays with trip info (Phase 7)
 * 
 * @module TripReplayVisualizer
 * @version 7.0.0
 * @since Phase 4, Enhanced in Phase 6, Optimized in Phase 7
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Trip } from '../utils/indexedDB';
import {
  TripReplayAnimator,
  createTripReplayAnimator,
  AnimationConfig,
  AnimationPosition,
  AnimationState
} from '../utils/tripReplayAnimator';
import {
  createGradientSegments,
  validateRoutePoints,
  RouteVisualizationOptions,
  DEFAULT_ROUTE_OPTIONS
} from '../utils/routeVisualizer';
import TripReplayController from './TripReplayController';
import TripSummaryCard from './TripSummaryCard';
import TripReplayOverlay from './TripReplayOverlay';
import { FuelCostConfig, StopDetectionConfig } from '../utils/tripAnalytics';
import {
  simplifyCoordinates,
  autoSimplifyCoordinates,
  SimplificationConfig
} from '../utils/geometryOptimizer';
import { throttle, rafThrottle, PerformanceMonitor } from '../utils/performanceUtils';
import '../styles/TripReplayOverlay.css';

/**
 * Props for TripReplayVisualizer component
 */
export interface TripReplayVisualizerProps {
  /** Trip data to replay */
  trip: Trip;
  /** Animation configuration */
  animationConfig?: Partial<AnimationConfig>;
  /** Route visualization options */
  routeOptions?: RouteVisualizationOptions;
  /** Whether to show playback controls */
  showControls?: boolean;
  /** Whether to auto-follow the animated marker */
  autoFollow?: boolean;
  /** Custom vehicle icon HTML */
  vehicleIconHtml?: string;
  /** Vehicle icon size */
  vehicleIconSize?: number;
  /** Whether to show the full route */
  showRoute?: boolean;
  /** Whether to show traveled path (different color) */
  showTraveledPath?: boolean;
  /** Whether to show trip summary analytics (Phase 6) */
  showSummary?: boolean;
  /** Fuel cost configuration for analytics */
  fuelConfig?: FuelCostConfig;
  /** Stop detection configuration for analytics */
  stopConfig?: StopDetectionConfig;
  /** Whether to show detailed metrics in summary */
  showDetailedMetrics?: boolean;
  /** Whether to allow fuel configuration editing */
  allowConfigEdit?: boolean;
  /** Whether to enable geometry simplification (Phase 7) */
  enableSimplification?: boolean;
  /** Simplification configuration (Phase 7) */
  simplificationConfig?: Partial<SimplificationConfig>;
  /** Whether to show real-time overlay (Phase 7) */
  showOverlay?: boolean;
  /** Overlay position (Phase 7) */
  overlayPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  /** Whether to throttle map updates (Phase 7) */
  throttleMapUpdates?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when animation state changes */
  onStateChange?: (state: AnimationState) => void;
  /** Callback when position updates */
  onPositionUpdate?: (position: AnimationPosition) => void;
  /** Callback when fuel configuration changes */
  onFuelConfigChange?: (config: FuelCostConfig) => void;
}

/**
 * Hook to manage map following with throttling (Phase 7 optimized)
 */
function useMapFollow(
  position: AnimationPosition | null,
  enabled: boolean,
  smoothFollow: boolean = true,
  throttled: boolean = true
) {
  const map = useMap();
  const lastPosition = useRef<AnimationPosition | null>(null);
  const performanceMonitor = useRef(new PerformanceMonitor());

  // Create throttled pan function
  const throttledPan = useRef(
    throttle((lat: number, lon: number) => {
      map.panTo([lat, lon], {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25
      });
    }, 100) // Update at most every 100ms
  );

  useEffect(() => {
    if (!enabled || !position) return;

    performanceMonitor.current.recordFrame();

    // Only update if position changed significantly
    if (lastPosition.current) {
      const distance = Math.sqrt(
        Math.pow(position.latitude - lastPosition.current.latitude, 2) +
        Math.pow(position.longitude - lastPosition.current.longitude, 2)
      );
      
      // Skip if movement is too small (< 0.0001 degrees ~11m)
      if (distance < 0.0001) return;
    }

    lastPosition.current = position;

    if (smoothFollow) {
      if (throttled) {
        throttledPan.current(position.latitude, position.longitude);
      } else {
        map.panTo([position.latitude, position.longitude], {
          animate: true,
          duration: 0.5,
          easeLinearity: 0.25
        });
      }
    } else {
      map.setView([position.latitude, position.longitude], map.getZoom(), {
        animate: false
      });
    }
  }, [position, enabled, smoothFollow, throttled, map]);
}

/**
 * Create vehicle marker icon
 */
function createVehicleIcon(
  heading: number = 0,
  customHtml?: string,
  size: number = 40
): L.DivIcon {
  const defaultHtml = `
    <div class="vehicle-marker" style="
      width: ${size}px;
      height: ${size}px;
      transform: rotate(${heading}deg);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" fill="#2196F3" opacity="0.2"/>
        <path d="M12 2 L12 12 L16 8 M12 12 L8 8" stroke="#2196F3" stroke-width="2.5" fill="none"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: customHtml || defaultHtml,
    className: 'vehicle-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

/**
 * TripReplayVisualizer Component
 * 
 * Renders an animated replay of a trip on a Leaflet map.
 * 
 * @example
 * ```tsx
 * <MapContainer>
 *   <TileLayer />
 *   <TripReplayVisualizer
 *     trip={myTrip}
 *     showControls={true}
 *     autoFollow={true}
 *     animationConfig={{ speed: 2, interpolate: true }}
 *   />
 * </MapContainer>
 * ```
 */
const TripReplayVisualizer: React.FC<TripReplayVisualizerProps> = ({
  trip,
  animationConfig,
  routeOptions = {},
  showControls = true,
  autoFollow = false,
  vehicleIconHtml,
  vehicleIconSize = 40,
  showRoute = true,
  showTraveledPath = true,
  showSummary = true,
  fuelConfig,
  stopConfig,
  showDetailedMetrics = true,
  allowConfigEdit = false,
  enableSimplification = true,
  simplificationConfig,
  showOverlay = true,
  overlayPosition = 'top-left',
  throttleMapUpdates = true,
  className = '',
  onStateChange,
  onPositionUpdate,
  onFuelConfigChange
}) => {
  // Performance monitoring
  const performanceMonitor = useRef(new PerformanceMonitor());
  const [simplificationMetrics, setSimplificationMetrics] = useState<{
    originalCount: number;
    simplifiedCount: number;
    reductionPercent: number;
  } | null>(null);
  
  // Merge with default options
  const opts = { ...DEFAULT_ROUTE_OPTIONS, ...routeOptions };

  // Validate route points (do validation but don't return early yet)
  const validation = validateRoutePoints(trip.coordinates);

  // Apply geometry simplification (Phase 7)
  const processedCoordinates = useMemo(() => {
    if (!enableSimplification || trip.coordinates.length <= 100) {
      return trip.coordinates;
    }

    const result = simplificationConfig
      ? simplifyCoordinates(trip.coordinates, simplificationConfig)
      : autoSimplifyCoordinates(trip.coordinates);

    setSimplificationMetrics({
      originalCount: result.originalCount,
      simplifiedCount: result.simplifiedCount,
      reductionPercent: result.reductionPercent
    });

    console.log(
      `[Phase 7] Geometry simplified: ${result.originalCount} → ${result.simplifiedCount} points ` +
      `(${result.reductionPercent.toFixed(1)}% reduction in ${result.processingTime.toFixed(2)}ms)`
    );

    return result.simplified;
  }, [trip.coordinates, enableSimplification, simplificationConfig]);

  // Create animator instance
  const animatorRef = useRef<TripReplayAnimator | null>(null);
  const [currentPosition, setCurrentPosition] = useState<AnimationPosition | null>(null);
  const [traveledCoordinates, setTraveledCoordinates] = useState<[number, number][]>([]);

  // Initialize animator with processed coordinates
  useEffect(() => {
    if (!animatorRef.current) {
      animatorRef.current = createTripReplayAnimator(processedCoordinates, animationConfig);
    }

    return () => {
      if (animatorRef.current) {
        animatorRef.current.dispose();
        animatorRef.current = null;
      }
    };
  }, [processedCoordinates, animationConfig]);

  // Subscribe to animator updates
  useEffect(() => {
    if (!animatorRef.current) return;

    const unsubscribe = animatorRef.current.subscribe((position, state) => {
      setCurrentPosition(position);

      // Update traveled path (using processed coordinates)
      if (showTraveledPath) {
        const traveledPoints = processedCoordinates
          .slice(0, position.segmentIndex + 1)
          .map(p => [p.latitude, p.longitude] as [number, number]);
        setTraveledCoordinates(traveledPoints);
      }

      // Track performance
      performanceMonitor.current.recordFrame();

      // Notify parent
      if (onStateChange) {
        onStateChange(state);
      }
      if (onPositionUpdate) {
        onPositionUpdate(position);
      }
    });

    return () => unsubscribe();
  }, [processedCoordinates, showTraveledPath, onStateChange, onPositionUpdate]);

  // Auto-follow map with throttling (Phase 7)
  useMapFollow(currentPosition, autoFollow, true, throttleMapUpdates);

  // Create gradient segments for route (using processed coordinates)
  const segments = showRoute ? createGradientSegments(processedCoordinates, opts.gradient) : [];

  // Get vehicle icon
  const vehicleIcon = currentPosition
    ? createVehicleIcon(currentPosition.heading || 0, vehicleIconHtml, vehicleIconSize)
    : createVehicleIcon(0, vehicleIconHtml, vehicleIconSize);

  // Now check validation after all hooks are called
  if (!validation.valid) {
    console.error('Invalid route points:', validation.errors);
    return (
      <div className="trip-replay-error">
        <p>Cannot replay trip: Invalid route data</p>
      </div>
    );
  }

  return (
    <div className={`trip-replay-visualizer ${className}`}>
      {/* Full route (dimmed) */}
      {showRoute && segments.map((segment, index) => (
        <Polyline
          key={`route-segment-${trip.id}-${index}`}
          positions={segment.coordinates}
          pathOptions={{
            color: segment.color,
            weight: opts.weight,
            opacity: opts.opacity * 0.4, // Dimmed
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
      ))}

      {/* Traveled path (highlighted) */}
      {showTraveledPath && traveledCoordinates.length > 1 && (
        <Polyline
          positions={traveledCoordinates}
          pathOptions={{
            color: '#2196F3',
            weight: opts.weight + 2,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
      )}

      {/* Animated vehicle marker */}
      {currentPosition && (
        <Marker
          position={[currentPosition.latitude, currentPosition.longitude]}
          icon={vehicleIcon}
          zIndexOffset={1000}
        />
      )}

      {/* Playback controls */}
      {showControls && animatorRef.current && (
        <div className="trip-replay-controls-container">
          <TripReplayController
            animator={animatorRef.current}
            showTime={true}
            showSpeedControls={true}
            showProgressBar={true}
          />
        </div>
      )}

      {/* Trip Summary Analytics (Phase 6) */}
      {showSummary && (
        <div className="trip-summary-container">
          <TripSummaryCard
            trip={trip}
            fuelConfig={fuelConfig}
            stopConfig={stopConfig}
            showDetailedMetrics={showDetailedMetrics}
            showFuelCost={true}
            showEmissions={false}
            allowConfigEdit={allowConfigEdit}
            onConfigChange={onFuelConfigChange}
          />
        </div>
      )}

      {/* Real-time Overlay (Phase 7) */}
      {showOverlay && currentPosition && (
        <TripReplayOverlay
          trip={trip}
          position={currentPosition}
          showTitle={true}
          showSpeed={true}
          showTimestamp={true}
          showProgress={true}
          showDistance={true}
          position_style={overlayPosition}
        />
      )}

      {/* Simplification Metrics (Development Only) */}
      {process.env.NODE_ENV === 'development' && simplificationMetrics && (
        <div className="trip-simplification-metrics">
          <small>
            Simplified: {simplificationMetrics.originalCount} → {simplificationMetrics.simplifiedCount} pts
            ({simplificationMetrics.reductionPercent.toFixed(1)}% reduction)
          </small>
        </div>
      )}
    </div>
  );
};

export default TripReplayVisualizer;
