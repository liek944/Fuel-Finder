import { apiGet } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import { offlineStorage } from '../utils/offlineStorage';
import type { POI } from '../types/station.types';
import { shouldActOffline } from '../utils/offlineModeState';

/**
 * POI API with offline support
 * Falls back to cached POIs when offline
 * Respects forced offline mode setting
 */
export const poisApi = {
  /**
   * Get nearby POIs with offline fallback
   */
  nearby: async (
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<POI[]> => {
    // Check if we should act offline (forced or actual offline)
    if (shouldActOffline()) {
      console.log('[poisApi] Offline mode active, using cached data');
      const cachedPOIs = await offlineStorage.getOfflinePOIs({
        lat,
        lng,
        radiusMeters,
      });
      
      if (cachedPOIs.length > 0) {
        console.log(`[poisApi] Found ${cachedPOIs.length} cached POIs`);
        return cachedPOIs;
      }
      // If no cached data, fall through to network attempt
      console.log('[poisApi] No cached POIs, falling through to network attempt');
    }

    try {
      // Try network first
      const res = await apiGet(apiEndpoints.pois.nearby(lat, lng, radiusMeters));
      const json = await res.json().catch(() => ([]));
      
      if (!res.ok) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }
      
      const pois = json as POI[];
      
      // Cache successful response for offline use
      await offlineStorage.cachePOIs(pois).catch(err => {
        console.warn('[poisApi] Failed to cache POIs:', err);
      });
      
      return pois;
    } catch (error) {
      // If offline or network error, try cached POIs
      if (!navigator.onLine || (error instanceof TypeError)) {
        console.log('[poisApi] Attempting offline fallback for POIs');
        
        const cachedPOIs = await offlineStorage.getOfflinePOIs({
          lat,
          lng,
          radiusMeters,
        });
        
        if (cachedPOIs.length > 0) {
          console.log(`[poisApi] Returning ${cachedPOIs.length} cached POIs`);
          return cachedPOIs;
        }
      }
      
      throw error;
    }
  },

  /**
   * Get nearby POIs by type with offline fallback
   */
  nearbyByType: async (
    lat: number,
    lng: number,
    radiusMeters: number,
    type: string, // 'gas' | 'convenience' | 'repair' | 'car_wash' | 'motor_shop'
  ): Promise<POI[]> => {
    try {
      // Try to get all nearby POIs first
      const allPOIs = await poisApi.nearby(lat, lng, radiusMeters);
      // Filter by type
      return allPOIs.filter(poi => poi.type === type);
    } catch (error) {
      // If offline, filter cached POIs by type
      if (!navigator.onLine || (error instanceof TypeError)) {
        console.log(`[poisApi] Attempting offline fallback for POIs of type: ${type}`);
        
        const cachedPOIs = await offlineStorage.getOfflinePOIs({
          lat,
          lng,
          radiusMeters,
          type,
        });
        
        if (cachedPOIs.length > 0) {
          console.log(`[poisApi] Returning ${cachedPOIs.length} cached POIs of type: ${type}`);
          return cachedPOIs;
        }
      }
      
      throw error;
    }
  },

  /**
   * Get POI by ID
   */
  byId: async (id: number): Promise<POI> => {
    const res = await apiGet(apiEndpoints.pois.byId(id));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as POI;
  },
};
