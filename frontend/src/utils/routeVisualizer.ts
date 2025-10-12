/**
 * Route Visualizer Utilities
 * 
 * Provides utility functions for visualizing trip routes on Leaflet maps.
 * Includes color gradient generation, map bounds calculation, and route processing.
 * 
 * @module routeVisualizer
 * @version 3.0.0
 * @since Phase 3
 */

import L from 'leaflet';
import { GPSPoint } from './indexedDB';

/**
 * Color gradient configuration for route visualization
 */
export interface ColorGradient {
  start: string;
  end: string;
  steps?: number;
}

/**
 * Route visualization options
 */
export interface RouteVisualizationOptions {
  gradient?: ColorGradient;
  weight?: number;
  opacity?: number;
  smoothFactor?: number;
  showStartMarker?: boolean;
  showEndMarker?: boolean;
  fitBounds?: boolean;
  fitBoundsPadding?: [number, number];
}

/**
 * Default visualization options
 */
export const DEFAULT_ROUTE_OPTIONS: Required<RouteVisualizationOptions> = {
  gradient: {
    start: '#00ff00', // Green (start)
    end: '#ff0000',   // Red (end)
    steps: 100
  },
  weight: 4,
  opacity: 0.8,
  smoothFactor: 1.5,
  showStartMarker: true,
  showEndMarker: true,
  fitBounds: true,
  fitBoundsPadding: [50, 50]
};

/**
 * Converts GPS points to Leaflet LatLng coordinates
 * 
 * @param points - Array of GPS points
 * @returns Array of [lat, lng] tuples
 */
export function gpsPointsToLatLngs(points: GPSPoint[]): [number, number][] {
  return points.map(point => [point.latitude, point.longitude] as [number, number]);
}

/**
 * Calculates the bounding box for a set of GPS points
 * 
 * @param points - Array of GPS points
 * @returns Leaflet LatLngBounds object
 */
export function calculateBounds(points: GPSPoint[]): L.LatLngBounds | null {
  if (points.length === 0) return null;

  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return L.latLngBounds(
    L.latLng(minLat, minLng),
    L.latLng(maxLat, maxLng)
  );
}

/**
 * Interpolates between two colors
 * 
 * @param color1 - Start color (hex format)
 * @param color2 - End color (hex format)
 * @param factor - Interpolation factor (0-1)
 * @returns Interpolated color in hex format
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  // Remove # if present
  const c1 = color1.replace('#', '');
  const c2 = color2.replace('#', '');

  // Parse RGB values
  const r1 = parseInt(c1.substring(0, 2), 16);
  const g1 = parseInt(c1.substring(2, 4), 16);
  const b1 = parseInt(c1.substring(4, 6), 16);

  const r2 = parseInt(c2.substring(0, 2), 16);
  const g2 = parseInt(c2.substring(2, 4), 16);
  const b2 = parseInt(c2.substring(4, 6), 16);

  // Interpolate
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  // Convert back to hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates a color gradient array
 * 
 * @param gradient - Color gradient configuration
 * @returns Array of color strings
 */
export function generateColorGradient(gradient: ColorGradient): string[] {
  const steps = gradient.steps || 100;
  const colors: string[] = [];

  for (let i = 0; i < steps; i++) {
    const factor = i / (steps - 1);
    colors.push(interpolateColor(gradient.start, gradient.end, factor));
  }

  return colors;
}

/**
 * Splits GPS points into segments for gradient coloring
 * 
 * @param points - Array of GPS points
 * @param segments - Number of segments to create
 * @returns Array of point segments
 */
export function splitIntoSegments(
  points: GPSPoint[],
  segments: number
): GPSPoint[][] {
  if (points.length < 2) return [points];

  const segmentArrays: GPSPoint[][] = [];
  const pointsPerSegment = Math.max(2, Math.floor(points.length / segments));

  for (let i = 0; i < segments; i++) {
    const start = i * pointsPerSegment;
    const end = i === segments - 1 ? points.length : start + pointsPerSegment + 1;
    
    if (start < points.length) {
      segmentArrays.push(points.slice(start, end));
    }
  }

  return segmentArrays;
}

/**
 * Creates route segments with corresponding colors for gradient visualization
 * 
 * @param points - Array of GPS points
 * @param gradient - Color gradient configuration
 * @returns Array of {coordinates, color} objects
 */
export function createGradientSegments(
  points: GPSPoint[],
  gradient: ColorGradient = DEFAULT_ROUTE_OPTIONS.gradient
): Array<{ coordinates: [number, number][]; color: string }> {
  if (points.length < 2) return [];

  const colors = generateColorGradient(gradient);
  const segments = splitIntoSegments(points, colors.length);

  return segments.map((segmentPoints, index) => ({
    coordinates: gpsPointsToLatLngs(segmentPoints),
    color: colors[index]
  }));
}

/**
 * Creates a custom Leaflet icon for start/end markers
 * 
 * @param type - Marker type ('start' or 'end')
 * @param size - Icon size in pixels
 * @returns Leaflet DivIcon
 */
export function createRouteMarkerIcon(
  type: 'start' | 'end',
  size: number = 40
): L.DivIcon {
  const isStart = type === 'start';
  const color = isStart ? '#00ff00' : '#ff0000';
  const label = isStart ? 'S' : 'E';
  const title = isStart ? 'Start' : 'End';

  const html = `
    <div class="route-marker route-marker-${type}" 
         style="
           width: ${size}px;
           height: ${size}px;
           background-color: ${color};
           border: 3px solid white;
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           font-weight: bold;
           font-size: ${size * 0.5}px;
           color: white;
           box-shadow: 0 2px 8px rgba(0,0,0,0.3);
           text-shadow: 0 1px 2px rgba(0,0,0,0.5);
         "
         title="${title}">
      ${label}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'route-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

/**
 * Simplifies route coordinates using Douglas-Peucker algorithm
 * Reduces number of points while maintaining route shape
 * 
 * @param points - Array of GPS points
 * @param tolerance - Simplification tolerance (higher = more simplification)
 * @returns Simplified array of GPS points
 */
export function simplifyRoute(points: GPSPoint[], tolerance: number = 0.0001): GPSPoint[] {
  if (points.length <= 2) return points;

  // Convert to Leaflet LatLngs for simplification
  const latLngs = points.map(p => L.latLng(p.latitude, p.longitude));
  
  // Use Leaflet's built-in simplification
  const simplified = L.LineUtil.simplify(
    latLngs.map(ll => ({ x: ll.lat, y: ll.lng })),
    tolerance
  );

  // Convert back to GPSPoints
  return simplified.map((point, index) => ({
    latitude: point.x,
    longitude: point.y,
    timestamp: points[Math.min(index, points.length - 1)].timestamp,
    accuracy: points[Math.min(index, points.length - 1)].accuracy
  }));
}

/**
 * Calculates statistics for a route
 * 
 * @param points - Array of GPS points
 * @returns Route statistics
 */
export function calculateRouteStats(points: GPSPoint[]): {
  totalPoints: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  bounds: L.LatLngBounds | null;
} {
  if (points.length === 0) {
    return {
      totalPoints: 0,
      duration: 0,
      startTime: new Date(),
      endTime: new Date(),
      bounds: null
    };
  }

  const startTime = new Date(points[0].timestamp);
  const endTime = new Date(points[points.length - 1].timestamp);
  const duration = endTime.getTime() - startTime.getTime();

  return {
    totalPoints: points.length,
    duration,
    startTime,
    endTime,
    bounds: calculateBounds(points)
  };
}

/**
 * Validates GPS points for route visualization
 * 
 * @param points - Array of GPS points
 * @returns Validation result with errors if any
 */
export function validateRoutePoints(points: GPSPoint[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!points || points.length === 0) {
    errors.push('No GPS points provided');
  }

  if (points.length < 2) {
    errors.push('At least 2 GPS points required for route visualization');
  }

  // Check for valid coordinates
  points.forEach((point, index) => {
    if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
      errors.push(`Invalid coordinates at point ${index}`);
    }

    if (point.latitude < -90 || point.latitude > 90) {
      errors.push(`Invalid latitude at point ${index}: ${point.latitude}`);
    }

    if (point.longitude < -180 || point.longitude > 180) {
      errors.push(`Invalid longitude at point ${index}: ${point.longitude}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Preset color gradients for common use cases
 */
export const COLOR_GRADIENTS = {
  /** Green to Red (default) */
  DEFAULT: {
    start: '#00ff00',
    end: '#ff0000',
    steps: 100
  },
  /** Blue to Orange */
  BLUE_ORANGE: {
    start: '#0066ff',
    end: '#ff6600',
    steps: 100
  },
  /** Purple to Yellow */
  PURPLE_YELLOW: {
    start: '#9900ff',
    end: '#ffff00',
    steps: 100
  },
  /** Cyan to Magenta */
  CYAN_MAGENTA: {
    start: '#00ffff',
    end: '#ff00ff',
    steps: 100
  },
  /** Dark Blue to Light Blue */
  BLUE_GRADIENT: {
    start: '#003366',
    end: '#66ccff',
    steps: 100
  },
  /** Single color (no gradient) */
  BLUE_SOLID: {
    start: '#0066ff',
    end: '#0066ff',
    steps: 1
  }
};
