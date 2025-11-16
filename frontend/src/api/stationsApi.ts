import { apiGet, apiPost } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import type { Station } from '../types/station.types';
import type { PriceReportListResponse } from '../types/price.types';

export const stationsApi = {
  nearby: async (
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<Station[]> => {
    const res = await apiGet(apiEndpoints.stations.nearby(lat, lng, radiusMeters));
    const json = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as Station[];
  },

  getPriceReports: async (
    stationId: number,
    limit?: number,
  ): Promise<PriceReportListResponse> => {
    const res = await apiGet(apiEndpoints.stations.priceReports(stationId, limit));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as PriceReportListResponse;
  },

  reportPrice: async (
    stationId: number,
    data: { fuel_type: string; price: number; notes?: string | null },
  ): Promise<any> => {
    const res = await apiPost(apiEndpoints.stations.reportPrice(stationId), data);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },
};
