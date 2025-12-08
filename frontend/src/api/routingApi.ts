import { apiGet } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import { offlineStorage } from '../utils/offlineStorage';
import { offlineRouter, isOfflineRoute, getOfflineRouteWarning, type OfflineRouteResult } from '../utils/offlineRouting';

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  isSimplified?: boolean; // Flag for offline simplified routes
  cachedAt?: number; // Timestamp when cached
}

/**
 * Routing API with comprehensive offline support
 * Falls back to offlineRouter for cached routes, graph-based routing, or simplified routing
 */
export const routingApi = {
  /**
   * Get route with offline fallback
   * Uses tiered approach: network -> cached -> graph -> simplified
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
      // If offline or network error, use offline router
      if (!navigator.onLine || (error instanceof TypeError)) {
        console.log('[routingApi] Network unavailable, using offline router');
        
        // Use the comprehensive offline router
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

  /**
   * Check if offline routing data is available
   */
  isOfflineRoutingAvailable: (): boolean => {
    return offlineRouter.isGraphAvailable();
  },

  /**
   * Get offline routing metadata
   */
  getOfflineRoutingInfo: () => {
    return offlineRouter.getGraphMetadata();
  },

  /**
   * Download offline routing data for Oriental Mindoro
   */
  downloadOfflineRouting: async (
    onProgress?: (progress: { current: number; total: number }) => void
  ): Promise<boolean> => {
    return offlineRouter.downloadRoutingData(onProgress);
  },

  /**
   * Clear offline routing data
   */
  clearOfflineRouting: async (): Promise<void> => {
    await offlineRouter.clearRoutingData();
  },
};

// Re-export utilities for checking offline routes
export { isOfflineRoute, getOfflineRouteWarning, type OfflineRouteResult };
