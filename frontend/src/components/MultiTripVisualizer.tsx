/**
 * Multi-Trip Route Visualizer Component
 * 
 * Renders multiple trip routes on a single map with different colors.
 * Useful for comparing trips or displaying a trip history.
 * 
 * @module MultiTripVisualizer
 * @version 3.0.0
 * @since Phase 3
 */

import React from 'react';
import { Trip } from '../utils/indexedDB';
import TripRouteVisualizer from './TripRouteVisualizer';
import { RouteVisualizationOptions, COLOR_GRADIENTS } from '../utils/routeVisualizer';

/**
 * Props for MultiTripVisualizer component
 */
export interface MultiTripVisualizerProps {
  /** Array of trips to visualize */
  trips: Trip[];
  /** Base visualization options (applied to all trips) */
  baseOptions?: RouteVisualizationOptions;
  /** Whether to use different colors for each trip */
  useDistinctColors?: boolean;
  /** Callback when a route is clicked */
  onRouteClick?: (trip: Trip) => void;
  /** Whether to show popups on markers */
  showPopups?: boolean;
  /** Whether to fit bounds to show all trips */
  fitAllTrips?: boolean;
}

/**
 * Predefined color gradients for multiple trips
 */
const TRIP_COLOR_SCHEMES = [
  COLOR_GRADIENTS.DEFAULT,        // Green to Red
  COLOR_GRADIENTS.BLUE_ORANGE,    // Blue to Orange
  COLOR_GRADIENTS.PURPLE_YELLOW,  // Purple to Yellow
  COLOR_GRADIENTS.CYAN_MAGENTA,   // Cyan to Magenta
  COLOR_GRADIENTS.BLUE_GRADIENT,  // Dark Blue to Light Blue
];

/**
 * MultiTripVisualizer Component
 * 
 * Renders multiple trip routes on a map with automatic color differentiation.
 * 
 * @example
 * ```tsx
 * <MapContainer>
 *   <TileLayer />
 *   <MultiTripVisualizer 
 *     trips={[trip1, trip2, trip3]}
 *     useDistinctColors={true}
 *     fitAllTrips={true}
 *   />
 * </MapContainer>
 * ```
 */
const MultiTripVisualizer: React.FC<MultiTripVisualizerProps> = ({
  trips,
  baseOptions = {},
  useDistinctColors = true,
  onRouteClick,
  showPopups = true,
  fitAllTrips = false
}) => {
  if (!trips || trips.length === 0) {
    return null;
  }

  return (
    <>
      {trips.map((trip, index) => {
        // Determine gradient for this trip
        const gradient = useDistinctColors
          ? TRIP_COLOR_SCHEMES[index % TRIP_COLOR_SCHEMES.length]
          : baseOptions.gradient;

        // For multiple trips, only fit bounds on the first one if fitAllTrips is false
        const shouldFitBounds = fitAllTrips ? index === 0 : baseOptions.fitBounds;

        return (
          <TripRouteVisualizer
            key={trip.id}
            trip={trip}
            options={{
              ...baseOptions,
              gradient,
              fitBounds: shouldFitBounds
            }}
            onRouteClick={onRouteClick}
            showPopup={showPopups}
          />
        );
      })}
    </>
  );
};

export default MultiTripVisualizer;
