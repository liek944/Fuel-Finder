import { apiGet } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import { offlineStorage } from '../utils/offlineStorage';
import { generateSimplifiedRoute } from '../utils/simplifiedRouting';

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  isSimplified?: boolean; // Flag for offline simplified routes
  cachedAt?: number; // Timestamp when cached
}

/**
 * Routing API with offline support
 * Falls back to cached routes or simplified routing when offline
 */
export const routingApi = {
  /**
   * Get route with offline fallback
   */
  route: async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<RouteData> => {
    const cacheKey = offlineStorage.createRouteKey(startLat, startLng, endLat, endLng);

    try {
      // Try network first
      const res = await apiGet(apiEndpoints.routing.route(startLat, startLng, endLat, endLng));
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
      // If offline or network error
      if (!navigator.onLine || (error instanceof TypeError)) {
        console.log('[routingApi] Attempting offline fallback');
        
        // Try to get cached route
        const cachedRoute = await offlineStorage.getOfflineRoute(
          startLat, 
          startLng, 
          endLat, 
          endLng
        );
        
        if (cachedRoute) {
          console.log('[routingApi] Using cached route');
          return { ...cachedRoute, cachedAt: Date.now() };
        }
        
        // Last resort: generate simplified route
        console.log('[routingApi] Generating simplified offline route');
        return generateSimplifiedRoute(startLat, startLng, endLat, endLng);
      }
      
      throw error;
    }
  },
};
