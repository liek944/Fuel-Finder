/**
 * Geometry Optimizer Utility
 * 
 * Provides geometry simplification and optimization for trip replay performance.
 * Features:
 * - Route simplification using Turf.js
 * - Adaptive simplification based on trip length
 * - Point reduction while maintaining route accuracy
 * - Performance metrics tracking
 * 
 * @module geometryOptimizer
 * @version 7.0.0
 * @since Phase 7
 */

import * as turf from '@turf/turf';
import { GPSPoint } from './indexedDB';

/**
 * Simplification configuration
 */
export interface SimplificationConfig {
  /** Tolerance in kilometers (higher = more simplification) */
  tolerance: number;
  /** Whether to preserve topology */
  highQuality: boolean;
  /** Minimum number of points to keep */
  minPoints: number;
  /** Maximum number of points allowed */
  maxPoints: number;
}

/**
 * Default simplification configuration
 */
export const DEFAULT_SIMPLIFICATION_CONFIG: SimplificationConfig = {
  tolerance: 0.001, // ~1 meter
  highQuality: true,
  minPoints: 10,
  maxPoints: 1000
};

/**
 * Simplification result with metrics
 */
export interface SimplificationResult {
  /** Simplified GPS points */
  simplified: GPSPoint[];
  /** Original point count */
  originalCount: number;
  /** Simplified point count */
  simplifiedCount: number;
  /** Reduction percentage */
  reductionPercent: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Calculate adaptive tolerance based on trip characteristics
 */
export function calculateAdaptiveTolerance(
  coordinates: GPSPoint[],
  targetPoints?: number
): number {
  if (coordinates.length <= 100) {
    return 0.0005; // Very fine for short trips (~0.5m)
  } else if (coordinates.length <= 500) {
    return 0.001; // Fine for medium trips (~1m)
  } else if (coordinates.length <= 2000) {
    return 0.002; // Moderate for long trips (~2m)
  } else {
    return 0.005; // Aggressive for very long trips (~5m)
  }
}

/**
 * Simplify GPS coordinates using Turf.js simplify algorithm
 * 
 * Uses Douglas-Peucker algorithm for line simplification while
 * preserving route shape and important features.
 * 
 * @param coordinates - Original GPS points
 * @param config - Simplification configuration
 * @returns Simplification result with metrics
 * 
 * @example
 * ```typescript
 * const result = simplifyCoordinates(trip.coordinates, {
 *   tolerance: 0.002,
 *   highQuality: true,
 *   minPoints: 10,
 *   maxPoints: 500
 * });
 * console.log(`Reduced from ${result.originalCount} to ${result.simplifiedCount} points`);
 * ```
 */
export function simplifyCoordinates(
  coordinates: GPSPoint[],
  config: Partial<SimplificationConfig> = {}
): SimplificationResult {
  const startTime = performance.now();
  const cfg = { ...DEFAULT_SIMPLIFICATION_CONFIG, ...config };

  // Validate input
  if (coordinates.length < 2) {
    return {
      simplified: coordinates,
      originalCount: coordinates.length,
      simplifiedCount: coordinates.length,
      reductionPercent: 0,
      processingTime: performance.now() - startTime
    };
  }

  // If already below max points, return original
  if (coordinates.length <= cfg.maxPoints) {
    return {
      simplified: coordinates,
      originalCount: coordinates.length,
      simplifiedCount: coordinates.length,
      reductionPercent: 0,
      processingTime: performance.now() - startTime
    };
  }

  try {
    // Convert GPS points to GeoJSON LineString
    const lineCoordinates: [number, number][] = coordinates.map(point => [
      point.longitude,
      point.latitude
    ]);

    const line = turf.lineString(lineCoordinates);

    // Apply simplification
    const simplified = turf.simplify(line, {
      tolerance: cfg.tolerance,
      highQuality: cfg.highQuality
    });

    // Convert back to GPS points
    const simplifiedCoords = simplified.geometry.coordinates;
    const simplifiedPoints: GPSPoint[] = [];

    // Map simplified coordinates back to original GPS points
    for (const [lon, lat] of simplifiedCoords) {
      // Find closest original point to preserve metadata
      const closestPoint = findClosestPoint(coordinates, lat, lon);
      if (closestPoint) {
        simplifiedPoints.push(closestPoint);
      }
    }

    // Ensure we have minimum points
    if (simplifiedPoints.length < cfg.minPoints && coordinates.length >= cfg.minPoints) {
      // Use uniform sampling to reach minimum
      return uniformSample(coordinates, cfg.minPoints, startTime);
    }

    // Ensure we don't exceed maximum points
    if (simplifiedPoints.length > cfg.maxPoints) {
      return uniformSample(simplifiedPoints, cfg.maxPoints, startTime);
    }

    const processingTime = performance.now() - startTime;
    const reductionPercent = ((coordinates.length - simplifiedPoints.length) / coordinates.length) * 100;

    return {
      simplified: simplifiedPoints,
      originalCount: coordinates.length,
      simplifiedCount: simplifiedPoints.length,
      reductionPercent,
      processingTime
    };
  } catch (error) {
    console.error('Error simplifying coordinates:', error);
    // Fallback to uniform sampling
    return uniformSample(
      coordinates,
      Math.min(cfg.maxPoints, coordinates.length),
      startTime
    );
  }
}

/**
 * Find closest GPS point to given coordinates
 */
function findClosestPoint(
  points: GPSPoint[],
  targetLat: number,
  targetLon: number
): GPSPoint | null {
  if (points.length === 0) return null;

  let closest = points[0];
  let minDistance = Number.MAX_VALUE;

  for (const point of points) {
    const distance = Math.sqrt(
      Math.pow(point.latitude - targetLat, 2) +
      Math.pow(point.longitude - targetLon, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closest = point;
    }
  }

  return closest;
}

/**
 * Uniform sampling fallback for when simplification fails
 */
function uniformSample(
  coordinates: GPSPoint[],
  targetCount: number,
  startTime: number
): SimplificationResult {
  if (coordinates.length <= targetCount) {
    return {
      simplified: coordinates,
      originalCount: coordinates.length,
      simplifiedCount: coordinates.length,
      reductionPercent: 0,
      processingTime: performance.now() - startTime
    };
  }

  const step = coordinates.length / targetCount;
  const sampled: GPSPoint[] = [];

  // Always include first point
  sampled.push(coordinates[0]);

  // Sample intermediate points
  for (let i = 1; i < targetCount - 1; i++) {
    const index = Math.floor(i * step);
    sampled.push(coordinates[index]);
  }

  // Always include last point
  sampled.push(coordinates[coordinates.length - 1]);

  const processingTime = performance.now() - startTime;
  const reductionPercent = ((coordinates.length - sampled.length) / coordinates.length) * 100;

  return {
    simplified: sampled,
    originalCount: coordinates.length,
    simplifiedCount: sampled.length,
    reductionPercent,
    processingTime
  };
}

/**
 * Auto-simplify coordinates based on trip length
 * 
 * Automatically determines optimal tolerance and simplification settings
 * based on the number of GPS points in the trip.
 * 
 * @param coordinates - Original GPS points
 * @returns Simplification result
 * 
 * @example
 * ```typescript
 * const result = autoSimplifyCoordinates(trip.coordinates);
 * // Use result.simplified for rendering
 * ```
 */
export function autoSimplifyCoordinates(
  coordinates: GPSPoint[]
): SimplificationResult {
  const tolerance = calculateAdaptiveTolerance(coordinates);
  
  return simplifyCoordinates(coordinates, {
    tolerance,
    highQuality: true,
    minPoints: Math.min(10, coordinates.length),
    maxPoints: 1000
  });
}

/**
 * Calculate distance reduction metrics
 */
export function calculateDistancePreservation(
  original: GPSPoint[],
  simplified: GPSPoint[]
): {
  originalDistance: number;
  simplifiedDistance: number;
  preservationPercent: number;
} {
  const originalDistance = calculateTotalDistance(original);
  const simplifiedDistance = calculateTotalDistance(simplified);
  const preservationPercent = (simplifiedDistance / originalDistance) * 100;

  return {
    originalDistance,
    simplifiedDistance,
    preservationPercent
  };
}

/**
 * Calculate total distance using Haversine formula
 */
function calculateTotalDistance(coordinates: GPSPoint[]): number {
  let total = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    total += haversineDistance(
      start.latitude,
      start.longitude,
      end.latitude,
      end.longitude
    );
  }

  return total;
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
 * Batch simplify multiple trips
 */
export function batchSimplifyTrips(
  trips: { id: string; coordinates: GPSPoint[] }[],
  config?: Partial<SimplificationConfig>
): Map<string, SimplificationResult> {
  const results = new Map<string, SimplificationResult>();

  for (const trip of trips) {
    const result = simplifyCoordinates(trip.coordinates, config);
    results.set(trip.id, result);
  }

  return results;
}

/**
 * Get simplification recommendations based on trip characteristics
 */
export function getSimplificationRecommendation(
  coordinates: GPSPoint[]
): {
  shouldSimplify: boolean;
  recommendedTolerance: number;
  estimatedReduction: number;
  reason: string;
} {
  const count = coordinates.length;

  if (count <= 100) {
    return {
      shouldSimplify: false,
      recommendedTolerance: 0,
      estimatedReduction: 0,
      reason: 'Trip is short, no simplification needed'
    };
  }

  if (count <= 500) {
    return {
      shouldSimplify: true,
      recommendedTolerance: 0.001,
      estimatedReduction: 20,
      reason: 'Medium trip, light simplification recommended'
    };
  }

  if (count <= 2000) {
    return {
      shouldSimplify: true,
      recommendedTolerance: 0.002,
      estimatedReduction: 40,
      reason: 'Long trip, moderate simplification recommended'
    };
  }

  return {
    shouldSimplify: true,
    recommendedTolerance: 0.005,
    estimatedReduction: 60,
    reason: 'Very long trip, aggressive simplification recommended'
  };
}
