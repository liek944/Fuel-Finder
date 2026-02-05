import { getApiUrl, getCommonHeaders } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import { offlineStorage } from '../utils/offlineStorage';
import { offlineRouter, isOfflineRoute, getOfflineRouteWarning, type OfflineRouteResult } from '../utils/offlineRouting';
import { shouldActOffline } from '../utils/offlineModeState';

// Routing requests need a longer timeout since they involve an extra network hop to OSRM
// Backend uses public OSRM (router.project-osrm.org) which may be slow under heavy load
const ROUTING_TIMEOUT_MS = 20000;

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  isSimplified?: boolean; // Flag for offline simplified routes
  cachedAt?: number; // Timestamp when cached
}

/**
 * Routing API with comprehensive offline support
 * Falls back to offlineRouter for cached routes or simplified routing
 * Respects forced offline mode setting
 */
export const routingApi = {
  /**
   * Get route with offline fallback
   * Uses tiered approach: network -> cached -> simplified
   */
  route: async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<RouteData> => {
    const cacheKey = offlineStorage.createRouteKey(startLat, startLng, endLat, endLng);

    // Check if we should act offline (forced or actual offline)
    if (shouldActOffline()) {
      console.log('[routingApi] Offline mode active, using offline router');
      
      // Use the offline router (cached + simplified fallback)
      const offlineRoute = await offlineRouter.route(startLat, startLng, endLat, endLng);
      
      console.log(`[routingApi] Offline route method: ${offlineRoute.routingMethod}`);
      
      // Convert to standard RouteData format
      return {
        coordinates: offlineRoute.coordinates,
        distance: offlineRoute.distance,
        duration: offlineRoute.duration,
        isSimplified: offlineRoute.routingMethod === 'simplified',
        cachedAt: offlineRoute.routingMethod === 'cached' ? Date.now() : undefined,
      };
    }

    try {
      // Try network first with extended timeout for routing
      const url = getApiUrl(apiEndpoints.routing.route(startLat, startLng, endLat, endLng));
      const res = await fetch(url, {
        method: 'GET',
        headers: getCommonHeaders(),
        signal: AbortSignal.timeout(ROUTING_TIMEOUT_MS),
      });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }
      
      const routeData = json as RouteData;
      
      // Cache successful route for offline use
      await offlineStorage.cacheRoute(cacheKey, routeData).catch(err => {
        console.warn('[routingApi] Failed to cache route:', err);
      });
      
      return routeData;
    } catch (error) {
      // If offline or network error, use offline router
      if (!navigator.onLine || (error instanceof TypeError)) {
        console.log('[routingApi] Network unavailable, using offline router');
        
        // Use the offline router (cached + simplified fallback)
        const offlineRoute = await offlineRouter.route(startLat, startLng, endLat, endLng);
        
        console.log(`[routingApi] Offline route method: ${offlineRoute.routingMethod}`);
        
        // Convert to standard RouteData format
        return {
          coordinates: offlineRoute.coordinates,
          distance: offlineRoute.distance,
          duration: offlineRoute.duration,
          isSimplified: offlineRoute.routingMethod === 'simplified',
          cachedAt: offlineRoute.routingMethod === 'cached' ? Date.now() : undefined,
        };
      }
      
      throw error;
    }
  },
};

// Re-export utilities for checking offline routes
export { isOfflineRoute, getOfflineRouteWarning, type OfflineRouteResult };

