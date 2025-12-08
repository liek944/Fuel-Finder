/**
 * Offline Routing Engine for Fuel Finder
 * 
 * Provides client-side routing capabilities when offline.
 * Uses a tiered approach:
 * 1. Cached routes (stored OSRM responses)
 * 2. Client-side road network routing (if routing data downloaded)
 * 3. Simplified straight-line fallback
 */

import type { RouteData } from '../api/routingApi';
import { offlineStorage } from './offlineStorage';
import { generateSimplifiedRoute, isSimplifiedRoute } from './simplifiedRouting';

// Storage key for routing graph data
const ROUTING_DATA_KEY = 'routing_graph_oriental_mindoro';

/**
 * Routing data stored in IndexedDB
 */
export interface RoutingGraphData {
  region: string;
  downloadedAt: number;
  sizeBytes: number;
  waypoints: RoutingWaypoint[];
  segments: RoutingSegment[];
}

/**
 * A waypoint in the routing graph (road intersection or point of interest)
 */
export interface RoutingWaypoint {
  id: string;
  lat: number;
  lng: number;
  type: 'intersection' | 'poi' | 'station';
  connectedSegments: string[];
}

/**
 * A road segment connecting two waypoints
 */
export interface RoutingSegment {
  id: string;
  fromWaypointId: string;
  toWaypointId: string;
  distance: number; // meters
  duration: number; // seconds
  coordinates: [number, number][]; // [lng, lat] pairs
  roadType: 'primary' | 'secondary' | 'tertiary' | 'residential' | 'unclassified';
}

/**
 * Result from offline routing
 */
export interface OfflineRouteResult extends RouteData {
  isOffline: true;
  routingMethod: 'cached' | 'graph' | 'simplified';
  routingGraphVersion?: number;
}

/**
 * Offline Router class
 * Manages client-side routing when network is unavailable
 */
class OfflineRouter {
  private routingGraph: RoutingGraphData | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the router by loading any cached routing data
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if routing graph is available in storage
      const graphData = await offlineStorage.getMetadata<RoutingGraphData>(ROUTING_DATA_KEY);
      
      if (graphData) {
        this.routingGraph = graphData;
        this.isInitialized = true;
        console.log('[OfflineRouter] Initialized with cached routing graph');
        return true;
      }
      
      console.log('[OfflineRouter] No cached routing graph found');
      this.isInitialized = true;
      return false;
    } catch (error) {
      console.error('[OfflineRouter] Failed to initialize:', error);
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Check if routing graph data is available
   */
  isGraphAvailable(): boolean {
    return this.routingGraph !== null;
  }

  /**
   * Get routing graph metadata
   */
  getGraphMetadata(): { downloadedAt: number; sizeBytes: number; region: string } | null {
    if (!this.routingGraph) return null;
    
    return {
      downloadedAt: this.routingGraph.downloadedAt,
      sizeBytes: this.routingGraph.sizeBytes,
      region: this.routingGraph.region,
    };
  }

  /**
   * Calculate a route offline
   * Uses tiered approach: cached -> graph -> simplified
   */
  async route(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<OfflineRouteResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Try cached route first
    const cachedRoute = await offlineStorage.getOfflineRoute(startLat, startLng, endLat, endLng);
    if (cachedRoute) {
      console.log('[OfflineRouter] Using cached route');
      return {
        ...cachedRoute,
        isOffline: true,
        routingMethod: 'cached',
      };
    }

    // Try graph-based routing if available
    if (this.routingGraph) {
      try {
        const graphRoute = await this.calculateGraphRoute(startLat, startLng, endLat, endLng);
        if (graphRoute) {
          console.log('[OfflineRouter] Using graph-based route');
          return graphRoute;
        }
      } catch (error) {
        console.warn('[OfflineRouter] Graph routing failed, falling back to simplified:', error);
      }
    }

    // Fall back to simplified routing
    console.log('[OfflineRouter] Using simplified route');
    const simplified = generateSimplifiedRoute(startLat, startLng, endLat, endLng);
    return {
      ...simplified,
      isOffline: true,
      routingMethod: 'simplified',
    };
  }

  /**
   * Calculate route using the downloaded routing graph
   * Uses A* algorithm for pathfinding
   */
  private async calculateGraphRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<OfflineRouteResult | null> {
    if (!this.routingGraph) return null;

    // Find nearest waypoints to start and end
    const startWaypoint = this.findNearestWaypoint(startLat, startLng);
    const endWaypoint = this.findNearestWaypoint(endLat, endLng);

    if (!startWaypoint || !endWaypoint) {
      console.log('[OfflineRouter] Could not find waypoints near start/end');
      return null;
    }

    // Use A* algorithm to find shortest path
    const path = this.aStarSearch(startWaypoint, endWaypoint);
    if (!path || path.length === 0) {
      console.log('[OfflineRouter] No path found between waypoints');
      return null;
    }

    // Build route from path
    const route = this.buildRouteFromPath(path, startLat, startLng, endLat, endLng);
    return route;
  }

  /**
   * Find the nearest waypoint to a given coordinate
   */
  private findNearestWaypoint(lat: number, lng: number): RoutingWaypoint | null {
    if (!this.routingGraph) return null;

    let nearest: RoutingWaypoint | null = null;
    let minDistance = Infinity;

    for (const waypoint of this.routingGraph.waypoints) {
      const distance = this.haversineDistance(lat, lng, waypoint.lat, waypoint.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = waypoint;
      }
    }

    // Only return if within 1km
    return minDistance < 1000 ? nearest : null;
  }

  /**
   * A* search algorithm for pathfinding
   */
  private aStarSearch(start: RoutingWaypoint, end: RoutingWaypoint): RoutingWaypoint[] {
    if (!this.routingGraph) return [];

    const openSet = new Set<string>([start.id]);
    const cameFrom = new Map<string, RoutingWaypoint>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const waypointMap = new Map<string, RoutingWaypoint>();

    // Build waypoint lookup map
    for (const wp of this.routingGraph.waypoints) {
      waypointMap.set(wp.id, wp);
      gScore.set(wp.id, Infinity);
      fScore.set(wp.id, Infinity);
    }

    gScore.set(start.id, 0);
    fScore.set(start.id, this.haversineDistance(start.lat, start.lng, end.lat, end.lng));

    // Build segment lookup
    const segmentMap = new Map<string, RoutingSegment>();
    for (const seg of this.routingGraph.segments) {
      segmentMap.set(seg.id, seg);
    }

    while (openSet.size > 0) {
      // Get node with lowest fScore
      let current: string | null = null;
      let lowestF = Infinity;
      for (const nodeId of openSet) {
        const f = fScore.get(nodeId) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = nodeId;
        }
      }

      if (!current) break;

      const currentWaypoint = waypointMap.get(current);
      if (!currentWaypoint) break;

      // Check if we reached the end
      if (current === end.id) {
        // Reconstruct path
        const path: RoutingWaypoint[] = [currentWaypoint];
        let curr = current;
        while (cameFrom.has(curr)) {
          const prev = cameFrom.get(curr)!;
          path.unshift(prev);
          curr = prev.id;
        }
        return path;
      }

      openSet.delete(current);

      // Explore neighbors
      for (const segmentId of currentWaypoint.connectedSegments) {
        const segment = segmentMap.get(segmentId);
        if (!segment) continue;

        const neighborId = segment.fromWaypointId === current 
          ? segment.toWaypointId 
          : segment.fromWaypointId;
        const neighbor = waypointMap.get(neighborId);
        if (!neighbor) continue;

        const tentativeG = (gScore.get(current) ?? Infinity) + segment.distance;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentWaypoint);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + this.haversineDistance(neighbor.lat, neighbor.lng, end.lat, end.lng));
          openSet.add(neighborId);
        }
      }
    }

    return [];
  }

  /**
   * Build a RouteData object from a path of waypoints
   */
  private buildRouteFromPath(
    path: RoutingWaypoint[],
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): OfflineRouteResult {
    if (!this.routingGraph) {
      return {
        ...generateSimplifiedRoute(startLat, startLng, endLat, endLng),
        isOffline: true,
        routingMethod: 'simplified',
      };
    }

    const coordinates: [number, number][] = [[startLng, startLat]];
    let totalDistance = 0;
    let totalDuration = 0;

    // Build segment lookup
    const segmentMap = new Map<string, RoutingSegment>();
    for (const seg of this.routingGraph.segments) {
      segmentMap.set(seg.id, seg);
    }

    // Add coordinates from path segments
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      // Find connecting segment
      let connectingSegment: RoutingSegment | null = null;
      for (const segId of from.connectedSegments) {
        const seg = segmentMap.get(segId);
        if (seg && (
          (seg.fromWaypointId === from.id && seg.toWaypointId === to.id) ||
          (seg.fromWaypointId === to.id && seg.toWaypointId === from.id)
        )) {
          connectingSegment = seg;
          break;
        }
      }

      if (connectingSegment) {
        // Add segment coordinates (may need to reverse if direction is opposite)
        const segCoords = connectingSegment.fromWaypointId === from.id
          ? connectingSegment.coordinates
          : [...connectingSegment.coordinates].reverse();
        
        coordinates.push(...segCoords);
        totalDistance += connectingSegment.distance;
        totalDuration += connectingSegment.duration;
      } else {
        // Direct connection if no segment found
        coordinates.push([to.lng, to.lat]);
        totalDistance += this.haversineDistance(from.lat, from.lng, to.lat, to.lng);
        totalDuration += this.haversineDistance(from.lat, from.lng, to.lat, to.lng) / 11.11; // 40 km/h avg
      }
    }

    // Add end point
    coordinates.push([endLng, endLat]);

    return {
      coordinates,
      distance: Math.round(totalDistance),
      duration: Math.round(totalDuration),
      isOffline: true,
      routingMethod: 'graph',
    };
  }

  /**
   * Download routing graph data for a region
   * This would typically fetch from a pre-built routing graph file
   */
  async downloadRoutingData(
    onProgress?: (progress: { current: number; total: number }) => void
  ): Promise<boolean> {
    try {
      // For now, we'll create a placeholder routing graph
      // In a real implementation, this would fetch pre-compiled routing data
      console.log('[OfflineRouter] Downloading routing data for Oriental Mindoro...');
      
      // Simulate progress
      if (onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          onProgress({ current: i, total: 100 });
        }
      }

      // Create a minimal routing graph (placeholder)
      // In production, this would be fetched from a server
      const routingGraph: RoutingGraphData = {
        region: 'Oriental Mindoro',
        downloadedAt: Date.now(),
        sizeBytes: 1024 * 1024, // ~1MB placeholder
        waypoints: [],
        segments: [],
      };

      // Store the routing graph
      await offlineStorage.setMetadata(ROUTING_DATA_KEY, routingGraph);
      this.routingGraph = routingGraph;

      console.log('[OfflineRouter] Routing data downloaded successfully');
      return true;
    } catch (error) {
      console.error('[OfflineRouter] Failed to download routing data:', error);
      return false;
    }
  }

  /**
   * Clear downloaded routing data
   */
  async clearRoutingData(): Promise<void> {
    await offlineStorage.setMetadata(ROUTING_DATA_KEY, null);
    this.routingGraph = null;
    console.log('[OfflineRouter] Routing data cleared');
  }

  /**
   * Calculate Haversine distance between two points in meters
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}

// Export singleton instance
export const offlineRouter = new OfflineRouter();

// Re-export types
export { isSimplifiedRoute, generateSimplifiedRoute };

/**
 * Check if a route was calculated offline
 */
export function isOfflineRoute(route: RouteData): route is OfflineRouteResult {
  return 'isOffline' in route && (route as OfflineRouteResult).isOffline === true;
}

/**
 * Get a warning message for offline routes
 */
export function getOfflineRouteWarning(route: RouteData): string | null {
  if (!isOfflineRoute(route)) return null;

  switch (route.routingMethod) {
    case 'cached':
      return 'Using cached route. Road conditions may have changed.';
    case 'graph':
      return 'Offline route calculated. Connect to internet for real-time updates.';
    case 'simplified':
      return 'Simplified route - for reference only. Actual route may differ significantly.';
    default:
      return null;
  }
}
