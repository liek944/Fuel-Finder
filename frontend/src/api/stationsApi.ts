import { apiGet } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import type { Station } from '../types/station.types';
import { offlineStorage } from '../utils/offlineStorage';
import { shouldActOffline } from '../utils/offlineModeState';

/**
 * Stations API with offline support
 * Attempts network requests first, falls back to cached data when offline
 * Respects forced offline mode setting
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
    // Check if we should act offline (forced or actual offline)
    if (shouldActOffline()) {
      console.log('[stationsApi] Offline mode active, using cached data');
      const cachedStations = await offlineStorage.getOfflineStations({
        lat,
        lng,
        radiusMeters,
      });
      
      if (cachedStations.length > 0) {
        console.log(`[stationsApi] Found ${cachedStations.length} cached stations`);
        return cachedStations;
      }
      // If no cached data, we'll still try network as last resort (maybe user toggled offline by mistake)
      console.log('[stationsApi] No cached stations, falling through to network attempt');
    }

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

