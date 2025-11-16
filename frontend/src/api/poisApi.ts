import { apiGet } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import type { POI } from '../types/station.types';

export const poisApi = {
  nearby: async (
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<POI[]> => {
    const res = await apiGet(apiEndpoints.pois.nearby(lat, lng, radiusMeters));
    const json = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as POI[];
  },

  byId: async (id: number): Promise<POI> => {
    const res = await apiGet(apiEndpoints.pois.byId(id));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as POI;
  },
};
