/**
 * Trip Analytics Utility
 * 
 * Provides comprehensive analytics calculations for trip data.
 * Features:
 * - Distance calculation (Haversine formula)
 * - Duration analysis
 * - Average speed computation
 * - Fuel cost estimation
 * - Stop detection
 * - Route statistics
 * 
 * @module tripAnalytics
 * @version 6.0.0
 * @since Phase 6
 */

import { GPSPoint, Trip } from './indexedDB';

/**
 * Trip analytics metrics
 */
export interface TripAnalytics {
  /** Total distance in kilometers */
  totalDistance: number;
  /** Trip duration in milliseconds */
  duration: number;
  /** Average speed in km/h */
  averageSpeed: number;
  /** Maximum speed in km/h */
  maxSpeed: number;
  /** Estimated fuel cost based on configuration */
  estimatedFuelCost: number;
  /** Number of GPS points */
  pointCount: number;
  /** Number of detected stops */
  stopCount: number;
  /** Moving time (excluding stops) in milliseconds */
  movingTime: number;
  /** Average moving speed in km/h */
  averageMovingSpeed: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Formatted duration string (HH:MM:SS) */
  formattedDuration: string;
  /** Formatted moving time string (HH:MM:SS) */
  formattedMovingTime: string;
}

/**
 * Fuel cost configuration
 */
export interface FuelCostConfig {
  /** Fuel price per liter */
  pricePerLiter: number;
  /** Vehicle fuel efficiency in km/L */
  fuelEfficiency: number;
  /** Currency symbol */
  currency: string;
}

/**
 * Default fuel cost configuration (Philippines context)
 */
export const DEFAULT_FUEL_CONFIG: FuelCostConfig = {
  pricePerLiter: 65.0, // PHP per liter (average in Philippines)
  fuelEfficiency: 12.0, // km per liter (average sedan)
  currency: '₱'
};

/**
 * Stop detection configuration
 */
export interface StopDetectionConfig {
  /** Minimum speed threshold in km/h to consider as stopped */
  speedThreshold: number;
  /** Minimum duration in seconds to count as a stop */
  minDuration: number;
}

/**
 * Default stop detection configuration
 */
export const DEFAULT_STOP_CONFIG: StopDetectionConfig = {
  speedThreshold: 5, // km/h
  minDuration: 30 // seconds
};

/**
 * Calculate distance between two GPS points using Haversine formula
 * 
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  
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

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate total distance for a trip
 * 
 * @param coordinates - Array of GPS points
 * @returns Total distance in kilometers
 */
export function calculateTotalDistance(coordinates: GPSPoint[]): number {
  if (coordinates.length < 2) return 0;
  
  let totalDistance = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    
    const segmentDistance = haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    
    totalDistance += segmentDistance;
  }
  
  return totalDistance;
}

/**
 * Calculate trip duration
 * 
 * @param coordinates - Array of GPS points
 * @returns Duration in milliseconds
 */
export function calculateDuration(coordinates: GPSPoint[]): number {
  if (coordinates.length < 2) return 0;
  
  const startTime = coordinates[0].timestamp;
  const endTime = coordinates[coordinates.length - 1].timestamp;
  
  return endTime - startTime;
}

/**
 * Calculate average speed
 * 
 * @param distance - Total distance in kilometers
 * @param duration - Duration in milliseconds
 * @returns Average speed in km/h
 */
export function calculateAverageSpeed(distance: number, duration: number): number {
  if (duration === 0) return 0;
  
  const hours = duration / (1000 * 60 * 60);
  return distance / hours;
}

/**
 * Calculate maximum speed from GPS points
 * 
 * @param coordinates - Array of GPS points
 * @returns Maximum speed in km/h
 */
export function calculateMaxSpeed(coordinates: GPSPoint[]): number {
  if (coordinates.length < 2) return 0;
  
  let maxSpeed = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    
    const distance = haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    
    const timeDiff = (curr.timestamp - prev.timestamp) / (1000 * 60 * 60); // hours
    
    if (timeDiff > 0) {
      const speed = distance / timeDiff;
      maxSpeed = Math.max(maxSpeed, speed);
    }
  }
  
  return maxSpeed;
}

/**
 * Estimate fuel cost for a trip
 * 
 * @param distance - Total distance in kilometers
 * @param config - Fuel cost configuration
 * @returns Estimated fuel cost
 */
export function estimateFuelCost(
  distance: number,
  config: FuelCostConfig = DEFAULT_FUEL_CONFIG
): number {
  const litersUsed = distance / config.fuelEfficiency;
  return litersUsed * config.pricePerLiter;
}

/**
 * Detect stops in a trip
 * 
 * @param coordinates - Array of GPS points
 * @param config - Stop detection configuration
 * @returns Array of stop segments
 */
export function detectStops(
  coordinates: GPSPoint[],
  config: StopDetectionConfig = DEFAULT_STOP_CONFIG
): Array<{ startIndex: number; endIndex: number; duration: number }> {
  if (coordinates.length < 2) return [];
  
  const stops: Array<{ startIndex: number; endIndex: number; duration: number }> = [];
  let stopStartIndex: number | null = null;
  
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    
    const distance = haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
    const speed = timeDiff > 0 ? (distance / timeDiff) * 3600 : 0; // km/h
    
    if (speed < config.speedThreshold) {
      if (stopStartIndex === null) {
        stopStartIndex = i - 1;
      }
    } else {
      if (stopStartIndex !== null) {
        const stopDuration = (coordinates[i - 1].timestamp - coordinates[stopStartIndex].timestamp) / 1000;
        
        if (stopDuration >= config.minDuration) {
          stops.push({
            startIndex: stopStartIndex,
            endIndex: i - 1,
            duration: stopDuration * 1000 // milliseconds
          });
        }
        
        stopStartIndex = null;
      }
    }
  }
  
  // Handle stop at the end
  if (stopStartIndex !== null) {
    const stopDuration = (coordinates[coordinates.length - 1].timestamp - coordinates[stopStartIndex].timestamp) / 1000;
    
    if (stopDuration >= config.minDuration) {
      stops.push({
        startIndex: stopStartIndex,
        endIndex: coordinates.length - 1,
        duration: stopDuration * 1000
      });
    }
  }
  
  return stops;
}

/**
 * Calculate moving time (excluding stops)
 * 
 * @param duration - Total duration in milliseconds
 * @param stops - Array of detected stops
 * @returns Moving time in milliseconds
 */
export function calculateMovingTime(
  duration: number,
  stops: Array<{ duration: number }>
): number {
  const totalStopTime = stops.reduce((sum, stop) => sum + stop.duration, 0);
  return Math.max(0, duration - totalStopTime);
}

/**
 * Format duration as HH:MM:SS or MM:SS
 * 
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted string
 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Calculate comprehensive analytics for a trip
 * 
 * @param trip - Trip object or coordinates array
 * @param fuelConfig - Fuel cost configuration
 * @param stopConfig - Stop detection configuration
 * @returns Complete trip analytics
 */
export function calculateTripAnalytics(
  trip: Trip | GPSPoint[],
  fuelConfig: FuelCostConfig = DEFAULT_FUEL_CONFIG,
  stopConfig: StopDetectionConfig = DEFAULT_STOP_CONFIG
): TripAnalytics {
  const coordinates = Array.isArray(trip) ? trip : trip.coordinates;
  
  if (coordinates.length < 2) {
    return {
      totalDistance: 0,
      duration: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      estimatedFuelCost: 0,
      pointCount: coordinates.length,
      stopCount: 0,
      movingTime: 0,
      averageMovingSpeed: 0,
      startTime: coordinates[0]?.timestamp || 0,
      endTime: coordinates[0]?.timestamp || 0,
      formattedDuration: '0:00',
      formattedMovingTime: '0:00'
    };
  }
  
  // Calculate basic metrics
  const totalDistance = calculateTotalDistance(coordinates);
  const duration = calculateDuration(coordinates);
  const averageSpeed = calculateAverageSpeed(totalDistance, duration);
  const maxSpeed = calculateMaxSpeed(coordinates);
  const estimatedFuelCost = estimateFuelCost(totalDistance, fuelConfig);
  
  // Detect stops
  const stops = detectStops(coordinates, stopConfig);
  const movingTime = calculateMovingTime(duration, stops);
  const averageMovingSpeed = calculateAverageSpeed(totalDistance, movingTime);
  
  // Get timestamps
  const startTime = coordinates[0].timestamp;
  const endTime = coordinates[coordinates.length - 1].timestamp;
  
  return {
    totalDistance,
    duration,
    averageSpeed,
    maxSpeed,
    estimatedFuelCost,
    pointCount: coordinates.length,
    stopCount: stops.length,
    movingTime,
    averageMovingSpeed,
    startTime,
    endTime,
    formattedDuration: formatDuration(duration),
    formattedMovingTime: formatDuration(movingTime)
  };
}

/**
 * Format distance with appropriate unit
 * 
 * @param kilometers - Distance in kilometers
 * @returns Formatted string with unit
 */
export function formatDistance(kilometers: number): string {
  if (kilometers < 1) {
    return `${Math.round(kilometers * 1000)} m`;
  } else if (kilometers < 10) {
    return `${kilometers.toFixed(2)} km`;
  } else {
    return `${kilometers.toFixed(1)} km`;
  }
}

/**
 * Format speed with unit
 * 
 * @param kmh - Speed in km/h
 * @returns Formatted string with unit
 */
export function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Format currency amount
 * 
 * @param amount - Amount
 * @param currency - Currency symbol
 * @returns Formatted string
 */
export function formatCurrency(amount: number, currency: string = '₱'): string {
  return `${currency}${amount.toFixed(2)}`;
}

/**
 * Calculate fuel efficiency for a trip
 * 
 * @param distance - Distance in kilometers
 * @param fuelUsed - Fuel used in liters
 * @returns Fuel efficiency in km/L
 */
export function calculateFuelEfficiency(distance: number, fuelUsed: number): number {
  if (fuelUsed === 0) return 0;
  return distance / fuelUsed;
}

/**
 * Estimate CO2 emissions
 * 
 * @param distance - Distance in kilometers
 * @param emissionFactor - CO2 emission factor in kg/km (default: 0.12 for average car)
 * @returns CO2 emissions in kg
 */
export function estimateCO2Emissions(distance: number, emissionFactor: number = 0.12): number {
  return distance * emissionFactor;
}

/**
 * Calculate trip statistics summary
 * 
 * @param trips - Array of trips
 * @returns Aggregate statistics
 */
export function calculateTripStatistics(trips: Trip[]): {
  totalTrips: number;
  totalDistance: number;
  totalDuration: number;
  totalFuelCost: number;
  averageTripDistance: number;
  averageTripDuration: number;
  longestTrip: number;
  shortestTrip: number;
} {
  if (trips.length === 0) {
    return {
      totalTrips: 0,
      totalDistance: 0,
      totalDuration: 0,
      totalFuelCost: 0,
      averageTripDistance: 0,
      averageTripDuration: 0,
      longestTrip: 0,
      shortestTrip: 0
    };
  }
  
  let totalDistance = 0;
  let totalDuration = 0;
  let totalFuelCost = 0;
  let longestTrip = 0;
  let shortestTrip = Infinity;
  
  trips.forEach(trip => {
    const analytics = calculateTripAnalytics(trip);
    totalDistance += analytics.totalDistance;
    totalDuration += analytics.duration;
    totalFuelCost += analytics.estimatedFuelCost;
    longestTrip = Math.max(longestTrip, analytics.totalDistance);
    shortestTrip = Math.min(shortestTrip, analytics.totalDistance);
  });
  
  return {
    totalTrips: trips.length,
    totalDistance,
    totalDuration,
    totalFuelCost,
    averageTripDistance: totalDistance / trips.length,
    averageTripDuration: totalDuration / trips.length,
    longestTrip,
    shortestTrip: shortestTrip === Infinity ? 0 : shortestTrip
  };
}
