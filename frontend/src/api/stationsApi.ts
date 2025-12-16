import { apiGet } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import type { Station } from '../types/station.types';
import { offlineStorage } from '../utils/offlineStorage';

/**
 * Stations API with offline support
 * Attempts network requests first, falls back to cached data when offline
 */
export const stationsApi = {
  /**
   * Get nearby stations with offline fallback
   */
  nearby: async (
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<Station[]> => {
    try {
      // Try network first
      const res = await apiGet(apiEndpoints.stations.nearby(lat, lng, radiusMeters));
      const json = await res.json().catch(() => ([]));
      
      if (!res.ok) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }
      
      const stations = json as Station[];
      
      // Cache successful response for offline use
      await offlineStorage.cacheStations(stations).catch(err => {
        console.warn('[stationsApi] Failed to cache stations:', err);
      });
      
      return stations;
    } catch (error) {
      // If offline or network error, try cache
      if (!navigator.onLine || (error instanceof TypeError)) {
        console.log('[stationsApi] Falling back to offline cache');
        const cachedStations = await offlineStorage.getOfflineStations({
          lat,
          lng,
          radiusMeters,
        });
        
        if (cachedStations.length > 0) {
          console.log(`[stationsApi] Found ${cachedStations.length} cached stations`);
          return cachedStations;
        }
      }
      throw error;
    }
  },
};
