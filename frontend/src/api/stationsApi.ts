import { apiGet, apiPost } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import type { Station } from '../types/station.types';
import type { PriceReportListResponse } from '../types/price.types';
import { offlineStorage, SyncOperation } from '../utils/offlineStorage';

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

  /**
   * Get price reports for a station
   */
  getPriceReports: async (
    stationId: number,
    limit?: number,
  ): Promise<PriceReportListResponse> => {
    const res = await apiGet(apiEndpoints.stations.priceReports(stationId, limit));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as PriceReportListResponse;
  },

  /**
   * Report a fuel price with offline queueing
   */
  reportPrice: async (
    stationId: number,
    data: { fuel_type: string; price: number; notes?: string | null },
  ): Promise<any> => {
    try {
      const res = await apiPost(apiEndpoints.stations.reportPrice(stationId), data);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      return json;
    } catch (error) {
      // If offline, queue for later sync
      if (!navigator.onLine || (error instanceof TypeError)) {
        console.log('[stationsApi] Queuing price report for offline sync');
        
        const syncOp: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'> = {
          type: 'priceReport',
          data: { stationId, ...data },
        };
        
        const id = await offlineStorage.addToSyncQueue(syncOp);
        
        return { 
          queued: true, 
          syncId: id,
          message: 'Price report saved. Will sync when online.' 
        };
      }
      throw error;
    }
  },
};
