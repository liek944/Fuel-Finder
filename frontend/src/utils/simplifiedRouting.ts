/**
 * Simplified Routing Utility
 * Fallback routing when offline and no cached route exists
 * 
 * Uses Turf.js for basic geometry calculations
 */

import type { RouteData } from '../api/routingApi';

// Average driving speed in km/h for duration estimation
const AVERAGE_DRIVING_SPEED_KMH = 40;

// Number of interpolation points for the simplified route
const INTERPOLATION_POINTS = 5;

/**
 * Calculate Haversine distance between two points in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Interpolate points between start and end for a smoother line
 */
function interpolatePoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  numPoints: number
): [number, number][] {
  const points: [number, number][] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = startLat + (endLat - startLat) * t;
    const lng = startLng + (endLng - startLng) * t;
    points.push([lng, lat]); // GeoJSON format: [lng, lat]
  }
  
  return points;
}

/**
 * Estimate road distance from straight-line distance
 * Real roads are typically 1.2-1.4x longer than straight-line
 */
function estimateRoadDistance(straightLineDistance: number): number {
  const roadFactor = 1.3; // Average road circuity factor
  return straightLineDistance * roadFactor;
}

/**
 * Estimate duration based on distance and average speed
 */
function estimateDuration(distanceMeters: number): number {
  const distanceKm = distanceMeters / 1000;
  const hours = distanceKm / AVERAGE_DRIVING_SPEED_KMH;
  return Math.round(hours * 3600); // Return seconds
}

/**
 * Generate a simplified route for offline use
 * 
 * This creates a straight-line route between two points with estimated
 * distance and duration. It's meant as a fallback when no cached route
 * exists and the device is offline.
 * 
 * @param startLat - Starting latitude
 * @param startLng - Starting longitude
 * @param endLat - Ending latitude
 * @param endLng - Ending longitude
 * @returns RouteData with simplified route and estimates
 */
export function generateSimplifiedRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): RouteData {
  // Calculate straight-line distance
  const straightLineDistance = haversineDistance(startLat, startLng, endLat, endLng);
  
  // Estimate road distance and duration
  const estimatedDistance = estimateRoadDistance(straightLineDistance);
  const estimatedDuration = estimateDuration(estimatedDistance);
  
  // Generate interpolated coordinates for the route line
  const coordinates = interpolatePoints(
    startLat,
    startLng,
    endLat,
    endLng,
    INTERPOLATION_POINTS
  );
  
  console.log(
    `[SimplifiedRouting] Generated offline route: ` +
    `${Math.round(estimatedDistance)}m, ~${Math.round(estimatedDuration / 60)}min`
  );
  
  return {
    coordinates,
    distance: Math.round(estimatedDistance),
    duration: estimatedDuration,
    isSimplified: true,
  };
}

/**
 * Check if a route is a simplified offline route
 */
export function isSimplifiedRoute(route: RouteData): boolean {
  return route.isSimplified === true;
}

/**
 * Get a warning message for simplified routes
 */
export function getSimplifiedRouteWarning(): string {
  return 'Offline route - actual route may differ. Connect to internet for accurate directions.';
}

export default generateSimplifiedRoute;
