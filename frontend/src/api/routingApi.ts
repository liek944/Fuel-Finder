import { apiGet } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

export const routingApi = {
  route: async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<RouteData> => {
    const res = await apiGet(apiEndpoints.routing.route(startLat, startLng, endLat, endLng));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as RouteData;
  },
};
