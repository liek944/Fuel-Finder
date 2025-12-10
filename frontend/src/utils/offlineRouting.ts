/**
 * Offline Routing for Fuel Finder
 * 
 * Provides offline routing capabilities:
 * 1. Cached routes (stored OSRM responses from previous navigations)
 * 2. Simplified straight-line fallback when no cache exists
 */

import type { RouteData } from '../api/routingApi';
import { offlineStorage } from './offlineStorage';
import { generateSimplifiedRoute, isSimplifiedRoute } from './simplifiedRouting';

/**
 * Result from offline routing
 */
export interface OfflineRouteResult extends RouteData {
  isOffline: true;
  routingMethod: 'cached' | 'simplified';
}

/**
 * Offline Router class
 * Manages client-side routing when network is unavailable
 */
class OfflineRouter {
  private isInitialized: boolean = false;

  /**
   * Initialize the router
   */
  async initialize(): Promise<boolean> {
    this.isInitialized = true;
    console.log('[OfflineRouter] Initialized');
    return true;
  }

  /**
   * Calculate a route offline
   * Uses tiered approach: cached -> simplified fallback
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

    // Try cached route first (exact match)
    const cachedRoute = await offlineStorage.getOfflineRoute(startLat, startLng, endLat, endLng);
    if (cachedRoute) {
      console.log('[OfflineRouter] Using cached route (exact match)');
      return {
        ...cachedRoute,
        isOffline: true,
        routingMethod: 'cached',
      };
    }

    // Try fuzzy cache lookup (nearby coordinates)
    const nearbyRoute = await offlineStorage.findNearbyRoute(startLat, startLng, endLat, endLng);
    if (nearbyRoute) {
      console.log('[OfflineRouter] Using cached route (nearby match)');
      return {
        ...nearbyRoute,
        isOffline: true,
        routingMethod: 'cached',
      };
    }

    // Fall back to simplified routing
    console.log('[OfflineRouter] No cached route found, using simplified route');
    const simplified = generateSimplifiedRoute(startLat, startLng, endLat, endLng);
    return {
      ...simplified,
      isOffline: true,
      routingMethod: 'simplified',
    };
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
    case 'simplified':
      return 'Simplified route - for reference only. Actual route may differ significantly.';
    default:
      return null;
  }
}
